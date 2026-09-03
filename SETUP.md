# Testify — Full Setup Guide

Everything needed to take this repository to a running production instance.

## 1. Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) account (free tier works)
- The Supabase CLI: `npm i -g supabase` (or `npx supabase …`)
- Optional: an OpenAI **or** Anthropic API key (for AI features), a Resend API key (for invitation emails)

## 2. Create & link the Supabase project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

(Project ref is in your Supabase dashboard URL: `https://supabase.com/dashboard/project/<ref>`.)

## 3. Apply the database schema

```bash
supabase db push
```

This runs the three migrations in `supabase/migrations/`:

1. `…_initial_schema.sql` — 16 tables, constraints, indexes, `updated_at` triggers
2. `…_auth_rls_rpc.sql` — auth trigger, privilege-escalation guard, helper functions,
   RPCs (`accept_invitation`, `start_mcq_attempt`, `submit_mcq_attempt`, `log_audit`,
   `get_platform_stats`), and **55 RLS policies**
3. `…_storage_realtime.sql` — 4 storage buckets + policies, realtime publication, default platform settings

Load the sample data (30 interview questions + 20 MCQs):

```bash
supabase db push --include-seed
```

or run `supabase/seed.sql` in the SQL editor.

## 4. Deploy the Edge Functions

```bash
supabase functions deploy generate-question
supabase functions deploy generate-interview
supabase functions deploy analyze-answer
supabase functions deploy transcribe-response
supabase functions deploy analyze-video
supabase functions deploy calculate-interview-result
supabase functions deploy generate-report
supabase functions deploy send-interview-invitation
supabase functions deploy admin-users
```

> `verify_jwt` is intentionally `false` in `config.toml` so CORS preflights succeed — **every function
> verifies the JWT itself in code** (`_shared/auth.ts`) and enforces ownership/role checks.

## 5. Set the server-side secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-...          # enables AI questions/analysis + Whisper transcription
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   # alternative AI provider
supabase secrets set AI_PROVIDER=openai             # optional: openai | anthropic (auto-detected otherwise)
supabase secrets set AI_MODEL=gpt-4o-mini           # optional model override
supabase secrets set RESEND_API_KEY=re_...          # optional: emails interview invitations
supabase secrets set EMAIL_FROM="Testify <invites@yourdomain.com>"   # optional
supabase secrets set APP_URL=https://your-app-domain.com             # used in invitation links
```

**None of these ever reach the browser.** Missing keys degrade honestly:

| Missing secret | Behavior |
|---|---|
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | AI features show a clear "provider not configured" screen; question-bank practice still works; MCQs fully work |
| `OPENAI_API_KEY` only | Server-side Whisper transcription unavailable; live in-browser Web Speech transcription still works |
| `RESEND_API_KEY` | Invitations are created with a copyable link instead of an email |

## 6. Configure the frontend

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Dashboard → Project Settings → API>
```

Only the public anon key ships to browsers — every table is protected by RLS.

## 7. Auth configuration (dashboard)

- **Authentication → URL Configuration**: set Site URL to your app URL and add it to Redirect URLs
  (password-reset emails link to `/reset-password`).
- Email confirmation on/off is your choice; the register screen handles both flows.

## 8. Create the first admin

Register normally in the app, then in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@yourcompany.com';
```

(Client-side role escalation is blocked by a database trigger; this SQL path — or another admin using
the Users page — is the only way to grant admin.)

## 9. Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Deploy `dist/` to any static host (Vercel/Netlify/Cloudflare Pages). Add a SPA fallback rewrite
(`/* → /index.html`).

## Production notes

- **Rate limiting**: edge functions use an in-memory sliding window (per instance). For strict
  multi-instance limits, back `_shared/rateLimit.ts` with Redis/Upstash or a Postgres table.
- **WebRTC (live interviews)**: signaling runs over Supabase Realtime with public STUN. Networks with
  symmetric NAT need a TURN server — add credentials to `RTC_CONFIG` in `src/services/webrtcService.ts`
  (e.g. Twilio NTS, Cloudflare Calls, or coturn). Question sync + transcript keep working regardless.
- **Timing integrity**: interview timers anchor to the database `started_at`; MCQ selection, scoring,
  and elapsed-time calculation are fully server-side (SECURITY DEFINER RPCs) — answer keys never reach
  the browser before submission.
- **PDF reports**: "Download PDF" uses the browser's print pipeline with a dedicated print stylesheet;
  swap in a server-side renderer later if you need headless generation.
- **Suspended accounts**: blocked in the UI on load and rejected by every edge function (`ACCOUNT_SUSPENDED`).
