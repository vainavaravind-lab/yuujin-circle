import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Dices, HeartHandshake, Trophy, UserRound } from 'lucide-react';

import { LogoMark } from './Logo';
import { PresenceProvider } from '../contexts/PresenceContext';

const TABS = [
  { to: '/meet', label: 'Meet', icon: Dices, note: 'One pairing at a time' },
  { to: '/friends', label: 'Friends', icon: HeartHandshake, note: 'People who both said yes' },
  { to: '/league', label: 'League', icon: Trophy, note: 'Your week, in sparks' },
  { to: '/profile', label: 'Profile', icon: UserRound, note: 'What your campus sees' },
];

export function AppShell() {
  const location = useLocation();
  const current = TABS.find((t) => location.pathname.startsWith(t.to)) ?? TABS[0];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <PresenceProvider>
      <div className="app-shell flex min-h-dvh flex-col bg-cream">
        <header
          className="sticky top-0 z-40 border-b border-white/[0.08] bg-cream/95 backdrop-blur-sm"
        >
          <a className="skip-link" href="#campus-content">Skip to content</a>
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

        <main id="campus-content" tabIndex={-1} className="wrap relative z-10 flex-1 pb-[calc(var(--bar)+2rem)] pt-6">
          <Outlet />
        </main>

        <nav aria-label="Campus navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
        >
          <div className="wrap grid grid-cols-4">
            {TABS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className="app-tab relative flex flex-col items-center gap-1 py-3"
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute inset-x-3 top-0 h-[2px] bg-teal-brand" />
                    )}

                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.7}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium">{label}</span>
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
