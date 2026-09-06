# Testify — Setup Guide (from zero)

This guide takes you from **nothing** to a fully working Testify instance with your **own free accounts**.
No prior Supabase experience needed — every step says exactly where to click and where each key comes from.

You will create two free accounts:

| Account | What it's for | Cost |
|---|---|---|
| [Supabase](https://supabase.com) | Database, login, file storage, server functions | Free tier |
| [Groq](https://console.groq.com) | The AI that asks questions & scores answers | Free tier, no card |

Total time: **about 30–40 minutes**.

---

## Step 0 — Get the code and the tools

1. Install **Node.js 18 or newer** from [nodejs.org](https://nodejs.org) (click the green LTS button, run the installer, keep all defaults).
2. Get the project:
   - **Easiest:** go to <https://github.com/SaudSatopay/testify> → green **Code** button → **Download ZIP** → extract it somewhere (e.g. `C:\testify`).
   - Or, if you have git: `git clone https://github.com/SaudSatopay/testify.git`

Don't run anything yet — the app needs the backend first.

---

## Step 1 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign up (GitHub login is easiest).
2. Click **New project**:
   - **Name:** `testify` (anything works)
   - **Database password:** click *Generate* and **save it somewhere** (you rarely need it, but don't lose it)
   - **Region:** pick the one closest to you
3. Click **Create new project** and wait ~2 minutes while it provisions.

### Get your two frontend keys

1. In the left sidebar: **Project Settings** (gear icon) → **API** (called **API Keys / Data API** in the newer dashboard).
2. Copy these two values into a notepad — you'll paste them into a file in Step 5:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon / public key** — a long string starting with `eyJ...`

> The anon key is *designed* to be public (it ends up in the website's code). All real security lives in the database rules you're about to install.

---

## Step 2 — Create the database

1. In the left sidebar click **SQL Editor** → **New query**.
2. On your computer, open the project folder → `supabase/migrations/`. There are **4 files**. For **each file, in this exact order**:
   1. `20260903000100_initial_schema.sql`
   2. `20260903000200_auth_rls_rpc.sql`
   3. `20260903000300_storage_realtime.sql`
   4. `20260904000100_mcq_categories.sql`

   → open the file in any text editor, **select all, copy**, paste into the SQL editor, press **Run** (Ctrl+Enter). Wait for *"Success. No rows returned"* before doing the next file.
3. Then do the same once more with `supabase/seed.sql` — this loads the sample content: **36 interview questions and 48 commerce MCQs** (accountancy, business studies, economics, finance, marketing, taxation, banking, business law).

That's the entire backend schema: 16 tables, 55+ security policies, scoring functions, storage buckets.

---

## Step 3 — Deploy the 9 Edge Functions

These are small server programs that talk to the AI. You'll paste each one through the dashboard (no command line needed).

1. Left sidebar → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. **Important:** the *Function name* box comes prefilled with a random name — **select it all and delete it**, then type the exact name from the list below.
3. Open the matching file from `supabase/dist-dashboard/` on your computer, copy **everything**, paste it over the editor's contents, and click **Deploy function**.
4. Repeat for all nine:

   | Function name | File to paste |
   |---|---|
   | `generate-question` | `supabase/dist-dashboard/generate-question.ts` |
   | `generate-interview` | `supabase/dist-dashboard/generate-interview.ts` |
   | `analyze-answer` | `supabase/dist-dashboard/analyze-answer.ts` |
   | `transcribe-response` | `supabase/dist-dashboard/transcribe-response.ts` |
   | `analyze-video` | `supabase/dist-dashboard/analyze-video.ts` |
   | `calculate-interview-result` | `supabase/dist-dashboard/calculate-interview-result.ts` |
   | `generate-report` | `supabase/dist-dashboard/generate-report.ts` |
   | `send-interview-invitation` | `supabase/dist-dashboard/send-interview-invitation.ts` |
   | `admin-users` | `supabase/dist-dashboard/admin-users.ts` |

5. For **each deployed function**: open it → **Details** (or the function's settings) → turn **OFF** the toggle called **"Verify JWT with legacy secret"**. (The functions check your login themselves, in code — the toggle would break browser requests.)

> If you ever edit the code in `supabase/functions/`, regenerate these paste-ready bundles with `node scripts/flatten-functions.mjs`, then re-paste and hit *Deploy updates*.

---

## Step 4 — Get a free AI key (Groq) and set the secrets

### Getting the key

1. Go to [console.groq.com](https://console.groq.com) → sign up (Google login works, **free, no credit card**).
2. Left menu → **API Keys** → **Create API Key** → give it any name → **copy the key now** (it starts with `gsk_` and is shown only once).

### Putting it into Supabase

In the Supabase dashboard: **Edge Functions** → **Secrets** → add these five, one at a time:

| Secret name | Value |
|---|---|
| `OPENAI_API_KEY` | your Groq key (`gsk_...`) |
| `OPENAI_BASE_URL` | `https://api.groq.com/openai/v1` |
| `AI_MODEL` | `openai/gpt-oss-120b` |
| `WHISPER_MODEL` | `whisper-large-v3` |
| `APP_URL` | `http://localhost:5173` (change later if you deploy) |

> Why "OPENAI_..." for a Groq key? Groq speaks the same API language as OpenAI, so Testify just points the OpenAI-style client at Groq's URL. The same trick works with Gemini or OpenRouter — swap the base URL, model name, and key. A paid OpenAI key works too: then leave `OPENAI_BASE_URL` and the model overrides out entirely.

**Optional:** `RESEND_API_KEY` + `EMAIL_FROM` (from [resend.com](https://resend.com), free tier) if you want interview invitations emailed; without it, invitations still work as copyable links.

---

## Step 5 — Configure sign-ins

1. **Authentication → Sign In / Providers → Email**: turn **OFF** "Confirm email".
   (Supabase's built-in mailer only sends ~2 emails/hour — with confirmation on, sign-ups get stuck.)
2. **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:5173`
   - **Redirect URLs:** add `http://localhost:5173/**`

---

## Step 6 — Run the app

1. In the project folder, **double-click `start-testify.bat`** (Windows).
   - First run: it installs dependencies, creates a `.env` file, and opens it in Notepad.
2. In that `.env`, paste your two values from Step 1:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...your anon key...
   ```

3. Save, close Notepad, and **double-click `start-testify.bat` again**. The app opens at <http://localhost:5173>.

(Mac/Linux: `npm install`, copy `.env.example` to `.env`, fill it, then `npm run dev`.)

---

## Step 7 — Make yourself admin

1. In the app, click **Get started** and register a normal account (pick any role).
2. Back in the Supabase **SQL Editor**, run (with your real email):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

3. Refresh the app — you now have the admin dashboard. (Self-serve role escalation is blocked by a database trigger; this SQL is the intended way to crown the first admin. After that, admins can promote others from the Users page.)

**Done!** Register a second account as a *candidate* in another browser to try mock interviews, MCQs, and live interviews end to end.

---

## Optional — Put it on the internet (free)

1. `npm i -g vercel`, then `vercel login`.
2. From the project folder: `vercel deploy --prod` (accept the defaults).
3. In Vercel → your project → **Settings → Environment Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as `.env`), then deploy again: `vercel deploy --prod`.
4. Update the URLs to your new domain:
   - Supabase **Authentication → URL Configuration**: Site URL + add `https://your-app.vercel.app/**` to Redirect URLs
   - Edge Function secret `APP_URL` → `https://your-app.vercel.app`

---

## If something doesn't work

| Symptom | Fix |
|---|---|
| "Couldn't fetch the first question" | A secret from Step 4 is missing/typo'd, or the model name is wrong. Check **Edge Functions → generate-question → Logs**. |
| "AI provider not configured" screen | `OPENAI_API_KEY` secret not set. |
| "email rate limit exceeded" on register | Step 5.1 not done (Confirm email still ON). |
| Sign-up works but pages are empty | Migrations ran out of order — re-run them in the Step 2 order (they're safe to re-run). |
| Mic/camera not working | Browser permissions; use Chrome/Edge on `http://localhost` or HTTPS. |
| MCQ "no questions" | `seed.sql` not run, or the category has no questions — the picker only lists categories that exist in your bank. |

## Production notes (advanced)

- **CLI alternative:** with the [Supabase CLI](https://supabase.com/docs/guides/cli) you can replace Steps 2–4 with `supabase link`, `supabase db push --include-seed`, `supabase functions deploy <name>` (×9), and `supabase secrets set ...`. Same result.
- **Rate limiting** in edge functions is per-instance (in-memory); back it with Redis/Upstash for strict multi-instance limits.
- **Live interviews (WebRTC)** use public STUN; corporate/symmetric-NAT networks need a TURN server — add credentials to `RTC_CONFIG` in `src/services/webrtcService.ts`.
- **Free-tier pausing:** Supabase pauses projects after ~1 week of inactivity — one click in the dashboard restores them.
- **Integrity:** MCQ selection & scoring are server-side (`SECURITY DEFINER` RPCs); answer keys never reach the browser; interview timers anchor to database timestamps; suspended accounts are rejected by every function.
