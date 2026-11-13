import { CampusHeader } from '../components/CampusHeader';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
// avatar feature removed
import type { Profile } from '../lib/database.types';
import { displayName } from '../lib/profile';
import { LEAGUES, leagueFromXp, leagueProgress, nextLeagueFromXp } from '../lib/gamification';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function League() {
  const { profile: me } = useAuth();
  const [board, setBoard] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('onboarding_complete', true)
        .order('xp', { ascending: false })
        .limit(50);
      if (alive) {
        setBoard((data as Profile[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const myXp = me?.xp ?? 0;
  const league = leagueFromXp(myXp);
  const next = nextLeagueFromXp(myXp);
  const progress = leagueProgress(myXp);
  const myRank = board.findIndex((p) => p.id === me?.id);

  const podium = board.slice(0, 3);
  const rest = board.slice(3);

  return (
    <div className="campus-page campus-league pb-4">
      <CampusHeader label="Small moments add up" title="Find your" accent="momentum." mark="✦">
        <p className="lead mt-3 max-w-[46ch]">
          The campus top fifty. XP comes from showing up: a chat kept alive, a question answered, a
          draw taken.
        </p>
            </CampusHeader>

      {/* ---------------- my standing ---------------- */}
      <section className="league-standing mt-9 border-y border-white/[0.08] py-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="label flex items-center gap-1.5">
              <Trophy size={12} /> {league.name}
            </span>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="stat text-ink">{myXp}</span>
              <span className="text-[13px] text-ink-soft">XP</span>
            </p>
            <p className="mt-1 text-[13px] text-ink-soft">
              {next
                ? `${next.min - myXp} XP to ${next.name}`
                : 'Top league — nothing left to climb'}
            </p>
          </div>
          <div className="text-right">
            <p className="stat text-ink">{myRank >= 0 ? `#${myRank + 1}` : '—'}</p>
            <p className="label mt-1">your rank</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-[3px] w-full bg-white/10">
            <motion.div
              initial={false}
              animate={{ width: `${Math.max(2, progress * 100)}%` }}
              transition={{ duration: 0.9, ease: EASE }}
              className="h-full bg-teal-brand"
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1">
            {LEAGUES.map((l) => (
              <span
                key={l.name}
                className={`text-[12px] ${myXp >= l.min ? 'text-teal-deep' : 'text-ink-faint'}`}
              >
                {l.name}
                <span className="ml-1 text-ink-faint">{l.min}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- the three at the top ---------------- */}
      {!loading && podium.length > 0 && (
        <section className="league-podium mt-10 grid grid-cols-3 items-end gap-3 sm:gap-6">
          {[podium[1], podium[0], podium[2]].map((p, i) => {
            if (!p) return <div key={i} />;
            const place = i === 1 ? 1 : i === 0 ? 2 : 3;
            const step = place === 1 ? 'h-14' : place === 2 ? 'h-9' : 'h-6';
            return (
              <div key={p.id} className="flex flex-col items-center text-center">
                <p className="stat !text-[22px] text-ink">{p.xp}</p>
                <p className="mt-1 w-full truncate text-[13px] font-semibold text-ink">
                  {displayName(p)}
                  {p.id === me?.id && (
                    <span className="ml-1.5 text-[11px] font-normal text-teal-deep">you</span>
                  )}
                </p>
                <div
                  className={`mt-3 w-full border-t pt-2 ${step} ${
                    place === 1
                      ? 'border-teal-brand bg-white/[0.05]'
                      : 'border-white/15 bg-white/[0.03]'
                  }`}
                >
                  <span className="label !text-ink">{place}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ---------------- the rest ---------------- */}
      <section className="mt-10">
        <h2 className="display-3 text-ink">Everyone else</h2>
        <ul className="mt-4 border-t border-white/[0.08]">
          {loading &&
            [...Array(5)].map((_, i) => (
              <li key={i} className="h-14 animate-pulse border-b border-white/[0.08]" />
            ))}

          {!loading &&
            rest.map((p, i) => {
              const mine = p.id === me?.id;
              const l = leagueFromXp(p.xp);
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-4 border-b border-white/[0.08] py-3.5 ${
                    mine ? 'bg-white/[0.03]' : ''
                  }`}
                >
                  <span className="w-7 shrink-0 text-[13px] tabular-nums text-ink-faint">{i + 4}</span>
                  
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">
                      {displayName(p)}
                      {mine && <span className="ml-2 text-[12px] text-teal-deep">you</span>}
                    </span>
                    <span className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                      <Flame size={11} className="text-teal-deep" />
                      {p.streak_count}
                      <span className="text-ink-faint">·</span>
                      {l.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-ink">{p.xp} XP</span>
                </li>
              );
            })}

          {!loading && board.length === 0 && (
            <li className="border-b border-white/[0.08] py-8 text-[14px] text-ink-soft">
              Nobody is on the board yet. Answer the question of the day to start it.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
