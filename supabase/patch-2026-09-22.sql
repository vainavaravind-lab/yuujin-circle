-- ============================================================
-- Yuujin Circle · SNUC — Patch 2026-09-22
-- Adds: icebreaker prompts, online presence, who-liked-you,
--       unread message tracking, unmatch.
-- Run in: Dashboard → SQL Editor → New query → paste ALL → Run
-- Safe to re-run (idempotent).
-- ============================================================

-- 1. Icebreaker prompts on profiles ---------------------------
alter table public.profiles
  add column if not exists prompts jsonb not null default '[]'::jsonb;

-- 2. Online presence + message-read tracking ------------------
alter table public.profiles
  add column if not exists last_seen timestamptz;

alter table public.messages
  add column if not exists read_at timestamptz;

-- 3. Message-read RPCs (participant-only) ---------------------
create or replace function public.mark_messages_read(p_match_id uuid)
returns void
language sql security definer set search_path = public as $$
  update public.messages m
  set read_at = now()
  where m.match_id = p_match_id
    and m.read_at is null
    and m.sender_id <> auth.uid()
    and exists (
      select 1 from public.matches mt
      where mt.id = m.match_id
        and (mt.user1_id = auth.uid() or mt.user2_id = auth.uid())
    );
$$;

-- Unread count per match for the current user.
create or replace function public.unread_counts()
returns table (match_id uuid, unread bigint)
language sql security definer set search_path = public stable as $$
  select m.match_id, count(*)::bigint
  from public.messages m
  join public.matches mt on mt.id = m.match_id
  where (mt.user1_id = auth.uid() or mt.user2_id = auth.uid())
    and m.sender_id <> auth.uid()
    and m.read_at is null
  group by m.match_id;
$$;

-- 4. Who-liked-you RPC -----------------------------------------
create or replace function public.who_liked_me()
returns setof public.profiles
language sql security definer set search_path = public stable as $$
  select p.*
  from public.likes l
  join public.profiles p on p.id = l.liker_id
  where l.likee_id = auth.uid()
    and l.is_like
    and not exists (
      select 1 from public.likes mine
      where mine.liker_id = auth.uid() and mine.likee_id = l.liker_id
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = l.liker_id)
         or (b.blocker_id = l.liker_id and b.blocked_id = auth.uid())
    )
  order by l.created_at desc;
$$;

-- 5. Unmatch (participant-only, atomic) ------------------------
create or replace function public.unmatch(p_match_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  m public.matches;
begin
  if auth.uid() is null then
    return false;
  end if;

  delete from public.matches
  where id = p_match_id
    and (user1_id = auth.uid() or user2_id = auth.uid())
  returning * into m;

  if m is null then
    return false;
  end if;

  -- Remove the mutual like pair so both users can re-discover each other.
  delete from public.likes l
  where (l.liker_id = m.user1_id and l.likee_id = m.user2_id)
     or (l.liker_id = m.user2_id and l.likee_id = m.user1_id);

  return true;
end $$;

-- 6. RLS: participants may update message read_at --------------
drop policy if exists "messages participant update" on public.messages;
create policy "messages participant update" on public.messages
  for update to authenticated
  using (
    exists (
      select 1 from public.matches mt
      where mt.id = messages.match_id
        and (mt.user1_id = auth.uid() or mt.user2_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.matches mt
      where mt.id = messages.match_id
        and (mt.user1_id = auth.uid() or mt.user2_id = auth.uid())
    )
  );

-- 7. RLS: profiles.last_seen heartbeat update ------------------
-- (lets users update only their own last_seen; profile update policy
-- already allows full own-row updates, so this is belt-and-braces clarity)

-- 8. Realtime: broadcast presence via profile heartbeats ------
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Done ✅
