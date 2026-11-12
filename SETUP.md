# Yuujin Circle — Setup Guide

Everything you need to go from zero to swiping. ~10 minutes.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign up / log in.
2. **New project** → name it `yuujin-circle` (anything works).
3. Set a **Database Password** (save it somewhere — you won't need it daily, but keep it).
4. Choose a region close to Chennai (e.g. `ap-south-1` / Mumbai or Singapore) → **Create**.
5. Wait ~2 minutes for provisioning.

---

## 2. Run the database schema

1. In the Supabase dashboard open **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this project, copy **the entire file**, paste it in.
3. Click **Run**. You should see `Success. No rows returned`.
4. Verify in **Table Editor**: `profiles`, `likes`, `matches`, `messages`, `reports`, `blocks` exist.

This one script created:

- All 6 tables + indexes + enums
- **Email-domain lock** — a trigger on `auth.users` that rejects any signup whose email isn't
  `@snuchennai.edu.in` (server-side, not just UI validation)
- Auto-created stub profile on signup
- **RLS policies** on every table
- RPCs: `submit_like()` (atomic like + match) and `get_discover_profiles()`
- The `profile-photos` storage bucket + policies (users can only write in their own folder)
- Realtime enabled for `messages`

---

## 3. Configure authentication

In Supabase → **Authentication**:

1. **Providers → Email**: ensure **Email** is enabled. You can leave "Confirm email" ON.
   > Magic links and confirmations use the same template — set the template's link to
   > `{{ .SiteURL }}` based if you customized it; the default works.
2. **URL Configuration**:
   - **Site URL**: `http://localhost:5173`
   - **Redirect URLs** — add:
     - `http://localhost:5173/**`
     - `http://localhost:5173/auth/callback`
     - `http://localhost:5173/verify`
3. **Rate limits** (Authentication → Rate Limits): keep the default; if you test a lot with one
   email, note there's an hourly email rate limit (~2-4 emails/hour on free plan with the built-in
   mailer).

> 💡 **Testing tip**: on the free plan the built-in email service sends slowly and has hourly
> limits. For real testing, add your own SMTP (Project Settings → Auth → SMTP) or use
> [Resend](https://resend.com) (free tier). For quick dev you can also
> **Authentication → Users → Add user** to create test users directly (they skip the email), then
> use "Send magic link" from the user's ⋯ menu.

---

## 4. Connect the app

1. In Supabase → **Project Settings** (⚙️ gear, bottom of sidebar):
   - **INTEGRATIONS → Data API**: copy **Project URL** (`https://xxxx.supabase.co`)
   - **API Keys**: copy the **Publishable key** (`sb_publishable_...`) — or from the
     "Legacy anon, service_role API keys" tab, the **anon public** key (`eyJ...`). Both work.
   - ⚠️ Never the `service_role` / `sb_secret_...` key — that bypasses RLS entirely.
2. In the project root, copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

3. Fill it in:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
   ```

4. Restart the dev server if it's running (env vars are read at startup).

---

## 5. Run the app

```bash
npm install
npm run dev
```

Open http://localhost:5173. You should see the landing page. Sign in with any
`@snuchennai.edu.in` address — on the free built-in mailer the email arrives from
`noreply@mail.app.supabase.io`.

> If you don't receive the email: check spam, wait a minute, and check
> **Authentication → Logs** in Supabase. Also confirm the Redirect URLs from step 3.

---

## 6. Deploy the delete-user function (recommended)

"Delete account" needs elevated rights to remove the auth user. Deploy once:

```bash
npm i -g supabase        # if you don't have the CLI
supabase login
supabase functions deploy delete-user --project-ref YOUR_PROJECT_REF
```

Until this is deployed, the in-app "Delete account" button will show an error — everything else
works fine without it.

---

## 7. Production notes (when you're ready)

- Put the app on Vercel/Netlify, then update **Site URL** + **Redirect URLs** in Supabase to your
  real domain, and redeploy the function with `--no-verify-jwt=false` (default).
- **Custom SMTP**: Project Settings → Auth → SMTP — required for reliable delivery at scale.
- **Custom domain** for auth emails looks far more trustworthy for students.
- The schema's `enforce_college_email()` trigger is your hard guarantee — even a leaked anon key
  can't let non-SNUC emails in.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Only @snuchennai.edu.in emails can sign up" | You're using another address — that's the domain lock working. |
| Magic link opens app but says "Couldn't sign you in" | Redirect URL mismatch. Recheck step 3. |
| Photos fail to upload | Did you run `schema.sql`? The `profile-photos` bucket is created by it. |
| "Match not found" when opening chat | The match was deleted (e.g. block) or you're not a participant. |
| Realtime messages don't appear | Confirm `messages` is in the `supabase_realtime` publication (schema adds it) and you ran the whole schema. |
| Delete account errors | Deploy the `delete-user` function (step 6). |
