-- ============================================================
-- Yuujin Circle · Patch 2026-10-06 — Spark Season
-- Duolingo-style gamification: streak + XP + sparks, Question of
-- the Day, 5-stage chat reveal, and the Match/Pass endgame.
--
-- Run ONCE in: Dashboard → SQL Editor → New query → paste → Run
-- (Safe to re-run: every statement is idempotent.)
-- ============================================================

-- 1. Gamification columns on profiles -------------------------
--   xp            lifetime XP (drives the league)
--   streak_count  consecutive days answering the Question of the Day
--   last_qotd_date  last day a QOTD answer was saved
--   energy        "sparks": 5 max, each pairing costs 1
--   energy_ts     clock used to recharge sparks (+1 every 20 min)
alter table public.profiles
  add column if not exists xp            int not null default 0,
  add column if not exists streak_count  int not null default 0,
  add column if not exists last_qotd_date date,
  add column if not exists energy        int not null default 5,
  add column if not exists energy_ts     timestamptz not null default now();

-- Clients may never write these directly — only the server triggers
-- below can. (Existing profile updates send specific keys only, so
-- this column-level revoke is safe.)
revoke update (xp, streak_count, last_qotd_date, energy, energy_ts)
  on public.profiles from authenticated;

-- 2. Sparks -----------------------------------------------------
-- Recharges spent sparks for the caller (+1 per 20 min, max 5)
-- and returns the current amount. Call it when the app opens.
create or replace function public.refresh_sparks()
returns int
language plpgsql
security definer
set search_path = public as $$
declare
  me     uuid := auth.uid();
  amount int;
begin
  if me is null then
    return 0;
  end if;

  update public.profiles
     set energy    = least(5, energy + greatest(0, floor(extract(epoch from (now() - energy_ts)) / 1200)::int)),
         energy_ts = now()
   where id = me
   returning energy into amount;

  return coalesce(amount, 0);
end $$;

