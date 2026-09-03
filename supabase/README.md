# Testify - Supabase Backend

Complete Supabase backend for the Testify AI interview/assessment platform:
3 SQL migrations (schema, RLS + RPCs, storage + realtime), seed data, and
9 Deno edge functions sharing a `_shared/` toolkit.

## Layout

```
supabase/
  config.toml                  # project config; verify_jwt=false per function (JWT checked in code)
  seed.sql                     # 30 interview questions + 20 MCQs (created_by NULL)
  migrations/
    20260903000100_initial_schema.sql   # tables, RLS enabled, indexes, updated_at triggers
    20260903000200_auth_rls_rpc.sql     # helper fns, auth trigger, all policies, RPCs
    20260903000300_storage_realtime.sql # buckets + storage policies, realtime, default settings
  functions/
    _shared/                   # cors, response envelope, auth, rate limit, validation, audit, ai/
    generate-question/         # adaptive AI question generation
    generate-interview/        # create interview + question set (bank or AI)
    analyze-answer/            # AI answer scoring + ai_analysis persistence
    transcribe-response/       # Whisper transcription of recordings-bucket audio
    analyze-video/             # deterministic observable-only video summary
    calculate-interview-result/# aggregate scores -> interview_results
    generate-report/           # full report JSON (+ optional AI narrative)
    send-interview-invitation/ # tokenized invite + optional Resend email
    admin-users/               # admin: change_role / suspend / activate / delete
```

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) v1.200+ (`supabase --version`)
- A Supabase project (note its project ref from the dashboard URL)
- Optional: an OpenAI and/or Anthropic API key (AI features), a Resend API key (emails)

## 1. Link and push the database

```bash
supabase login
supabase link --project-ref <your-project-ref>

# Apply the three migrations to the remote database
supabase db push
```

Local development instead: `supabase start` then `supabase db reset`
(reset applies migrations **and** `seed.sql` automatically).

## 2. Seed data (remote)

Either include the seed with the push:

```bash
supabase db push --include-seed
```

or run it directly with psql (connection string from the dashboard:
Settings -> Database):

```bash
psql "postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" -f supabase/seed.sql
```

The seed uses fixed UUIDs + `on conflict do nothing`, so re-running is safe.

## 3. Secrets for edge functions

```bash
supabase secrets set \
  OPENAI_API_KEY=sk-... \
  ANTHROPIC_API_KEY=sk-ant-... \
  AI_PROVIDER=openai \
  AI_MODEL=gpt-4o-mini \
  RESEND_API_KEY=re_... \
  EMAIL_FROM="Testify <invites@yourdomain.com>" \
  APP_URL=https://app.yourdomain.com
```

All are optional; behavior without them:

| Secret | Missing means |
| --- | --- |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | AI endpoints return `503 AI_NOT_CONFIGURED`; `generate-interview` still works with `use_question_bank: true`; `transcribe-response` returns `503 TRANSCRIPTION_NOT_CONFIGURED` (browser speech recognition still works) |
| `AI_PROVIDER` | auto-detects by whichever key exists (OpenAI preferred) |
| `AI_MODEL` | defaults: `gpt-4o-mini` (OpenAI) / `claude-sonnet-5` (Anthropic) |
| `RESEND_API_KEY` | invitations are created and returned with `invite_url`, `email_sent: false` |
| `APP_URL` | invite links point at `http://localhost:5173` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
into edge functions automatically - do not set them manually.

## 4. Deploy the functions

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

(Recent CLI versions can deploy everything at once: `supabase functions deploy`.)

`config.toml` sets `verify_jwt = false` for each function **only** so the CORS
preflight (which has no `Authorization` header) succeeds; every function then
verifies the JWT itself via `requireUser()` and returns
`401 UNAUTHORIZED` otherwise. All functions respond with the envelope
`{ success, data, error }`.

## 5. Create the first admin

Signup metadata can never grant admin (the auth trigger coerces any other
value to `candidate`). Promote your account with SQL (Dashboard -> SQL editor,
runs as service role):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

After that, the `admin-users` function and `get_platform_stats()` RPC work for
that account, and further role changes can go through `admin-users`.

## Key RPCs (call via `supabase.rpc(...)` from the frontend)

- `accept_invitation(p_token)` - candidate accepts an invite; returns interview id.
- `start_mcq_attempt(p_category, p_difficulty, p_count, p_interview_id)` -
  returns `{ attempt_id, time_limit_seconds, questions[] }` **without** correct
  answers (candidates cannot read `mcq_questions` directly).
- `submit_mcq_attempt(p_attempt_id, p_answers)` - server-side scoring; returns
  the full per-question breakdown with explanations.
- `get_platform_stats()` - admin-only counters.
- `log_audit(p_action, ...)` - append an audit trail entry as the caller.

## Production notes

- **Rate limiting** in `_shared/rateLimit.ts` is an in-memory sliding window,
  i.e. per edge-runtime instance and reset on cold starts. For hard
  guarantees, back it with a durable store (Upstash Redis or a Postgres
  counter table). Defaults: 30 req/min per user, 15 req/min for AI functions.
- **WebRTC/TURN**: live video interviews need a TURN/STUN server (e.g. coturn,
  Twilio NTS). That infrastructure is out of scope for this backend; the
  `recordings` bucket + `recordings` table only store the resulting media.
- **CORS** is `Access-Control-Allow-Origin: *` on the functions; restrict it to
  your app origin in `_shared/cors.ts` when you lock down production.
- Buckets: `avatars` (public, 5MB), `resumes` (private, 10MB),
  `recordings` (private, 200MB, path `{candidate_id}/{interview_id}/...`),
  `reports` (private, 20MB, path `{interview_id}/...`). Storage policies
  depend on those path conventions.
