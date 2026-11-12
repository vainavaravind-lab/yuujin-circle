import { useState, type FormEvent } from 'react';
import { ArrowRight, Mail, ShieldCheck, Zap } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { COLLEGE_DOMAIN } from '../lib/constants';
import { useToast } from '../contexts/ToastContext';
import { LogoMark } from '../components/Logo';

/**
 * Signed-out landing page.
 *
 * Editorial direction: the page reads like a campus notice, not a product pitch.
 * A serif voice for the claims, a tight grotesque for the interface, one hairline
 * system, flat grounds, and one authored scroll moment — the pinned scene where a
 * blurred classmate resolves into a name as the meter fills.
 */

const MAIN_ACTION = 'Email me a sign-in link';

const STEPS = [
  {
    n: '01',
    title: 'Spend a spark',
    body: 'Five a day, one back every twenty minutes. A spark puts you in a chat with one random classmate. Nobody picks anybody.',
  },
  {
    n: '02',
    title: 'Talk, and it opens',
    body: 'Each message moves the meter: interests at three, an avatar at eight, a name at sixteen, a course at twenty-six.',
  },
  {
    n: '03',
    title: 'Match, or let it close',
    body: 'At thirty-eight messages you both answer privately. Two yeses become a friendship; anything else disappears quietly.',
  },
];

const SAFETY = [
  'Sign-in is a one-tap link to your college inbox. No password exists to leak.',
  'Every profile is tied to a verified @' + COLLEGE_DOMAIN + ' address.',
  'Report or block removes someone from your campus in a single tap.',
  'No public profiles, no follower counts, and nothing for a stranger to browse.',
];

function Wrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`wrap ${className}`}
    >
      {children}
    </div>
  );
}

