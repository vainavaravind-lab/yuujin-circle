-- ============================================================
-- Yuujin Circle · SNUC — Supabase schema
-- Run this whole file ONCE in: Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Enums ---------------------------------------------------
do $$ begin
  create type public.looking_for as enum ('dating', 'friendship', 'both');
exception when duplicate_object then null; end $$;

-- 2. Tables --------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null,
  full_name           text not null default '',
  age                 int,
  department          text not null default '',
  year                int check (year between 1 and 5),
  bio                 text not null default '',
  interests           text[] not null default '{}',
  looking_for         public.looking_for,
  photos              text[] not null default '{}',
  prompts             jsonb not null default '[]'::jsonb,
  avatar              jsonb,
  last_seen           timestamptz,
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint profile_email_domain check (email like '%@snuchennai.edu.in'),
  constraint photos_max check (array_length(photos, 1) is null or array_length(photos, 1) <= 4)
);

create table if not exists public.likes (
  liker_id uuid not null references public.profiles(id) on delete cascade,
  likee_id uuid not null references public.profiles(id) on delete cascade,
  is_like  boolean not null,
  created_at timestamptz not null default now(),
  primary key (liker_id, likee_id),
  constraint no_self_like check (liker_id <> likee_id)
);

create table if not exists public.matches (
  id         uuid primary key default gen_random_uuid(),
  user1_id   uuid not null references public.profiles(id) on delete cascade,
  user2_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user1_id, user2_id),
  constraint no_self_match check (user1_id <> user2_id)
);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  details     text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);

create index if not exists messages_match_idx on public.messages (match_id, created_at);
create index if not exists matches_user1_idx on public.matches (user1_id);
create index if not exists matches_user2_idx on public.matches (user2_id);

-- 3. Domain lock on auth.users (server-side enforcement) ----
create or replace function public.enforce_college_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is null or lower(new.email) not like '%@snuchennai.edu.in' then
    raise exception 'Only @snuchennai.edu.in emails can sign up for Yuujin Circle';
  end if;
  return new;
end $$;

drop trigger if exists enforce_college_email_trigger on auth.users;
create trigger enforce_college_email_trigger
  before insert on auth.users
  for each row execute function public.enforce_college_email();

-- 4. Auto-create stub profile on signup ---------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. updated_at touch ---------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 6. RPCs ----------------------------------------------------
-- Record a like/pass; create match atomically on mutual like.
create or replace function public.submit_like(target uuid, is_like boolean)
returns boolean  -- true when a NEW match was created
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m1 uuid; m2 uuid; existing uuid;
begin
  if me is null or target is null or me = target then
    return false;
  end if;

  insert into public.likes (liker_id, likee_id, is_like)
  values (me, target, is_like)
  on conflict (liker_id, likee_id) do update set is_like = excluded.is_like;

  if not is_like then
    return false;
  end if;

  if not exists (
    select 1 from public.likes l
    where l.liker_id = target and l.likee_id = me and l.is_like
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = me and b.blocked_id = target)
       or (b.blocker_id = target and b.blocked_id = me)
  ) then
    return false;
  end if;

  m1 := least(me, target);
  m2 := greatest(me, target);

  select id into existing from public.matches
  where user1_id = m1 and user2_id = m2;

  if existing is not null then
    return false;
  end if;

  insert into public.matches (user1_id, user2_id) values (m1, m2);
  return true;
end $$;

