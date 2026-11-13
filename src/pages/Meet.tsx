import { CampusHeader } from '../components/CampusHeader';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Dices,
  Flame,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Match } from '../lib/database.types';
import {
  QUESTS,
  SPARK_MAX,
  SPARK_REGEN_MINUTES,
  STAGE_THRESHOLDS,
  fmtCountdown,
  leagueFromXp,
  msToNextSpark,
  qotdForDate,
  regenSparks,
  sparkStageFromCount,
  startOfTodayISO,
  todayISO,
} from '../lib/gamification';
import { SparkMeter } from '../components/SparkMeter';
import { GlassDice } from '../components/GlassDice';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { COLLEGE_DOMAIN } from '../lib/constants';

const SAFETY = [
  'Sign-in is a one-tap link to your college inbox. No password exists to leak.',
  `Every profile is tied to a verified @${COLLEGE_DOMAIN} address.`,
  'Report or block removes someone from your campus in a single tap.',
  'No public profiles, no follower counts, and nothing for a stranger to browse.',
];

type OtherProfile = {
  id: string;
  full_name: string;
  department: string;
  year: number | null;
  interests: string[];
  profile_photo_path: string | null;
};

type Pairing = {
  match: Match;
  count: number;
  other: OtherProfile | null;
};

/** The five reveals, each keyed to the message count that unlocks it. */
function revealsFor(pairing: Pairing) {
  const other = pairing.other;
  const { stage } = sparkStageFromCount(pairing.count);
  const first = other?.full_name?.trim().split(/\s+/)[0] ?? 'Mystery classmate';

  return [
    { label: 'Interests', value: other?.interests?.slice(0, 4).join(' · ') ?? '—' },
    { label: 'Profile photo', value: other?.profile_photo_path ? 'Revealed' : 'No photo added' },
    { label: 'Name', value: first },
    {
      label: 'Course and year',
      value: [other?.department, other?.year ? `Year ${other.year}` : null]
        .filter(Boolean)
        .join(' · '),
    },
    { label: 'Match or pass', value: 'Both answer privately at 38' },
  ].map((r, i) => ({ ...r, at: STAGE_THRESHOLDS[i], open: stage > i }));
}