-- 3. Question of the Day ---------------------------------------
create table if not exists public.qotd_answers (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null default current_date,
  answer     text not null check (char_length(answer) between 1 and 240),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists qotd_answers_day_idx on public.qotd_answers (day);

alter table public.qotd_answers enable row level security;

-- Everyone can read answers (shown anonymously in the app)…
drop policy if exists "qotd answers read" on public.qotd_answers;
create policy "qotd answers read" on public.qotd_answers
  for select to authenticated using (true);

-- …but you can only write today's row, and only your own.
drop policy if exists "qotd answers own insert" on public.qotd_answers;
create policy "qotd answers own insert" on public.qotd_answers
  for insert to authenticated
  with check (user_id = auth.uid() and day = current_date);

drop policy if exists "qotd answers own update" on public.qotd_answers;
create policy "qotd answers own update" on public.qotd_answers
  for update to authenticated
  using (user_id = auth.uid() and day = current_date)
  with check (user_id = auth.uid() and day = current_date);

-- Saving a QOTD answer: +15 XP, +1 spark, and the daily streak.
create or replace function public.on_qotd_answered()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  update public.profiles
     set xp             = xp + 15,
         energy         = least(5, energy + 1),
         streak_count   = case
                            when last_qotd_date = current_date - 1 then streak_count + 1
                            when last_qotd_date = current_date     then streak_count
                            else 1
                          end,
         last_qotd_date = current_date
   where id = new.user_id;
  return new;
end $$;

drop trigger if exists on_qotd_answered_trigger on public.qotd_answers;
create trigger on_qotd_answered_trigger
  after insert on public.qotd_answers
  for each row execute function public.on_qotd_answered();

-- 4. XP for chatting, pairing and friending --------------------
-- +1 XP per message you send.
create or replace function public.on_message_posted()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  update public.profiles set xp = xp + 1 where id = new.sender_id;
  return new;
end $$;

drop trigger if exists on_message_posted_trigger on public.messages;
create trigger on_message_posted_trigger
  after insert on public.messages
  for each row execute function public.on_message_posted();

-- A fresh pairing: +10 XP for both, and it costs 1 spark each.
create or replace function public.on_match_created()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  update public.profiles
     set xp        = xp + 10,
         energy    = greatest(0, least(5, energy + greatest(0, floor(extract(epoch from (now() - energy_ts)) / 1200)::int)) - 1),
         energy_ts = now()
   where id in (new.user1_id, new.user2_id);
  return new;
end $$;

drop trigger if exists on_match_created_trigger on public.matches;
create trigger on_match_created_trigger
  after insert on public.matches
  for each row execute function public.on_match_created();

-- A friend row (added or mutual via Match/Pass): +25 XP.
create or replace function public.on_friend_row_added()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  update public.profiles set xp = xp + 25 where id = new.user_id;
  return new;
end $$;

drop trigger if exists on_friend_row_added_trigger on public.friend_requests;
create trigger on_friend_row_added_trigger
  after insert on public.friend_requests
  for each row execute function public.on_friend_row_added();

-- 5. The Match / Pass endgame ----------------------------------
-- Private choices made once a chat's spark is fully lit.
create table if not exists public.match_choices (
  match_id   uuid not null references public.matches(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  choice     text not null check (choice in ('match', 'pass')),
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.match_choices enable row level security;

-- Choices stay private: you can only ever read your own row.
drop policy if exists "match choices own select" on public.match_choices;
create policy "match choices own select" on public.match_choices
  for select to authenticated
  using (user_id = auth.uid());

-- 'pass' ends the pairing for both. Two 'match' rows turn the
-- pairing into a permanent friendship (friend_requests for both).
create or replace function public.submit_match_choice(p_match_id uuid, p_choice text)
returns text
language plpgsql
security definer
set search_path = public as $$
declare
  me    uuid := auth.uid();
  m     public.matches;
  other uuid;
begin
  if me is null or p_choice not in ('match', 'pass') then
    return 'error';
  end if;

  select * into m from public.matches where id = p_match_id;
  if m is null or (m.user1_id <> me and m.user2_id <> me) then
    return 'error';
  end if;

  other := case when m.user1_id = me then m.user2_id else m.user1_id end;

  if p_choice = 'pass' then
    delete from public.matches where id = p_match_id;  -- cascades messages, requests, choices
    return 'passed';
  end if;

  -- The spark must be fully lit (38+ messages) before a match sticks.
  if (select count(*) from public.messages where match_id = p_match_id) < 38 then
    raise exception 'SPARK_NOT_READY';
  end if;

  insert into public.match_choices (match_id, user_id, choice)
  values (p_match_id, me, 'match')
  on conflict (match_id, user_id) do nothing;

  if exists (
    select 1 from public.match_choices
    where match_id = p_match_id and user_id = other and choice = 'match'
  ) then
    insert into public.friend_requests (match_id, user_id)
    values (p_match_id, me), (p_match_id, other)
    on conflict (match_id, user_id) do nothing;
    return 'matched';
  end if;

  return 'waiting';
end $$;

-- 6. Going live now costs a spark -------------------------------
-- Same pairing logic as before, plus: recharge sparks, and refuse
-- to pair when the caller has none left.
create or replace function public.pair_me_randomly(allow_any boolean default false)
returns uuid
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

  delete from public.pairing_queue where created_at < now() - interval '10 minutes';

  if not exists (
    select 1 from public.profiles p where p.id = me and p.onboarding_complete
  ) then
    return null;
  end if;

  -- Going live costs 1 spark (recharges +1 every 20 minutes, max 5).
  update public.profiles
     set energy    = least(5, energy + greatest(0, floor(extract(epoch from (now() - energy_ts)) / 1200)::int)),
         energy_ts = now()
   where id = me;

  if (select energy from public.profiles where id = me) < 1 then
    raise exception 'OUT_OF_SPARKS';
  end if;

  if not allow_any then
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

    insert into public.pairing_queue (user_id) values (me)
    on conflict (user_id) do update set created_at = now(), claimed_by = null;
    return null;
  end if;

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

-- 7. Realtime: tell the other user when a pass deletes the match.
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Done ✅ — Spark Season is live. Refresh the app twice afterwards.
