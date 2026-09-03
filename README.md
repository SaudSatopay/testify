<p align="center">
  <img src="https://img.shields.io/badge/Testify-6366F1?style=for-the-badge&logoColor=white" alt="Testify" />
</p>

# Testify

**Smarter Interviews. Better Decisions.**

Testify is an AI-powered interview, assessment, mock-interview, and candidate-evaluation platform:

- 🎯 **AI mock interviews** — adaptive questions for 14+ roles, with follow-ups that reference your previous answers, live transcription, and per-answer AI analysis
- 🎥 **Live video interviews** — WebRTC video, screen sharing, synced questions, shared live transcript, interviewer notes and scoring
- ✅ **MCQ assessments** — 16 categories, timed, mark-for-review, server-side scoring with explanations
- 🧠 **AI analysis** — relevance, technical accuracy, communication, clarity, structure, speaking pace, filler words, and an honest, observable-signals-only confidence indicator
- 📊 **Dashboards & reports** — role-based dashboards, progress charts, printable candidate reports
- 🔐 **Security first** — Supabase Auth, Row Level Security on every table, server-side scoring, audited admin actions, consent-gated recording

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS · shadcn/ui-style components · Recharts ·
Supabase (Auth, Postgres, Storage, Realtime, Edge Functions) · OpenAI/Anthropic (pluggable provider)

## Quick start

```bash
npm install
cp .env.example .env       # fill in your Supabase URL + anon key
npm run dev
```

Without a configured Supabase project the app renders a guided setup screen instead of breaking.
**Full backend setup (database, storage, edge functions, secrets): see [SETUP.md](SETUP.md).**

## Project layout

```
src/
  components/     UI primitives (ui/), layout, interview room pieces, tables, editors, reports
  pages/          public/ candidate/ interviewer/ admin/ route components (all lazy-loaded)
  hooks/          auth, theme, media devices, speech recognition, assessment monitor, async data
  services/       Supabase data services, edge-function API client, WebRTC, recording,
                  modular VideoAnalysisService (browser implementation, provider-swappable)
  integrations/   typed Supabase client + database definitions
  lib/            constants, formatting, utilities
supabase/
  migrations/     schema, RLS policies, RPCs, storage buckets, realtime config
  functions/      9 edge functions + shared modules (AI provider abstraction, auth, rate limiting)
  seed.sql        30 interview questions + 20 MCQs of sample data
```

## Roles

| Role | Registers via | Capabilities |
|---|---|---|
| Candidate | `/register` | practice AI mocks, take MCQs, join live interviews, view results & AI feedback |
| Interviewer | `/register` | create/schedule interviews, question & MCQ banks, invite candidates, run live panels, score, reports |
| Admin | SQL grant only | user management, all interviews/questions, analytics, audit logs, platform settings |

The admin role can never be self-assigned — a database trigger coerces any requested role except
`candidate`/`interviewer` back to `candidate`, and role changes go through a server-verified edge function.

## AI ethics, honestly

- Recording requires explicit consent; video-signal analysis has a **separate, optional** consent.
- Video analysis reports **observable signals only** (camera presence, approximate eye-contact
  indicator, head movement) — provider prompts explicitly forbid inferring protected characteristics,
  personality, honesty, or emotions.
- The confidence indicator is labeled as an AI communication indicator, never a psychological measurement.
- If no AI provider is configured, the app says so and degrades honestly — no fake results, ever.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | strict type-check + production build |
| `npm run preview` | preview the production build |
