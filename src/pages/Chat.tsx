import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dices, SendHorizontal, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Match, Message } from '../lib/database.types';
import { sparkStageFromCount } from '../lib/gamification';
import { ConfirmDialog } from '../components/ConfirmDialog';

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { matchId } = useParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmUnmatch, setConfirmUnmatch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [closeFailed, setCloseFailed] = useState(false);

  const listRef = useRef<HTMLElement | null>(null);
  const markingRef = useRef(false);

  // History for this match.
  useEffect(() => {
    if (!matchId) return;
    let active = true;

    (async () => {
      setLoading(true);
      const [{ data, error }, { data: matchRow }] = await Promise.all([
        supabase
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true }),
        supabase.from('matches').select('*').eq('id', matchId).maybeSingle(),
      ]);
      if (!active) return;

      const match = matchRow as Match | null;
      if (match && user) {
        const meId = user.id;
        const themId = match.user1_id === meId ? match.user2_id : match.user1_id;
        setOtherId(themId);

        const { data: blockRows } = await supabase.rpc('my_blocks');
        const pairs = (blockRows as { blocker_id: string; blocked_id: string }[] | null) ?? [];
        const mine = pairs.some((b) => b.blocker_id === meId && b.blocked_id === themId);
        const theirs = pairs.some((b) => b.blocker_id === themId && b.blocked_id === meId);
        if (active && (mine || theirs)) {
          setBlocked(true);
          setBlockedByMe(mine);
        }
      }

      if (error) {
        toast(error.message, 'error');
        setLoading(false);
        return;
      }
      setMessages((data as Message[] | null) ?? []);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [matchId, toast, user]);

  // Live inserts for this match only. A blocked person's messages never land.
  useEffect(() => {
    if (!matchId || blocked) return;

    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload: { new: Message }) => {
          const row = payload.new;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, blocked]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Acknowledge anything the other side sent, while this screen is actually seen.
  useEffect(() => {
    if (!matchId || !user) return;
    const unread = messages.filter((m) => m.sender_id !== user.id && !m.read_at);
    if (unread.length === 0) return;

    const ids = new Set(unread.map((m) => m.id));
    const markRead = async () => {
      if (document.visibilityState === 'hidden' || markingRef.current) return;
      markingRef.current = true;
      const { error } = await supabase.rpc('mark_messages_read', { p_match_id: matchId });
      markingRef.current = false;
      if (error) return;

      const readAt = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) => (ids.has(m.id) && !m.read_at ? { ...m, read_at: readAt } : m))
      );
    };

    markRead();
    document.addEventListener('visibilitychange', markRead);
    return () => document.removeEventListener('visibilitychange', markRead);
  }, [messages, matchId, user]);

  const { stage } = sparkStageFromCount(messages.length);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !matchId || !user || sending || blocked) return;

    setSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: matchId, sender_id: user.id, content })
      .select()
      .single();
    setSending(false);

    if (error) {
      toast(error.message, 'error');
      return;
    }
    const row = data as Message;
    setInput('');
    setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
  }

  async function leavePairing() {
    if (!matchId || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('unmatch', { p_match_id: matchId });
    setBusy(false);

    if (error) {
      setConfirmUnmatch(false);
      toast(error.message, 'error');
      return;
    }
    if (!data) {
      // The server declined: keep the chat visible rather than pretending it closed.
      setConfirmUnmatch(false);
      toast('That pairing could not be closed. Try again.', 'error');
      return;
    }

    setConfirmUnmatch(false);
    toast('Pairing closed.', 'success');
    navigate('/friends');
  }

  async function retryClose() {
    if (!matchId || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('unmatch', { p_match_id: matchId });
    setBusy(false);

    if (error) {
      toast(error.message, 'error');
      return;
    }
    if (!data) {
      toast('Still could not close it. Try again later.', 'error');
      return;
    }

    setCloseFailed(false);
    toast('Pairing closed.', 'success');
    navigate('/friends');
  }

  async function blockPerson() {
    if (!matchId || !user || !otherId || busy) return;
    setBusy(true);

    const { error: blockError } = await supabase
      .from('blocks')
      .insert({ blocker_id: user.id, blocked_id: otherId });
    if (blockError) {
      setBusy(false);
      toast(blockError.message, 'error');
      return;
    }
    setBlocked(true);
    setBlockedByMe(true);

    const { data, error } = await supabase.rpc('unmatch', { p_match_id: matchId });
    setBusy(false);
    setConfirmBlock(false);

    if (error) {
      toast(error.message, 'error');
      return;
    }
    if (!data) {
      // The block itself succeeded, so stay honest about the half that did not.
      setCloseFailed(true);
      toast('Blocked, but the chat could not be closed. Try again.', 'error');
      return;
    }
    toast('Blocked. They will not turn up again.', 'success');
    navigate('/friends');
  }

  return (
    <div className="flex h-dvh flex-col bg-cream">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-cream/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Dices size={18} className="liquid-gl shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-ink">
                Chat
              </p>
              <p className="label mt-0.5">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'} · stage {stage}/5
              </p>
            </div>
          </div>

          <nav className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setConfirmBlock(true)}
              disabled={!otherId || blocked}
              className="whitespace-nowrap rounded bg-white/[0.03] px-3 py-1.5 text-[12px] text-ink-soft transition hover:bg-white/[0.1] disabled:opacity-40"
            >
              Block
            </button>
            <button
              onClick={() => setConfirmUnmatch(true)}
              disabled={!matchId}
              className="flex items-center gap-1 whitespace-nowrap rounded bg-white/[0.03] px-3 py-1.5 text-[12px] text-ink-soft transition hover:bg-white/[0.1] disabled:opacity-40"
            >
              <X size={14} /> Leave
            </button>
          </nav>
        </div>

      </header>

      <main ref={listRef} className="flex-1 overflow-y-auto px-4 py-5">
        {loading ? (
          <p className="py-10 text-center text-[13px] text-ink-faint">Loading messages…</p>
        ) : messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-[34ch] text-center">
            <p className="display-3 text-ink">Nobody has spoken yet.</p>
            <p className="mt-2 text-[13px] leading-[1.6] text-ink-soft">
              Say something first. Each message lights one more part of the meter.
            </p>
          </div>
        ) : (
          <ul className="mx-auto flex max-w-3xl flex-col gap-2">
            {messages.map((msg) => {
              const mine = msg.sender_id === user?.id;
              return (
                <motion.li
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.22 } }}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                      mine
                        ? 'rounded-br-md bg-teal-mist text-ink'
                        : 'rounded-bl-md bg-white/[0.05] text-ink'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.5]">
                      {msg.content}
                    </p>
                    <p className="mt-1 text-[10px] tabular-nums text-ink-faint">
                      {timeOf(msg.created_at ?? new Date().toISOString())}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </main>

      {blocked ? (
        <div className="border-t border-white/[0.08] bg-cream/95 px-4 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[13px] leading-[1.6] text-ink-soft">
              {blockedByMe
                ? 'You blocked this person. This chat is read-only, and they can no longer reach you.'
                : 'This person blocked you. This chat is read-only, and you can no longer reach them.'}
            </p>
            <p className="mt-1 text-[12px] text-ink-faint">
              {blockedByMe && closeFailed
                ? 'The pairing itself has not closed yet.'
                : 'The conversation is closed for good.'}
            </p>
            <button
              className="btn-ghost mt-3"
              disabled={busy}
              onClick={blockedByMe && closeFailed ? retryClose : () => navigate('/friends')}
            >
              {busy ? 'Closing…' : blockedByMe && closeFailed ? 'Try closing again' : 'Back to chats'}
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="border-t border-white/[0.08] bg-cream/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              aria-label="Message"
              className="input flex-1"
              maxLength={1000}
            />
            <button
              className="btn-primary !min-h-[44px] !px-4"
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmUnmatch}
        title="Leave this pairing?"
        body="The chat closes for both of you and neither of you can reopen it."
        confirmLabel={busy ? 'Leaving…' : 'Leave'}
        onConfirm={leavePairing}
        onCancel={() => setConfirmUnmatch(false)}
      />

      <ConfirmDialog
        open={confirmBlock}
        danger
        title="Block this person?"
        body="They disappear from your campus for good: this chat closes and you will never be paired again. This cannot be undone from here."
        confirmLabel={busy ? 'Blocking…' : 'Block'}
        onConfirm={blockPerson}
        onCancel={() => setConfirmBlock(false)}
      />
    </div>
  );
}
