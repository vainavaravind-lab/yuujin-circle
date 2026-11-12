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
