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

