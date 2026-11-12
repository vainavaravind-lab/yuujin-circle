import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Dices } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
import { ProfilePhoto } from '../components/ProfilePhoto';
import type { FriendRequest, Match, Message, Profile, UnreadCount } from '../lib/database.types';
import { displayName } from '../lib/profile';
import { relativeTime } from '../lib/format';
import { isGifMessage } from '../lib/media';
import { SkeletonMatchList } from '../components/Skeleton';

interface Row {
  match: Match;
  other: Profile;
  lastMessage: Message | null;
  unread: number;
  friends: boolean;
  blocked: boolean;
  blockedByMe: boolean;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Friends() {
  const { user } = useAuth();
  const { isOnline } = usePresence();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const matches = (matchData as Match[]) ?? [];

    if (matches.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const matchIds = matches.map((m) => m.id);
    const otherIds = matches.map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id));
    const [{ data: profiles }, { data: unread }, { data: recentMsgs }, { data: reqs }, { data: blocks }] =
      await Promise.all([
        supabase.from('profiles').select('*').in('id', otherIds),
        supabase.rpc('unread_counts'),
        supabase
          .from('messages')
          .select('*')
          .in('match_id', matchIds)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('friend_requests').select('*').in('match_id', matchIds),
        supabase.rpc('my_blocks'),
      ]);

    // Either direction closes the pairing, but only your own block is yours to explain.
    const blockedByMeIds = new Set<string>();
    const blockedMeIds = new Set<string>();
    ((blocks as { blocker_id: string; blocked_id: string }[] | null) ?? []).forEach((b) => {
      if (b.blocker_id === user.id) blockedByMeIds.add(b.blocked_id);
      else if (b.blocked_id === user.id) blockedMeIds.add(b.blocker_id);
    });

    const byId = new Map<string, Profile>();
    ((profiles as Profile[]) ?? []).forEach((p) => byId.set(p.id, p));
    const unreadByMatch = new Map<string, number>();
    ((unread as UnreadCount[]) ?? []).forEach((u) => unreadByMatch.set(u.match_id, Number(u.unread)));
    const lastByMatch = new Map<string, Message>();
    ((recentMsgs as Message[]) ?? []).forEach((m) => {
      if (!lastByMatch.has(m.match_id)) lastByMatch.set(m.match_id, m);
    });

    // Friends = both sides of the pairing asked for it.
    const reqsByMatch = new Map<string, Set<string>>();
    ((reqs as FriendRequest[]) ?? []).forEach((r) => {
      if (!reqsByMatch.has(r.match_id)) reqsByMatch.set(r.match_id, new Set());
      reqsByMatch.get(r.match_id)!.add(r.user_id);
    });

