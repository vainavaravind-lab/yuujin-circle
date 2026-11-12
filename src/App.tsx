import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { PresenceProvider } from './contexts/PresenceContext';
import { AppShell } from './components/AppShell';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { SetupRequired } from './components/SetupRequired';
import { Splash } from './components/Splash';
import Landing from './pages/Landing';
import AuthCallback from './pages/AuthCallback';
import Verify from './pages/Verify';
import Onboarding from './pages/Onboarding';
import Meet from './pages/Meet';
import Friends from './pages/Friends';
import Chat from './pages/Chat';
import League from './pages/League';
import Profile from './pages/Profile';

/** Blocks routes until a session exists. */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/" replace state={{ from: location }} />;
  return children;
}

/** Blocks main app until onboarding is complete. */
function RequireOnboarded({ children }: { children: JSX.Element }) {
  const { profile, loading } = useAuth();
  if (loading || !profile) return <Splash />;
  if (!profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  // Debug marker helps confirm env is loaded; remove anytime.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn('Yuujin Circle: missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
    }
  }, []);

  if (!isSupabaseConfigured) {
    return <SetupRequired />;
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/verify" element={<Verify />} />


          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />
          <Route
            path="/onboarding/edit"
            element={
              <RequireAuth>
                <Onboarding />
              </RequireAuth>
            }
          />

          {/* Full-screen chat — no shell chrome, like a native messaging screen */}
          <Route
            path="/chat/:matchId"
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <PresenceProvider>
                    <Chat />
                  </PresenceProvider>
                </RequireOnboarded>
              </RequireAuth>
            }
          />

          <Route
            element={
              <RequireAuth>
                <RequireOnboarded>
                  <AppShell />
                </RequireOnboarded>
              </RequireAuth>
            }
          >
            <Route path="/meet" element={<Meet />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/league" element={<League />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Retired swipe routes → new pages */}
          <Route path="/discover" element={<Navigate to="/meet" replace />} />
          <Route path="/matches" element={<Navigate to="/friends" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
