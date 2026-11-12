import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { HEARTBEAT_MS, ONLINE_WINDOW_MS } from '../lib/constants';
import { useAuth } from './AuthContext';

interface PresenceContextValue {
  onlineIds: Set<string>;
  isOnline: (userId: string | null | undefined) => boolean;
}

const PresenceContext = createContext<PresenceContextValue | undefined>(undefined);

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    const beat = () =>
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => undefined);
    beat();
    const t = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('id, last_seen')
      .not('last_seen', 'is', null)
      .then(({ data }) => {
        if (data) {
          setLastSeenMap(new Map(data.map((r: any) => [r.id, r.last_seen as string])));
        }
      });

    const channelName = `presence-feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload: any) => {
          const row = payload.new as { id: string; last_seen: string | null };
          if (!row?.last_seen) return;
          setLastSeenMap((cur) => new Map(cur).set(row.id, row.last_seen as string));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value: PresenceContextValue = {
    onlineIds: new Set(
      [...lastSeenMap.entries()]
        .filter(([, seen]) => Date.now() - new Date(seen).getTime() < ONLINE_WINDOW_MS)
        .map(([id]) => id)
    ),
    isOnline: (id) =>
      !!id && lastSeenMap.has(id)
        ? Date.now() - new Date(lastSeenMap.get(id)!).getTime() < ONLINE_WINDOW_MS
        : false,
  };

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresence must be used within PresenceProvider');
  return ctx;
}