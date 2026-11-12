# Handoff — Yuujin Circle (SNUC Campus Dating)

This handoff records the state before the design and profile-photo update. For the
new avatar storage and the rollout steps, see **SETUP.md**.

Written 2026-11-12 to hand this project to another developer/assistant. Read this before touching
the code: the **live database, not the repository, is the source of truth for what has actually been
run**, and the two were out of sync until today.

---

## 1. What the app is

A college-only dating/friendship app for Shiv Nadar University Chennai (`@snuchennai.edu.in`).
Mobile-first React SPA.

- React 18 + Vite + TypeScript, Tailwind CSS v4, framer-motion, lucide-react
- Supabase: magic-link Auth, Postgres with RLS on every table, Storage (`profile-photos`), Realtime
- Flow: onboarding → random pairing ("Meet") → chat with a 5-stage Spark reveal → Match/Pass endgame
  → permanent friendship in "Friends"
- Gamification ("Spark Season"): XP, streak, 5 sparks (⚡, one per pairing, +1 per 20 min),
  Question of the Day, campus League

```
src/
  components/  AppShell, ConfirmDialog, SparkMeter, CartoonAvatar, Skeleton, Logo…
  contexts/    AuthContext, ToastContext, PresenceContext
  lib/         supabase client, database.types.ts, gamification, constants, format, media, cartoon
  pages/       Landing, AuthCallback, Verify, Onboarding, Meet, Friends, Chat, League, Profile
supabase/
  schema.sql   full schema (idempotent)
  patch-*.sql  incremental patches, run in order in the SQL editor
  functions/   delete-user edge function
```

Design system: dark surface, serif display headings (`.display-*`), tokens/classes `.card`, `.chip`,
`.label`, `.lead`, `.stat`, `.btn-primary`, `.btn-ghost`, `.input`, `.rise` (framer entrance). Match
existing classes rather than inventing new styling.

Run it: `npm install && npm run dev` → http://localhost:5173. Env lives in `.env.local`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); **never commit or paste that file** — it holds the
project URL and anon key.

---

## 2. Live database state

Project ref `fudootxupyceihkavztz` (region ap-southeast-2), reachable at
`https://fudootxupyceihkavztz.supabase.co`.

Until 2026-11-12 this project was **three patches behind** the repository: it had the avatar patch
and the random-pairing tables, but no prompts, no presence, no read tracking, no unread counts, no
unmatch, no spark columns, no QOTD or match-choice tables, and no gamification triggers. The app
therefore failed at runtime in several places (`unread_counts` and `unmatch` returned 404,
`profiles.last_seen` returned 400). That drift is now fixed by running, in this order, as the
`postgres` role:

| Order | Source | Result |
|---|---|---|
| 1 | `patch-2026-11-10-block-status.sql` | `public.my_blocks()` created |
| 2 | `patch-2026-09-22.sql` | prompts, last_seen, read_at, `mark_messages_read`, `unread_counts`, `who_liked_me`, `unmatch`, messages-update policy, profiles in realtime |
| 3 | `patch-2026-10-06-spark-season.sql` | xp/streak/energy columns + column-level revoke, `refresh_sparks`, `qotd_answers` (+policy, trigger), `match_choices` (+policy), `submit_match_choice`, XP triggers, `matches` in realtime |
| 4 | spark-cost body of `pair_me_randomly` | pairing now charges a spark and raises `OUT_OF_SPARKS` at zero |

`patch-2026-10-05-random-pairing.sql` needed nothing: `pairing_queue`, `friend_requests`, their
policies and the realtime entry already existed.

Verified after the fact: 19 functions in `public`, 5 triggers (`profiles_touch`, `on_message_posted`,
`on_match_created`, `on_friend_row_added`, `on_qotd_answered`), 4 realtime tables (`messages`,
`profiles`, `friend_requests`, `matches`), all new columns with the intended defaults, and
constraints / RLS-enabled tables / the `profile-photos` bucket already matching `schema.sql`.

Note: `patch-2026-11-10-block-status.sql` is **not** part of `schema.sql`. A fresh project set up
from `schema.sql` alone will not have `my_blocks()`.

Current data (tiny, this is effectively a dev project):

- 2 auth users / 2 profiles, referred to below as Subject1 (`47d76085-…`) and Subject2
  (`5aa9b8e7-…`). Their addresses are deliberately not recorded here.
- 1 match `8ea9e525-f172-4757-9793-3e28628ce86f` between them, 12 messages, 0 blocks,
  0 friend requests, 0 match choices, 0 QOTD answers
- Subject2 is the account whose session is stored in the local dev browser

---

## 3. Why `my_blocks()` exists

