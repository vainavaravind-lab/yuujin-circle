import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Dices, HeartHandshake, Trophy, UserRound } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogoMark } from './Logo';
import { PresenceProvider } from '../contexts/PresenceContext';

const TABS = [
  { to: '/meet', label: 'Meet', icon: Dices, note: 'One pairing at a time' },
  { to: '/friends', label: 'Friends', icon: HeartHandshake, note: 'People who both said yes' },
  { to: '/league', label: 'League', icon: Trophy, note: 'Your week, in sparks' },
  { to: '/profile', label: 'Profile', icon: UserRound, note: 'What your campus sees' },
];

function routeDepth(pathname: string): number {
  if (pathname.startsWith('/meet')) return 0;
  if (pathname.startsWith('/friends')) return 1;
  if (pathname.startsWith('/league')) return 2;
  if (pathname.startsWith('/profile')) return 3;
  return 0;
}

export function AppShell() {
  const location = useLocation();
  const current = TABS.find((t) => location.pathname.startsWith(t.to)) ?? TABS[0];

  const dirRef = useRef(1);
  const lastPathRef = useRef(location.pathname);
  if (lastPathRef.current !== location.pathname) {
    dirRef.current = routeDepth(location.pathname) >= routeDepth(lastPathRef.current) ? 1 : -1;
    lastPathRef.current = location.pathname;
  }
  const dir = dirRef.current;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <PresenceProvider>
      <div className="flex min-h-dvh flex-col bg-cream">
        <header
          className="sticky top-0 z-40 border-b border-white/[0.08] bg-cream/95 backdrop-blur-sm"
        >
          <div className="wrap flex h-[var(--nav)] items-center justify-between gap-4">
            <span className="flex items-center gap-2.5">
              <LogoMark size={24} />
              <span className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                Yuujin
              </span>
            </span>

            <span className="label hidden truncate sm:block">{current.note}</span>

            <NavLink
              to="/profile"
              className="label !tracking-[0.1em] text-ink-soft transition hover:text-teal-deep"
            >
              SNUC
            </NavLink>
          </div>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-white/10"
          >
            <span
              className="scroll-progress block h-px w-full origin-left bg-teal-brand"
            />
          </span>
        </header>

        <main className="wrap relative z-10 flex-1 pb-[calc(var(--bar)+2rem)] pt-6">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={location.pathname}
              custom={dir}
              initial={{ opacity: 0, y: dir >= 0 ? 8 : -8 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0.7, 0.2, 1] } }}
              exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }}
              className="w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
        >
          <div className="wrap grid grid-cols-4">
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className="relative flex flex-col items-center gap-1 py-3"
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="tab-rule"
                        className="absolute inset-x-3 top-0 h-[2px] bg-teal-brand"
                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      />
                    )}

                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.7}
                      className="liquid-gl"
                    />
                    <span />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </PresenceProvider>
  );
}