export default function Meet() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);

  const [qotdAnswer, setQotdAnswer] = useState<string | null>(null);
  const [qotdDraft, setQotdDraft] = useState('');
  const [savingQotd, setSavingQotd] = useState(false);

  const [sentToday, setSentToday] = useState(0);
  const [drawsToday, setDrawsToday] = useState(0);

  const [now, setNow] = useState(() => Date.now());

  // Sparks tick down in the UI without a refetch.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: sparkData } = await supabase.rpc('refresh_sparks');
    void sparkData;

    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(1);

    const match = (matchData as Match[] | null)?.[0] ?? null;
    let next: Pairing | null = null;

    if (match) {
      const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id;
      const [{ count }, { data: other }] = await Promise.all([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('match_id', match.id),
        supabase
          .from('profiles')
          .select('id, full_name, department, year, interests, profile_photo_path')
          .eq('id', otherId)
          .maybeSingle(),
      ]);
      next = {
        match,
        count: count ?? 0,
        other: (other as OtherProfile | null) ?? null,
      };
    }
    setPairing(next);

    const [{ data: qa }, { count: sent }, { count: draws }] = await Promise.all([
      supabase
        .from('qotd_answers')
        .select('answer')
        .eq('user_id', user.id)
        .eq('day', todayISO())
        .maybeSingle(),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', user.id)
        .gte('created_at', startOfTodayISO()),
      supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .gte('created_at', startOfTodayISO()),
    ]);

    setQotdAnswer((qa as { answer: string } | null)?.answer ?? null);
    setSentToday(sent ?? 0);
    setDrawsToday(draws ?? 0);
    setLoading(false);

    // refresh_sparks may have regenerated energy server-side.
    await refreshProfile();
  }, [user, refreshProfile]);

  useEffect(() => {
    load();
  }, [load]);

  const sparks = profile ? regenSparks(profile.energy, profile.energy_ts, now) : 0;
  const nextSparkMs = profile ? msToNextSpark(profile.energy, profile.energy_ts, now) : null;
  const league = leagueFromXp(profile?.xp ?? 0);
  const stage = pairing ? sparkStageFromCount(pairing.count).stage : 0;
  const reveals = pairing ? revealsFor(pairing) : [];
  const qotd = qotdForDate();

  async function draw() {
    if (!user || drawing) return;
    if (sparks <= 0) {
      toast(
        nextSparkMs ? `No sparks left. The next one lands in ${fmtCountdown(nextSparkMs)}.` : 'No sparks left.',
        'error'
      );
      return;
    }

    setDrawing(true);
    const { data, error } = await supabase.rpc('pair_me_randomly', { allow_any: true });
    setDrawing(false);

    if (error) {
      toast(error.message, 'error');
      return;
    }
    if (!data) {
      toast('Nobody is free right now. Try again in a minute.', 'error');
      return;
    }

    confetti({ particleCount: 70, spread: 80, origin: { y: 0.7 } });
    toast('You are paired. Say something first.', 'success');
    await refreshProfile();
    navigate(`/chat/${data}`);
  }

  async function answerQotd(e: React.FormEvent) {
    e.preventDefault();
    const answer = qotdDraft.trim();
    if (!user || !answer || savingQotd) return;

    setSavingQotd(true);
    const { error } = await supabase
      .from('qotd_answers')
      .insert({ user_id: user.id, day: todayISO(), answer });
    setSavingQotd(false);

    if (error) {
      toast(error.message, 'error');
      return;
    }
    setQotdAnswer(answer);
    setQotdDraft('');
    toast('+15 XP · answer saved', 'success');
    await refreshProfile();
  }

  const questDone: Record<string, number> = {
    qotd: qotdAnswer ? 1 : 0,
    chatter: sentToday,
    golive: drawsToday,
  };

  return (
    <div className="campus-page campus-meet pb-4">
      <CampusHeader label="One spark. One classmate." title="Meet someone" accent="unexpected." mark="✳">
        <p className="lead mt-3 max-w-[46ch]">
          One spark puts you in a chat with a classmate you have never spoken to. Neither of you sees
          who the other is until the conversation earns it.
        </p>
            </CampusHeader>

      {/* ---------------- sparks and standing ---------------- */}
      <section className="mt-8 flex flex-wrap items-end justify-between gap-6 border-y border-white/[0.08] py-5">
        <div>
          <span className="label flex items-center gap-1.5">
            <Zap size={12} className="text-teal-brand" /> sparks
          </span>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="stat text-ink">{sparks}</span>
            <span className="text-[13px] text-ink-soft">/ {SPARK_MAX}</span>
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">
            {nextSparkMs !== null
              ? `Next spark in ${fmtCountdown(nextSparkMs)} · one every ${SPARK_REGEN_MINUTES} min`
              : 'Full. Spending one pairs you immediately.'}
          </p>
        </div>

        <div className="text-right">
          <span className="label flex items-center justify-end gap-1.5">
            <Trophy size={12} /> {league.name}
          </span>
          <p className="stat mt-2 text-ink">{profile?.xp ?? 0}</p>
          <p className="label mt-1">{profile?.streak_count ?? 0} day streak</p>
        </div>
      </section>

      {/* ---------------- the pairing ---------------- */}
      <>
        {loading ? (
          <div className="card mt-8 h-56 animate-pulse" aria-hidden="true" />
        ) : pairing ? (
          <motion.section
            key={pairing.match.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
            className="card mt-8 overflow-hidden"
          >
            <div className="border-b border-white/[0.08] p-6">
              <ProfilePhoto path={stage >= 2 ? pairing.other?.profile_photo_path : null}
                className="float-right ml-3 size-16" />
              <span className="label flex items-center gap-1.5 text-rose-soft">
                <Flame size={12} className="text-rose-brand" /> open pairing
              </span>
              <h2 className="display-2 mt-2">
                {stage >= 3 ? reveals[2].value : 'Mystery classmate'}
              </h2>
              <p className="mt-2 max-w-[46ch] text-[14px] leading-[1.6] text-ink-soft">
                {stage >= 3
                  ? 'The name is out. Keep talking and the rest opens.'
                  : 'Nobody picks anybody. Talk, and the meter gives you fragments back.'}
              </p>
            </div>

            <div className="p-6">
              <SparkMeter count={pairing.count} />

              <ul className="mt-6 border-t border-white/[0.08]">
                {reveals.map((r) => (
                  <li key={r.label} className="border-b border-white/[0.08] py-3">
                    <span className="label flex items-center gap-2">
                      {r.open ? (
                        <Check size={12} className="shrink-0 text-teal-deep" />
                      ) : (
                        <span className="w-3 shrink-0 text-center text-[10px]">·</span>
                      )}
                      {r.label}
                    </span>
                    <p
                      className={`mt-1.5 text-[14px] leading-[1.5] ${
                        r.open ? 'text-ink' : 'text-ink-faint'
                      }`}
                    >
                      {r.open ? r.value || 'revealed' : `Opens at ${r.at} messages`}
                    </p>
                  </li>
                ))}
              </ul>

              <Link to={`/chat/${pairing.match.id}`} className="glass-chat mt-6">
                <GlassDice />
                <span className="glass-chat-copy">
                  <span className="glass-chat-title">Open the chat</span>
                  <span className="glass-chat-detail">
                    {stage >= 5
                      ? 'Match or Pass is open'
                      : `${STAGE_THRESHOLDS[4] - pairing.count} more messages to decide`}
                  </span>
                </span>
                <span className="glass-chat-arrow"><ArrowRight size={20} /></span>
              </Link>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
            className="card pairing-draw mt-8 p-6 sm:p-8"
          >
            <span className="label flex items-center gap-1.5">
              <Dices size={12} /> nothing open
            </span>
            <div className="draw-dice" aria-hidden="true"><GlassDice /></div><h2 className="display-2 mt-2">A hello you didn’t plan.</h2>
            <p className="lead mt-3 max-w-[46ch]">
              Your spark picks someone at random from everyone verified on campus. No grid, no
              photos, no ranking — and they never find out you were the one who drew them.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className="btn-primary"
                onClick={draw}
                disabled={drawing || sparks <= 0}
                aria-busy={drawing}
              >
                {drawing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Pairing…
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Spend a spark
                  </>
                )}
              </button>
              <span className="label">
                {sparks > 0
                  ? `${sparks} left · next in ${nextSparkMs !== null ? fmtCountdown(nextSparkMs) : '—'}`
                  : 'No sparks left right now'}
              </span>
            </div>
          </motion.section>
        )}
      </>

      {/* ---------------- question of the day ---------------- */}
      <section className="mt-12 rise">
        <h2 className="display-3 text-ink">Question of the day</h2>
        <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.6] text-ink-soft">
          Everyone at SNUC answers the same one. It is the cheapest way to keep a streak alive.
        </p>

        <div className="mt-5 border-y border-white/[0.08] py-5">
          <p className="text-[16px] leading-[1.55] text-ink">{qotd}</p>

          {qotdAnswer ? (
            <p className="mt-3 flex items-start gap-2 text-[14px] text-ink-soft">
              <Check size={14} className="mt-0.5 shrink-0 text-teal-deep" />
              You answered: <span className="text-ink">{qotdAnswer}</span>
            </p>
          ) : (
            <form onSubmit={answerQotd} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                className="input sm:flex-1"
                placeholder="Your answer, in a line"
                value={qotdDraft}
                onChange={(e) => setQotdDraft(e.target.value)}
                maxLength={140}
                aria-label="Question of the day answer"
              />
              <button className="btn-ghost" disabled={savingQotd || !qotdDraft.trim()}>
                {savingQotd ? <Loader2 size={15} className="animate-spin" /> : 'Answer'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ---------------- quests ---------------- */}
      <section className="mt-12 rise">
        <h2 className="display-3 text-ink">Today&rsquo;s quests</h2>
        <ul className="mt-4 border-t border-white/[0.08]">
          {QUESTS.map((q) => {
            const done = Math.min(questDone[q.id] ?? 0, q.goal);
            const complete = done >= q.goal;
            return (
              <li
                key={q.id}
                className="flex flex-wrap items-start gap-x-4 gap-y-1 border-b border-white/[0.08] py-4"
              >
                <span aria-hidden="true" className="text-[15px] leading-6">
                  {q.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">{q.title}</p>
                  <p className="text-[13px] text-ink-soft">{q.hint}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="label !text-teal-deep">{q.reward}</span>
                  {complete ? (
                    <Check size={14} className="text-teal-deep" />
                  ) : (
                    <span className="label w-10 text-right !tracking-normal">
                      {done}/{q.goal}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------- safety ---------------- */}
      <section className="mt-12 rise">
        <h2 className="display-3 text-ink">Why this stays safe</h2>
        <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {SAFETY.map((line) => (
            <li
              key={line}
              className="flex items-start gap-2.5 border-t border-white/[0.08] pt-3 text-[13px] leading-[1.6] text-ink-soft"
            >
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-teal-soft" />
              {line}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