The RLS policy on `public.blocks` is `using (blocker_id = auth.uid())`, so a user can only see blocks
they created. The person who was blocked could not see the row, and the app therefore could not tell
"you blocked them" from "they blocked you". `my_blocks()` is a `security definer` function returning
both columns for any row involving the caller, which is the minimum needed to close that gap.

Client usage:

- `src/pages/Friends.tsx` — every pairing carries `blocked` plus `blockedByMe`; blocked pairings of
  either direction live in a bottom **Blocked** section, with direction-specific preview copy
  ("You blocked this person…" / "This person blocked you…"). Blocked rows show no presence dot, no
  unread badge, and are skipped by realtime inserts.
- `src/pages/Chat.tsx` — resolves both directions; when blocked, the composer and realtime
  subscription are skipped, `Block` is disabled, `Leave` stays available, and the read-only panel
  reads either "…and they can no longer reach you." or "…and you can no longer reach them."
- `Try closing again` only appears when the failed close was your own block (retrying `unmatch` is
  meaningless for their block).

---

## 4. What has been verified, and how

All live checks were done against project `fudootxupyceihkavztz` as the real signed-in Subject2
session, plus SQL run as `postgres`. Rows written for tests were removed afterwards; gamification
side effects were restored (XP 0, sparks 5).

- **`my_blocks` semantics.** With a block `Subject1 → Subject2`, calling as the blocked user:
  direct `select … from blocks` returns 0 rows (RLS hides it) while `my_blocks()` returns the pair.
  As the blocker both return 1 row. Anonymous calls return `200 []`.
- **Reverse block in the UI.** Friends shows "0 FRIENDS · 0 IN PROGRESS" plus a Blocked section with
  "This person blocked you. This chat is read-only."; the chat keeps all 12 messages readable, shows
  the closed-for-good panel, disables `Block`, and issues no `mark_messages_read`. Removing the block
  restores both pages.
- **Leave.** Clicked in the UI against a throwaway pairing: toast "Pairing closed.", redirect to
  Friends, only that match deleted, the real match untouched.
- **Block.** Clicked in the UI against a throwaway pairing: toast "Blocked. They will not turn up
  again.", one `blocks` row written and the match closed; the real match untouched.
- **Read receipts / unread counts.** `unread_counts()` reported 6 unread, `mark_messages_read()`
  cleared it to 0, and in the app the Friends header showed "6 UNREAD" / "6 NEW" that cleared after
  opening the chat (`read_at` set on the 6 incoming messages). Network log: `rpc/unread_counts` 200,
  `PATCH profiles` 204, `GET profiles?last_seen` 200 — all previously failing.
- **`unmatch`.** Returns `true` for a match you are in, `false` for one you are not (checked inside a
  rolled-back transaction, so the real match survived).

Not verified / caveats:

- No screenshot evidence. The preview browser reports `document.visibilityState === 'hidden'` and
  returns stale loading frames, so all UI checks above are DOM text + network inspection. Earlier
  blocker copies (`chat-blocked.png`, `friends-blocked3.png`) came from a throwaway mock harness.
- The reverse-block pass created the block with SQL rather than from the other account's client,
  so their insert path (RLS `blocks own insert`) was only exercised from Subject2's side.
- The `delete-user` edge function deployment status is unknown; account deletion may error until it
  is deployed.
- `read_at` is set on 6 messages and `last_seen` is set on Subject2 — normal app state left by the
  tests, not debris.

---

## 5. Open items

1. **No version control.** The project is not a git repository. `git init` and an initial commit is
   the obvious next step; `.gitignore` already excludes `node_modules`, `dist` and `.env*`.
2. **`my_blocks` is only in the patch file**, not in `schema.sql`. Fold it in so a fresh setup from
   `schema.sql` cannot miss it.
3. **Screenshots in the project root** (`*.png`) are scratch verification artefacts and can be
   deleted or moved to a `docs/` folder.
4. **The live project holds test data** (a greeting-only chat between two test accounts). Clear it
   before any real launch, and replace the magic-link Site URL / redirect URLs with the production
   domain.
5. **`revoke update (xp, streak_count, last_qotd_date, energy, energy_ts)`** is in force, matching
   the repository. Client code must never try to write those columns directly.

---

## 6. Conventions worth keeping

- Do only what is asked; no extra features, polish or refactors.
- Match the existing class contract and design tokens rather than adding new styling.
- No avatar/photorealistic avatar feature — the app deliberately uses the cartoon identity
  (`CartoonAvatar`, `lib/cartoon.ts`).
- Anything touching blocks should read through `my_blocks()`, never a direct `blocks` select.
- Verify with `npx tsc -b --pretty false` and `npm run build`; there is no test suite.

