import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/database.types';
import { COLLEGE_DOMAIN } from '../lib/constants';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (p) setProfileState(p as Profile);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Kick off initial load.
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (!s) setProfileState(null);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Load profile whenever a session appears (once per user id).
  useEffect(() => {
    if (!session?.user) {
      return;
    }
    refreshProfile();
  }, [session?.user?.id, refreshProfile]);

  // Safety net: sign out non-college emails.
  useEffect(() => {
    const email = session?.user?.email;
    if (email && !email.toLowerCase().endsWith('@' + COLLEGE_DOMAIN)) {
      supabase.auth.signOut();
    }
  }, [session]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfileState(null);
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut,
    refreshProfile,
    setProfile: setProfileState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
