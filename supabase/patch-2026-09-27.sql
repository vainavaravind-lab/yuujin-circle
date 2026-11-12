-- ============================================================
-- Yuujin Circle · SNUC — Patch 2026-09-27
-- Adds: 3D face avatars (profiles.avatar jsonb).
-- Run in: Dashboard → SQL Editor → New query → paste ALL → Run
-- Safe to re-run (idempotent).
-- ============================================================

-- 1. Avatar blob on profiles ----------------------------------
-- Holds the generated 3D avatar: snapshot images (data URLs),
-- the source selfie, and the detected face landmarks. Null until
-- the user creates an avatar in the studio.
alter table public.profiles
  add column if not exists avatar jsonb;

-- Done ✅