    setRows(
      matches
        .map((m) => {
          const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
          const other = byId.get(otherId);
          if (!other) return null;
          const want = reqsByMatch.get(m.id);
          const blockedByMe = blockedByMeIds.has(otherId);
          const blocked = blockedByMe || blockedMeIds.has(otherId);
          return {
            match: m,
            other: { ...other, email: '' },
            lastMessage: lastByMatch.get(m.id) ?? null,
            unread: blocked ? 0 : (unreadByMatch.get(m.id) ?? 0),
            friends: !!want?.has(m.user1_id) && !!want?.has(m.user2_id),
            blocked,
            blockedByMe,
          };
        })
        .filter((r): r is Row => r !== null)
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const matchIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    matchIdsRef.current = new Set(rows.map((r) => r.match.id));
  }, [rows]);

  // Live updates: message previews + friend-status flips without refetch.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`friends-feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as Message;
        if (!matchIdsRef.current.has(row.match_id)) return;
        setRows((cur) =>
          cur.map((r) =>
            r.match.id === row.match_id
              ? {
                  ...r,
                  lastMessage: row,
                  unread: r.blocked || row.sender_id === user.id ? r.unread : r.unread + 1,
                }
              : r
          )
        );
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as Message;
        if (!row.read_at || !matchIdsRef.current.has(row.match_id)) return;
        setRows((cur) =>
          cur.map((r) => (r.match.id === row.match_id && row.sender_id !== user.id ? { ...r, unread: 0 } : r))
        );
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const blockedRows = rows.filter((r) => r.blocked);
  const friends = rows.filter((r) => !r.blocked && r.friends);
  const pending = rows.filter((r) => !r.blocked && !r.friends);
  const totalUnread = rows.reduce((n, r) => n + r.unread, 0);

  const listRow = ({
    match,
    other,
    lastMessage,
    unread,
    friends: isFriend,
    blocked,
    blockedByMe,
  }: Row) => {
    const preview = lastMessage
      ? `${lastMessage.sender_id === user?.id ? 'You: ' : ''}${
          isGifMessage(lastMessage.content) ? 'Sent a GIF' : lastMessage.content
        }`
      : null;
    return (
      <motion.li
        key={match.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        className="border-b border-white/[0.08]"
      >
        <Link
          to={`/chat/${match.id}`}
          className="group flex items-center gap-4 py-4 transition-colors duration-200 hover:bg-white/[0.03]"
        >
          <span className="relative shrink-0">
            <ProfilePhoto path={!blocked && isFriend ? other.profile_photo_path : null} className="size-10" />
            {!blocked && isOnline(other.id) && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-cream bg-teal-brand"
                title="Online now"
              />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span
                className={`truncate text-[15px] font-semibold ${
                  blocked ? 'text-ink-soft' : 'text-ink'
                }`}
              >
                {displayName(other)}
              </span>
              {blocked ? (
                <span className="label shrink-0 !text-rose-soft">Blocked</span>
              ) : (
                isFriend && <span className="label shrink-0 !text-teal-deep">Friends</span>
              )}
            </span>
            <span
              className={`mt-0.5 block truncate text-[13px] ${
                !blocked && unread > 0 ? 'text-ink' : 'text-ink-soft'
              }`}
            >
              {blocked
                ? blockedByMe
                  ? 'You blocked this person. This chat is read-only.'
                  : 'This person blocked you. This chat is read-only.'
                : preview ??
                  (isFriend ? 'A friendship, confirmed both ways.' : 'A pairing still figuring itself out.')}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-3">
            {!blocked && unread > 0 && (
              <span className="label !tracking-normal !text-teal-deep">
                {unread > 9 ? '9+' : unread} new
              </span>
            )}
            <span className="label hidden w-16 text-right sm:block">
              {lastMessage ? relativeTime(lastMessage.created_at) : 'new'}
            </span>
            <ChevronRight
              size={16}
              className="text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      </motion.li>
    );
  };

  return (
    <div className="pb-4">
      <header>
        <h1 className="display-1">Friends</h1>
        <p className="lead mt-3 max-w-[46ch]">
          A pairing becomes a friendship when you both ask for it. Until then it sits here, open.
        </p>
        {!loading && rows.length > 0 && (
          <p className="label mt-4">
            {friends.length} friend{friends.length === 1 ? '' : 's'} · {pending.length} in progress
            {totalUnread > 0 ? ` · ${totalUnread} unread` : ''}
          </p>
        )}
      </header>

      {loading ? (
        <div className="mt-8">
          <SkeletonMatchList />
        </div>
      ) : rows.length === 0 ? (
        <EmptyFriends />
      ) : (
        <div className="mt-10 space-y-12">
          {friends.length > 0 && (
            <section className="rise">
              <h2 className="display-3 text-ink">Friends</h2>
              <ul className="mt-4 border-t border-white/[0.08]">
                <AnimatePresence initial={false}>{friends.map(listRow)}</AnimatePresence>
              </ul>
            </section>
          )}
          {pending.length > 0 && (
            <section className="rise">
              <h2 className="display-3 text-ink">Getting acquainted</h2>
              <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.6] text-ink-soft">
                Tap “Add friend” inside a chat. When the other person does the same, the pairing moves
                up.
              </p>
              <ul className="mt-4 border-t border-white/[0.08]">
                <AnimatePresence initial={false}>{pending.map(listRow)}</AnimatePresence>
              </ul>
            </section>
          )}
          {blockedRows.length > 0 && (
            <section className="rise">
              <h2 className="display-3 text-ink">Blocked</h2>
              <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.6] text-ink-soft">
                Closed on one side or the other. The history stays readable, and nothing new arrives.
              </p>
              <ul className="mt-4 border-t border-white/[0.08]">
                <AnimatePresence initial={false}>{blockedRows.map(listRow)}</AnimatePresence>
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyFriends() {
  return (
    <div className="mt-10 max-w-[52ch] border border-white/10 p-8">
      <Dices size={28} strokeWidth={1.4} className="text-teal-brand" />
      <h2 className="display-2 mt-5">Nothing here yet</h2>
      <p className="mt-3 text-[15px] leading-[1.6] text-ink-soft">
        Pairings start on Meet: one spark, one random classmate from your campus. Chats you keep open
        show up here.
      </p>
      <Link to="/meet" className="btn-primary mt-6">
        Go to Meet
      </Link>
    </div>
  );
}

