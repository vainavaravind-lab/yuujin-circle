-- ============================================================
-- Yuujin Circle · Patch 2026-10-05 — Random pairing + friends
-- Replaces swiping: users get randomly paired into a chat, and
-- mutual "add friend" interest turns the pairing into a friendship.
-- Run in: Dashboard → SQL Editor → New query (idempotent)
-- ============================================================

-- 1. Pairing queue --------------------------------------------
-- Users waiting to be randomly paired. A claimed row means the
-- other side already created the match; the claimed user
-- discovers it on their next poll.
create table if not exists public.pairing_queue (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_by uuid references public.profiles(id) on delete cascade
);

create index if not exists pairing_queue_created_idx on public.pairing_queue (created_at);

-- 2. Friend requests ------------------------------------------
-- One row per user who wants to be friends within a pairing
-- (matches row). Friends = both rows exist.
create table if not exists public.friend_requests (
  match_id   uuid not null references public.matches(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index if not exists friend_requests_user_idx on public.friend_requests (user_id);

-- 3. RPC: find a random pairing --------------------------------
-- Poll from the client every ~2.5s. Without args: joins/awaits the
-- queue. With allow_any => true: pairs with any random onboarded
-- student (used as a fallback when the queue stays quiet).
create or replace function public.pair_me_randomly(allow_any boolean default false)
returns uuid  -- the new (or just-created) match id, null while waiting
language plpgsql security definer set search_path = public as $$
declare
  me        uuid := auth.uid();
  partner   uuid;
  m1        uuid;
  m2        uuid;
  new_match uuid;
  my_row    public.pairing_queue;
begin
  if me is null then
    return null;
  end if;

  -- Housekeeping: drop stale queue rows (closed tabs etc).
  delete from public.pairing_queue where created_at < now() - interval '10 minutes';

  if not exists (
    select 1 from public.profiles p where p.id = me and p.onboarding_complete
  ) then
    return null;
  end if;

  if not allow_any then
    -- a) Someone already paired with me while I waited?
    select * into my_row from public.pairing_queue where user_id = me;
    if found and my_row.claimed_by is not null then
      select id into new_match
      from public.matches
      where (user1_id = me and user2_id = my_row.claimed_by)
         or (user1_id = my_row.claimed_by and user2_id = me)
      order by created_at desc
      limit 1;
      delete from public.pairing_queue where user_id = me;
      return new_match;
    end if;

    -- b) Claim someone else who is waiting.
    select q.user_id into partner
    from public.pairing_queue q
    join public.profiles p on p.id = q.user_id
    where q.user_id <> me
      and q.claimed_by is null
      and q.created_at > now() - interval '2 minutes'
      and p.onboarding_complete
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = me and b.blocked_id = q.user_id)
           or (b.blocker_id = q.user_id and b.blocked_id = me)
      )
      and not exists (
        select 1 from public.matches m
        where (m.user1_id = me and m.user2_id = q.user_id)
           or (m.user1_id = q.user_id and m.user2_id = me)
      )
    order by q.created_at
    limit 1
    for update of q skip locked;

    if partner is not null then
      -- Mark them claimed (they discover the match on their next poll)
      -- and stop waiting myself.
      update public.pairing_queue set claimed_by = me where user_id = partner;
      delete from public.pairing_queue where user_id = me;

      m1 := least(me, partner);
      m2 := greatest(me, partner);
      insert into public.matches (user1_id, user2_id) values (m1, m2)
      on conflict (user1_id, user2_id) do nothing
      returning id into new_match;
      if new_match is null then
        select id into new_match from public.matches
        where user1_id = m1 and user2_id = m2;
      end if;
      return new_match;
    end if;

    -- c) Nobody waiting — join the queue and poll again.
    insert into public.pairing_queue (user_id) values (me)
    on conflict (user_id) do update set created_at = now(), claimed_by = null;
    return null;
  end if;

  -- d) Fallback: pair with any random onboarded student.
  select p.id into partner
  from public.profiles p
  where p.id <> me
    and p.onboarding_complete
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = me and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = me)
    )
    and not exists (
      select 1 from public.matches m
      where (m.user1_id = me and m.user2_id = p.id)
         or (m.user1_id = p.id and m.user2_id = me)
    )
  order by random()
  limit 1;

  -- Everyone already paired? Allow re-pairing a past partner.
  if partner is null then
    select p.id into partner
    from public.profiles p
    where p.id <> me
      and p.onboarding_complete
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = me and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = me)
      )
    order by random()
    limit 1;
  end if;

  if partner is null then
    return null;
  end if;

  delete from public.pairing_queue where user_id in (me, partner);
  m1 := least(me, partner);
  m2 := greatest(me, partner);
  insert into public.matches (user1_id, user2_id) values (m1, m2)
  on conflict (user1_id, user2_id) do nothing
  returning id into new_match;
  if new_match is null then
    select id into new_match from public.matches
    where user1_id = m1 and user2_id = m2;
  end if;
  return new_match;
end $$;

-- Leave the queue (cancel search).
create or replace function public.leave_pairing_queue()
returns void
language sql security definer set search_path = public as $$
  delete from public.pairing_queue where user_id = auth.uid();
$$;

-- 4. RPC: express / withdraw friend interest --------------------
-- Returns 'added' (waiting), 'mutual' (you are now friends) or
-- 'removed' (took the request back).
create or replace function public.toggle_friend_interest(p_match_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  me    uuid := auth.uid();
  m     public.matches;
  other uuid;
begin
  if me is null then
    return 'error';
  end if;

  select * into m from public.matches
  where id = p_match_id and (user1_id = me or user2_id = me);
  if m is null then
    return 'error';
  end if;

  other := case when m.user1_id = me then m.user2_id else m.user1_id end;

  if exists (
    select 1 from public.friend_requests
    where match_id = p_match_id and user_id = me
  ) then
    delete from public.friend_requests where match_id = p_match_id and user_id = me;
    return 'removed';
  end if;

  insert into public.friend_requests (match_id, user_id) values (p_match_id, me);

  if exists (
    select 1 from public.friend_requests
    where match_id = p_match_id and user_id = other
  ) then
    return 'mutual';
  end if;
  return 'added';
end $$;

-- 5. Row Level Security ----------------------------------------
alter table public.pairing_queue  enable row level security;
alter table public.friend_requests enable row level security;

-- Queue: users only ever touch their own row; matching goes through
-- the security-definer RPC.
drop policy if exists "queue own select" on public.pairing_queue;
create policy "queue own select" on public.pairing_queue
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "queue own insert" on public.pairing_queue;
create policy "queue own insert" on public.pairing_queue
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "queue own delete" on public.pairing_queue;
create policy "queue own delete" on public.pairing_queue
  for delete to authenticated using (user_id = auth.uid());

-- Friend requests: participants can read; you insert/delete only your own.
drop policy if exists "friend requests participant select" on public.friend_requests;
create policy "friend requests participant select" on public.friend_requests
  for select to authenticated using (
    exists (
      select 1 from public.matches m
      where m.id = friend_requests.match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

drop policy if exists "friend requests own insert" on public.friend_requests;
create policy "friend requests own insert" on public.friend_requests
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = friend_requests.match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

drop policy if exists "friend requests own delete" on public.friend_requests;
create policy "friend requests own delete" on public.friend_requests
  for delete to authenticated using (user_id = auth.uid());

-- 6. Realtime: live "they added you!" + "you're friends!" -------
do $$ begin
  alter publication supabase_realtime add table public.friend_requests;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Done ✅