/** The product's own screen, drawn from the same tokens the app uses. */
function ChatMock() {
  return (
    <div className="border border-white/10 bg-cream-100" data-ui>
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 text-ink-faint">
          <span className="font-mono text-[11px]">?​</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">Mystery classmate</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            stage 3 of 5 · name locked
          </p>
        </div>
        <span className="label !text-teal-deep">SNU</span>
      </div>

      <div className="space-y-2 px-5 py-5">
        <p className="w-fit max-w-[86%] border border-white/10 bg-cream px-3.5 py-2 text-[13px] leading-[1.5] text-ink" style={{ borderRadius: 12, borderBottomLeftRadius: 3 }}>
          Triangles, circles or squares?
        </p>
        <p className="ml-auto w-fit max-w-[86%] bg-teal-brand px-3.5 py-2 text-[13px] leading-[1.5] text-cream" style={{ borderRadius: 12, borderBottomRightRadius: 3 }}>
          Squares. Triangles are for people with opinions.
        </p>
        <p className="w-fit max-w-[86%] border border-white/10 bg-cream px-3.5 py-2 text-[13px] leading-[1.5] text-ink" style={{ borderRadius: 12, borderBottomLeftRadius: 3 }}>
          Wrong answer, but I respect it.
        </p>
      </div>

      <div className="border-t border-white/[0.08] px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="label">spark meter</span>
          <span className="label">12 / 38</span>
        </div>
        <div className="relative mt-2.5 h-[3px] w-full bg-white/[0.12]">
          <span className="absolute inset-y-0 left-0 bg-teal-brand" style={{ width: '31%' }} />
          {[8, 21, 42, 68].map((p) => (
            <span key={p} className="absolute top-1/2 h-[7px] w-px -translate-y-1/2 bg-white/25" style={{ left: `${p}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean.endsWith('@' + COLLEGE_DOMAIN)) {
      toast(`Only @${COLLEGE_DOMAIN} emails can join`, 'error');
      return;
    }
    setSending(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (error) throw error;
      setSentTo(clean);
      setSent(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send the link', 'error');
    } finally {
      setSending(false);
    }
  }

  if (!isSupabaseConfigured) {
    return null; // App gates this behind SetupRequired anyway.
  }

  return (
    <>
      {/* ---------------- nav ---------------- */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-cream/92 backdrop-blur-sm">
        <Wrap className="flex h-[var(--nav)] items-center justify-between">
          <div className="flex items-baseline gap-3">
            <LogoMark size={22} />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Yuujin Circle</span>
            <span className="label hidden sm:inline">SNUC only</span>
          </div>
          <a href="#signin" className="btn-ghost !h-9 !min-h-9 !px-3.5 !text-[12px]">
            Sign in <ArrowRight size={13} />
          </a>
        </Wrap>
        <div className="h-px w-full bg-white/[0.06]">
          <div className="scroll-progress h-px bg-teal-brand" />
        </div>
      </header>

      <main className="bg-cream">
        {/* ---------------- hero ---------------- */}
        <section className="pt-[calc(var(--nav)+5rem)] pb-20 sm:pb-28">
          <Wrap>
            <h1 className="display-1 max-w-[19ch] rise text-[clamp(2.75rem,6.4vw,6rem)]">
              Campus dating, without the browsing
            </h1>

            <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-6 rise">
                <p className="lead max-w-[44ch]">
                  One spark puts you in a chat with a classmate you have never spoken to. Neither of
                  you sees who the other is until the conversation earns it.
                </p>

                <div id="signin" className="mt-9 max-w-md scroll-mt-28">
                  {sent ? (
                    <div className="border border-teal-brand/30 bg-teal-mist px-5 py-4" style={{ borderRadius: 12 }}>
                      <p className="flex items-center gap-2 text-[14px] font-semibold text-teal-deep">
                        <Mail size={15} /> Link sent to {sentTo}
                      </p>
                      <p className="mt-1.5 text-[13px] leading-[1.6] text-ink-soft">
                        It works once and expires in an hour. Open it on this device.
                      </p>
                      <button
                        type="button"
                        className="link mt-3 text-[13px]"
                        onClick={() => {
                          setSent(false);
                          setEmail('');
                        }}
                      >
                        Use a different email
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit}>
                      <label htmlFor="email" className="label">
                        college email
                      </label>
                      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
                        <input
                          id="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder={`you@${COLLEGE_DOMAIN}`}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="input sm:flex-1"
                        />
                        <button type="submit" disabled={sending} className="btn-primary shrink-0">
                          {sending ? 'Sending…' : MAIN_ACTION}
                        </button>
                      </div>
                      <p className="mt-3 text-[13px] leading-[1.5] text-ink-soft">
                        No password. Only @{COLLEGE_DOMAIN} addresses pass the check.
                      </p>
                    </form>
                  )}
                </div>

                <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/[0.08] pt-5">
                  {[
                    ['5', 'sparks a day'],
                    ['38', 'messages to a name'],
                    ['∞', 'nothing public'],
                  ].map(([v, k]) => (
                    <div key={k}>
                      <dt className="stat text-ink">{v}</dt>
                      <dd className="label mt-1.5">{k}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="hidden lg:col-span-5 lg:col-start-8 lg:block rise">
                <ChatMock />
                <p className="label mt-3">an actual pairing, mid-meter</p>
              </div>
            </div>
          </Wrap>
        </section>

        {/* ---------------- the pinned scene: anonymity resolving ---------------- */}
        <section className="scene border-y border-white/[0.08] bg-cream-100">
          <Wrap className="grid gap-10 py-20 sm:py-24 lg:min-h-[150vh] lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="lg:col-span-5">
              <h2 className="display-2 max-w-[16ch]">You talk before you see</h2>
              <p className="lead mt-5 max-w-[40ch]">
                The meter is the whole idea. A face, a name and a course are things you get to, not
                things you open with.
              </p>
              <p className="mt-8 max-w-[42ch] text-[15px] leading-[1.65] text-ink-soft">
                There is no grid to swipe through, no photo to rank, and no one watching who you
                skipped. A pairing is two people and a countdown neither of them can see from the
                other side.
              </p>
              <ol className="mt-10 space-y-4 border-t border-white/[0.08] pt-6">
                {[
                  ['3', 'interests'],
                  ['8', 'avatar'],
                  ['16', 'name'],
                  ['26', 'course'],
                  ['38', 'match or pass'],
                ].map(([n, what]) => (
                  <li key={n} className="flex items-baseline gap-4">
                    <span className="w-8 shrink-0 font-mono text-[12px] tabular-nums text-teal-deep">
                      {n}
                    </span>
                    <span className="text-[15px] text-ink-soft">{what}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-24 hidden space-y-10 border-t border-white/[0.08] pt-8 lg:block">
                {[
                  ['No grid, no ranking', 'Nobody is shown a queue of faces, and nobody knows who was passed over. A draw is one spark, one person, one chat.'],
                  ['The reveal is earned', 'Interests, then an avatar, then a name, then a course. Every layer costs something to reach, which is the point.'],
                  ['It ends in daylight', 'At the last message you both answer privately. Two yeses keep the chat; anything else closes without a notification.'],
                ].map(([title, body]) => (
                  <div key={title} className="rise">
                    <p className="display-3 text-ink">{title}</p>
                    <p className="mt-2 max-w-[40ch] text-[15px] leading-[1.65] text-ink-soft">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* pinned: the name plate unblurs while the scene is held */}
            <div className="lg:sticky lg:top-[calc(var(--nav)+3.5rem)] lg:col-span-6 lg:col-start-7 lg:self-start">
              <div>
                <div className="border border-white/10 bg-cream p-7 sm:p-9">
                  <div className="relative h-[86px]">
                    <p className="scene-fade-out display-2 absolute inset-x-0 top-0 text-ink-soft">
                      Mystery classmate
                    </p>
                    <p className="scene-unblur display-2 absolute inset-x-0 top-0 text-ink">
                      Meera, 3rd year ECE
                    </p>
                  </div>

                  <p className="mt-2 text-[14px] text-ink-soft">
                    Second in the class. Argues about filter coffee.
                  </p>

                  <div className="mt-8">
                    <div className="flex items-baseline justify-between">
                      <span className="label">spark meter</span>
                      <span className="label">38 / 38</span>
                    </div>
                    <div className="relative mt-2.5 h-[3px] bg-white/[0.12]">
                      <span className="scene-progress absolute inset-y-0 left-0 block w-full origin-left bg-teal-brand" />
                    </div>
                    <ul className="mt-4 grid grid-cols-5 gap-1.5">
                      {['interests', 'avatar', 'name', 'course', 'decide'].map((t) => (
                        <li key={t} className="label !tracking-[0.08em]">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="label mt-3">stage five · both of you answer privately</p>
              </div>
            </div>
          </Wrap>
        </section>

        {/* ---------------- how it works ---------------- */}
        <section className="py-20 sm:py-28">
          <Wrap>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-5">
                <h2 className="display-2 max-w-[16ch] rise">How a pairing runs</h2>
                <p className="lead mt-5 max-w-[38ch] rise">
                  Three moves, in order, the same for everyone on campus.
                </p>
                <a href="#signin" className="btn-ghost mt-8 rise">
                  {MAIN_ACTION} <ArrowRight size={14} />
                </a>
              </div>

              <ol className="lg:col-span-6 lg:col-start-7">
                {STEPS.map(({ n, title, body }, i) => (
                  <li
                    key={n}
                    className={`grid grid-cols-[3rem_1fr] gap-x-4 border-t border-white/[0.08] py-6 ${
                      i === STEPS.length - 1 ? 'border-b' : ''
                    } rise`}
                  >
                    <span className="label pt-1.5 !text-teal-deep">{n}</span>
                    <div>
                      <p className="display-3 text-ink">{title}</p>
                      <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.65] text-ink-soft">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Wrap>
        </section>

        {/* ---------------- trust ---------------- */}
        <section className="border-t border-white/[0.08] py-20 sm:py-28">
          <Wrap className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-5">
              <h2 className="display-2 max-w-[15ch] rise">Only your campus gets in</h2>
              <p className="lead mt-5 max-w-[40ch] rise">
                A college address is the whole verification. It is checked before an account exists,
                not after.
              </p>
              <ul className="mt-8 space-y-4">
                {SAFETY.map((line) => (
                  <li key={line} className="flex gap-3 text-[15px] leading-[1.65] text-ink-soft rise">
                    <ShieldCheck size={15} className="mt-1 shrink-0 text-teal-deep" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-6 lg:col-start-7 rise">
              <div className="border border-white/10">
                <p className="border-b border-white/[0.08] px-5 py-3 label">email check</p>
                {[
                  { email: `you@${COLLEGE_DOMAIN}`, ok: true },
                  { email: 'someone@gmail.com', ok: false },
                  { email: 'someone@yahoo.com', ok: false },
                ].map((row) => (
                  <div
                    key={row.email}
                    className={`flex items-center gap-3 border-b border-white/[0.08] px-5 py-4 last:border-b-0 ${
                      row.ok ? '' : 'opacity-55'
                    }`}
                  >
                    <Mail size={15} className="shrink-0 text-ink-soft" />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{row.email}</span><span className="label shrink-0 !text-teal-deep">
                      {row.ok ? 'allowed' : 'refused'}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] leading-[1.6] text-ink-soft">
                One link, one hour, one device. There is nothing to remember and nothing to reuse.
              </p>
            </div>
          </Wrap>
        </section>

        {/* ---------------- close ---------------- */}
        <section className="border-t border-white/[0.08] bg-cream-100 py-20 sm:py-28">
          <Wrap>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-7">
                <h2 className="display-1 max-w-[20ch] rise">Take a draw before the term ends</h2>
                <p className="lead mt-5 max-w-[42ch] rise">
                  Five sparks are already waiting. One of them is the person you have walked past all
                  semester.
                </p>
              </div>
              <div className="lg:col-span-4 lg:col-start-9 lg:self-end rise">
                <a href="#signin" className="btn-primary w-full !min-h-12">
                  {MAIN_ACTION} <ArrowRight size={15} />
                </a>
                <p className="label mt-3 flex items-center gap-1.5">
                  <Zap size={11} className="text-teal-deep" /> no account until you open the link
                </p>
              </div>
            </div>
          </Wrap>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] bg-cream">
        <Wrap className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-3">
            <LogoMark size={18} />
            <span className="text-[13px] text-ink-soft">Yuujin Circle</span>
          </div>
          <p className="label">built by SNUC students · 2026</p>
        </Wrap>
      </footer>
    </>
  );
}
