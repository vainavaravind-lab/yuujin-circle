# 💘 Yuujin Circle — SNUC Campus Dating

A college-exclusive dating app for **Shiv Nadar University Chennai** (`@snuchennai.edu.in` only).

Mobile-first React SPA with random campus pairings and a staged profile reveal.

## Tech

- React 18 + Vite + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Supabase — Auth (magic links), Postgres + RLS, Storage, Realtime
- framer-motion animations, lucide-react icons

## Quick start

1. **Create a free Supabase project** at [supabase.com](https://supabase.com).
2. **Run the schema** — open `supabase/schema.sql`, copy everything into the Supabase
   *SQL Editor*, and run it once. This creates tables, RLS policies, triggers, RPCs and the
   `profile-photos` bucket.
3. **Copy your keys** — Project Settings → API → copy the Project URL and anon public key into a
   new `.env.local` (see `.env.example`).
4. **Magic-link redirect** — In Supabase → Authentication → URL Configuration, set:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`
5. **Run it**

   ```bash
   npm install
   npm run dev
   ```

6. **Delete account support (optional but recommended)** — deploy the edge function:

   ```bash
   supabase functions deploy delete-user
   ```

Full details, troubleshooting and production notes: see **SETUP.md**.

## Features

- 🎓 Magic-link sign-in restricted to `@snuchennai.edu.in` (enforced in UI *and* by a database
  trigger on `auth.users`)
- 🖼️ Onboarding and profile editing with an optional, privately stored profile photo
- 🎲 Random pairing: get matched with a random classmate, chat instantly, add each other as friends when you both vibe
- 💞 Mutual likes create a match with a celebration modal
- 💬 Realtime chat — only between matched users
- 🛡️ Report (insert-only, anonymous) and Block (hides the person everywhere)
- ✏️ Edit profile + full account deletion (edge function)
- 🔒 Row Level Security on every table

## Project structure

```
src/
  components/   shared UI (AppShell, dialogs…)
  contexts/     AuthContext, ToastContext, PresenceContext
  lib/          supabase client, DB types, gamification helpers, constants
  pages/        Landing, AuthCallback, Verify, Onboarding, Meet, Friends, League, Chat, Profile
supabase/
  schema.sql    run once in the SQL editor
  patch-*.sql   incremental patches (run each new one in the SQL editor)
  functions/    delete-user edge function
```

### Spark Season (gamification)

Streak 🔥, XP bar, 5 ⚡ sparks (1 per pairing, +1 every 20 min), Question of the Day,
daily quests, and a campus League tab. Chats have a Spark meter — the other person's
interests, optional profile photo, name and course unlock at 3/8/16/26 messages.
At stage 5 both people privately pick **Match or Pass**; only a mutual Match makes the
friendship permanent. Backend lives in `supabase/patch-2026-10-06-spark-season.sql`
(also appended to `schema.sql` §11).

For an existing Supabase project, apply
`supabase/patch-2026-11-12-profile-photos.sql` before deploying this version.
It requires `my_blocks()` from `patch-2026-11-10-block-status.sql`.
Fresh installations can run `schema.sql` alone.