-- Discovery deck: excludes self, swiped, blocked, un-onboarded.
create or replace function public.get_discover_profiles(max_rows int default 20)
returns setof public.profiles
language sql security definer set search_path = public stable as $$
  select p.*
  from public.profiles p
  where p.id <> auth.uid()
    and p.onboarding_complete
    and not exists (
      select 1 from public.likes l
      where l.liker_id = auth.uid() and l.likee_id = p.id
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
  order by p.created_at
  limit greatest(1, least(coalesce(max_rows, 20), 50));
$$;

-- Read tracking ------------------------------------------------
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

-- Who-liked-you --------------------------------------------------
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

-- Unmatch (participant-only, atomic) -----------------------------
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

-- 7. Row Level Security --------------------------------------
alter table public.profiles enable row level security;
alter table public.likes    enable row level security;
alter table public.matches  enable row level security;
alter table public.messages enable row level security;
alter table public.reports  enable row level security;
alter table public.blocks   enable row level security;

-- profiles
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles own delete" on public.profiles;
create policy "profiles own delete" on public.profiles
  for delete to authenticated using (id = auth.uid());

-- likes: only your outgoing swipes
drop policy if exists "likes own select" on public.likes;
create policy "likes own select" on public.likes
  for select to authenticated using (liker_id = auth.uid());

drop policy if exists "likes own insert" on public.likes;
create policy "likes own insert" on public.likes
  for insert to authenticated with check (liker_id = auth.uid());

-- matches: participants only
drop policy if exists "matches participant select" on public.matches;
create policy "matches participant select" on public.matches
  for select to authenticated
  using (user1_id = auth.uid() or user2_id = auth.uid());

-- messages: participants only
drop policy if exists "messages participant select" on public.messages;
create policy "messages participant select" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

drop policy if exists "messages participant insert" on public.messages;
create policy "messages participant insert" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

drop policy if exists "messages participant update" on public.messages;
create policy "messages participant update" on public.messages
  for update to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

-- reports: insert-only (privacy)
drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

-- blocks
drop policy if exists "blocks own select" on public.blocks;
create policy "blocks own select" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "blocks own insert" on public.blocks;
create policy "blocks own insert" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists "blocks own delete" on public.blocks;
create policy "blocks own delete" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- 8. Realtime for messages + presence -------------------------
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- 9. Storage bucket + policies --------------------------------
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos public read" on storage.objects;
create policy "photos public read" on storage.objects
  for select using (bucket_id = 'profile-photos');

drop policy if exists "photos own upload" on storage.objects;
create policy "photos own upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos own delete" on storage.objects;
create policy "photos own delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "photos own update" on storage.objects;
create policy "photos own update" on storage.objects
  for update to authenticated using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 10. Random pairing + friends ----------------------------------
-- Users skip swiping: they get randomly paired into a matches row
-- (chat). Mutual "add friend" interest upgrades it to a friendship.
create table if not exists public.pairing_queue (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_by uuid references public.profiles(id) on delete cascade
);

create index if not exists pairing_queue_created_idx on public.pairing_queue (created_at);

create table if not exists public.friend_requests (
  match_id   uuid not null references public.matches(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index if not exists friend_requests_user_idx on public.friend_requests (user_id);

-- Random pairing: poll every ~2.5s; allow_any => pair with any random
-- onboarded student when the queue stays quiet.
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

create or replace function public.leave_pairing_queue()
returns void
language sql security definer set search_path = public as $$
  delete from public.pairing_queue where user_id = auth.uid();
$$;

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

alter table public.pairing_queue  enable row level security;
alter table public.friend_requests enable row level security;

drop policy if exists "queue own select" on public.pairing_queue;
create policy "queue own select" on public.pairing_queue
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "queue own insert" on public.pairing_queue;
create policy "queue own insert" on public.pairing_queue
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "queue own delete" on public.pairing_queue;
create policy "queue own delete" on public.pairing_queue
  for delete to authenticated using (user_id = auth.uid());

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

do $$ begin
  alter publication supabase_realtime add table public.friend_requests;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- 11. Spark Season (gamification + staged reveal + Match/Pass) -----
alter table public.profiles
  add column if not exists xp            int not null default 0,
  add column if not exists streak_count  int not null default 0,
  add column if not exists last_qotd_date date,
  add column if not exists energy        int not null default 5,
  add column if not exists energy_ts     timestamptz not null default now();

revoke update (xp, streak_count, last_qotd_date, energy, energy_ts)
  on public.profiles from authenticated;

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

create table if not exists public.qotd_answers (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        date not null default current_date,
  answer     text not null check (char_length(answer) between 1 and 240),
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists qotd_answers_day_idx on public.qotd_answers (day);

alter table public.qotd_answers enable row level security;

drop policy if exists "qotd answers read" on public.qotd_answers;
create policy "qotd answers read" on public.qotd_answers
  for select to authenticated using (true);

drop policy if exists "qotd answers own insert" on public.qotd_answers;
create policy "qotd answers own insert" on public.qotd_answers
  for insert to authenticated
  with check (user_id = auth.uid() and day = current_date);

drop policy if exists "qotd answers own update" on public.qotd_answers;
create policy "qotd answers own update" on public.qotd_answers
  for update to authenticated
  using (user_id = auth.uid() and day = current_date)
  with check (user_id = auth.uid() and day = current_date);

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

create table if not exists public.match_choices (
  match_id   uuid not null references public.matches(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  choice     text not null check (choice in ('match', 'pass')),
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.match_choices enable row level security;

drop policy if exists "match choices own select" on public.match_choices;
create policy "match choices own select" on public.match_choices
  for select to authenticated
  using (user_id = auth.uid());

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
    delete from public.matches where id = p_match_id;
    return 'passed';
  end if;

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

do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Done ✅


-- ============================================================
-- Yuujin Circle · SNUC — Patch 2026-11-10
-- Adds: block direction lookup, so a pairing reads as blocked
--       whether you blocked them or they blocked you.
-- Run in: Dashboard → SQL Editor → New query → paste ALL → Run
-- Safe to re-run (idempotent).
-- ============================================================

-- The RLS policy on public.blocks only exposes rows you created,
-- so the person on the other end cannot see the block directly.
-- This returns both directions for pairs that involve the caller.
create or replace function public.my_blocks()
returns table (blocker_id uuid, blocked_id uuid)
language sql security definer set search_path = public stable as $$
  select b.blocker_id, b.blocked_id
  from public.blocks b
  where auth.uid() is not null
    and (b.blocker_id = auth.uid() or b.blocked_id = auth.uid());
$$;

-- Private profile photos and the profile editor RPC.
begin;

alter table public.profiles add column if not exists profile_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_view_profile_photo(p_path text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and (
    split_part(p_path, '/', 1) = auth.uid()::text
    or exists (
      select 1
      from public.profiles p
      join public.matches m on
        (m.user1_id = auth.uid() and m.user2_id = p.id)
        or (m.user2_id = auth.uid() and m.user1_id = p.id)
      where p.profile_photo_path = p_path
        and p.id::text = split_part(p_path, '/', 1)
        and not exists (
          select 1 from public.my_blocks() b
          where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
             or (b.blocker_id = p.id and b.blocked_id = auth.uid())
        )
        and exists (
          select 1 from public.messages msg where msg.match_id = m.id offset 7 limit 1
        )
    )
  );
$$;

revoke all on function public.can_view_profile_photo(text) from public;
grant execute on function public.can_view_profile_photo(text) to authenticated;

drop policy if exists "profile avatar read" on storage.objects;
create policy "profile avatar read" on storage.objects for select to authenticated
  using (bucket_id = 'profile-avatars' and public.can_view_profile_photo(name));

drop policy if exists "profile avatar upload" on storage.objects;
create policy "profile avatar upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-avatars' and name ~
    ('^' || auth.uid()::text || '/[0-9a-f-]{36}[.]jpg$'));

drop policy if exists "profile avatar delete" on storage.objects;
create policy "profile avatar delete" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-avatars' and split_part(name, '/', 1) = auth.uid()::text);

create or replace function public.save_profile(
  p_name text, p_department text, p_year int, p_bio text,
  p_interests text[], p_looking_for public.looking_for,
  p_photo_path text, p_previous_photo_path text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Sign in to update your profile'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 60
     or p_department is null or char_length(trim(p_department)) not between 1 and 80
     or p_year is null or p_year not between 1 and 5
     or char_length(coalesce(p_bio, '')) > 300
     or coalesce(cardinality(p_interests), 0) not between 1 and 8
     or p_looking_for is null then
    raise exception 'Check your profile details and try again';
  end if;
  if p_photo_path is not null and (
    p_photo_path !~ ('^' || caller::text || '/[0-9a-f-]{36}[.]jpg$')
    or not exists (
      select 1 from storage.objects where bucket_id = 'profile-avatars' and name = p_photo_path
    )
  ) then
    raise exception 'Upload a photo before saving';
  end if;

  update public.profiles
    set full_name = trim(p_name), department = trim(p_department), year = p_year,
        bio = coalesce(trim(p_bio), ''), interests = p_interests, looking_for = p_looking_for,
        profile_photo_path = p_photo_path, onboarding_complete = true
    where id = caller and profile_photo_path is not distinct from p_previous_photo_path;
  if not found then raise exception 'Your profile changed. Refresh and try again'; end if;
end;
$$;

revoke all on function public.save_profile(text,text,int,text,text[],public.looking_for,text,text) from public;
grant execute on function public.save_profile(text,text,int,text,text[],public.looking_for,text,text) to authenticated;

commit;

