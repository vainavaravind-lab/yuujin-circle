import { useRef, useState, type FormEvent } from 'react';
import { CHAT_STEPS, ChatChapter, ScrollChat } from '../components/ScrollChat';
import { ArrowRight, Mail, ShieldCheck, Zap } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { COLLEGE_DOMAIN } from '../lib/constants';
import { useToast } from '../contexts/ToastContext';
import { LogoMark } from '../components/Logo';
import { TideLight, TideText } from '../components/Tide';

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
    body: 'Each message moves the meter: interests at three, a profile photo at eight, a name at sixteen, a course at twenty-six.',
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

export default function Landing() {
  const { toast } = useToast();
  const story = useRef<HTMLDivElement>(null);
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

      <main className="landing">
        <TideLight />
        {/* ---------------- hero ---------------- */}
        <section className="landing-hero">
          <Wrap className="landing-hero-grid">
            <div className="landing-hero-copy">
              <TideText><p className="label hero-kicker">Dating &amp; friendship at SNU Chennai</p>
              <h1 className="hero-title">Meet someone <em>between classes.</em></h1>
              <p className="lead mt-6 max-w-[38ch]">
                Spend a spark to chat with a random classmate. As you talk, you’ll find out
                who’s on the other side.
              </p></TideText>
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
            </div>
            <ScrollChat story={story} />
            <div ref={story} className="scroll-chat-story">
              {CHAT_STEPS.map((step, index) => (
                <ChatChapter key={step.title} index={index} story={story} />
              ))}
            </div>
          </Wrap>
        </section>

        {/* ---------------- how it works ---------------- */}
        <section className="py-20 sm:py-28">
          <Wrap>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-5">
                <TideText><h2 className="display-2 max-w-[16ch] rise">How a pairing runs</h2></TideText>
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
              <TideText><h2 className="display-2 max-w-[15ch] rise">Only your campus gets in</h2></TideText>
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
                <TideText><h2 className="display-1 max-w-[20ch] rise">Take a draw before the term ends</h2></TideText>
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
