-- ============================================================================
-- Testify - Migration 1: core schema, indexes, updated_at triggers
-- Target: Supabase (PostgreSQL 15+)
-- ============================================================================

-- pgcrypto provides gen_random_bytes() (used for invitation tokens).
-- Supabase ships extensions into the "extensions" schema.
create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  role text not null default 'candidate' check (role in ('candidate', 'interviewer', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  phone text,
  bio text,
  resume_url text,
  skills jsonb not null default '[]',
  experience_years integer,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile for each auth.users row. Created by the on_auth_user_created trigger.';

-- ----------------------------------------------------------------------------
-- interviews
-- ----------------------------------------------------------------------------
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('ai_mock', 'live', 'mcq', 'technical', 'mixed')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  job_role text,
  scheduled_at timestamptz,
  duration_minutes integer not null default 30,
  started_at timestamptz,
  ended_at timestamptz,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.interviews.settings is 'JSONB keys used by the app: monitoring_enabled bool, video_analysis_enabled bool, question_count int, experience_years int, mcq_category text, mcq_question_count int, notes_visible_to_candidate bool.';

-- ----------------------------------------------------------------------------
-- questions (interview question bank; created_by NULL = system/seed rows)
-- ----------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  category text not null,
  question text not null,
  question_type text not null check (question_type in ('behavioral', 'hr', 'technical', 'situational', 'coding', 'mcq')),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  expected_topics jsonb not null default '[]',
  ideal_answer text,
  time_limit_seconds integer not null default 180,
  is_ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- interview_questions (ordered join: interview <-> question)
-- ----------------------------------------------------------------------------
create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  order_number integer not null default 1,
  created_at timestamptz not null default now(),
  unique (interview_id, question_id)
);

-- ----------------------------------------------------------------------------
-- responses (a candidate's answer to one question of one interview)
-- ----------------------------------------------------------------------------
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  question_text text,
  text_answer text,
  audio_url text,
  video_url text,
  transcript text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- mcq_questions (multiple-choice question bank)
-- ----------------------------------------------------------------------------
create table public.mcq_questions (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  category text not null,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('a', 'b', 'c', 'd')),
  explanation text,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'expert')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- mcq_attempts (interview_id NULL = free practice attempt)
-- ----------------------------------------------------------------------------
create table public.mcq_attempts (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references public.interviews(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  category text,
  difficulty text,
  question_ids uuid[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score numeric,
  total_questions integer not null default 0,
  correct_answers integer not null default 0,
  time_taken_seconds integer,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- mcq_answers (one row per question of an attempt; selected_option NULL = skipped)
-- ----------------------------------------------------------------------------
create table public.mcq_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mcq_attempts(id) on delete cascade,
  question_id uuid not null references public.mcq_questions(id) on delete cascade,
  selected_option text check (selected_option in ('a', 'b', 'c', 'd')),
  is_correct boolean not null default false,
  marked_for_review boolean not null default false,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ----------------------------------------------------------------------------
-- ai_analysis (per-response AI assessment; response_id NULL = interview-level)
-- ----------------------------------------------------------------------------
create table public.ai_analysis (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  response_id uuid references public.responses(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  answer_relevance numeric,
  technical_accuracy numeric,
  communication_score numeric,
  clarity_score numeric,
  structure_score numeric,
  confidence_indicator numeric,
  speaking_pace numeric,
  filler_word_count integer,
  eye_contact_indicator numeric,
  facial_expression_summary text,
  voice_analysis_summary text,
  strengths jsonb not null default '[]',
  weaknesses jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  summary text,
  overall_score numeric,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- interview_results (aggregated final result per interview+candidate)
-- ----------------------------------------------------------------------------
create table public.interview_results (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  technical_score numeric,
  communication_score numeric,
  confidence_score numeric,
  problem_solving_score numeric,
  behavioral_score numeric,
  mcq_score numeric,
  overall_score numeric,
  recommendation text,
  summary text,
  strengths jsonb not null default '[]',
  weaknesses jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (interview_id, candidate_id)
);

-- ----------------------------------------------------------------------------
-- interviewer_notes
-- ----------------------------------------------------------------------------
create table public.interviewer_notes (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  interviewer_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- interview_invitations
-- ----------------------------------------------------------------------------
create table public.interview_invitations (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  candidate_email text not null,
  candidate_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- recordings
-- ----------------------------------------------------------------------------
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  candidate_id uuid references public.profiles(id) on delete cascade,
  video_url text,
  audio_url text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- assessment_events (proctoring/monitoring events: tab switch, focus loss, ...)
-- ----------------------------------------------------------------------------
create table public.assessment_events (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- audit_logs
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- platform_settings (key/value; nothing sensitive is stored here)
-- ----------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_by uuid,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security: enabled on every table (policies arrive in migration 2,
-- so between the two migrations the tables are locked down, not exposed).
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.interviews enable row level security;
alter table public.questions enable row level security;
alter table public.interview_questions enable row level security;
alter table public.responses enable row level security;
alter table public.mcq_questions enable row level security;
alter table public.mcq_attempts enable row level security;
alter table public.mcq_answers enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.interview_results enable row level security;
alter table public.interviewer_notes enable row level security;
alter table public.interview_invitations enable row level security;
alter table public.recordings enable row level security;
alter table public.assessment_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_settings enable row level security;

-- ============================================================================
-- Indexes
-- ============================================================================
create index idx_interviews_candidate_id on public.interviews (candidate_id);
create index idx_interviews_created_by on public.interviews (created_by);
create index idx_interviews_status on public.interviews (status);
create index idx_interviews_scheduled_at on public.interviews (scheduled_at);
create index idx_responses_interview_id on public.responses (interview_id);
create index idx_responses_candidate_id on public.responses (candidate_id);
create index idx_ai_analysis_interview_id on public.ai_analysis (interview_id);
create index idx_ai_analysis_response_id on public.ai_analysis (response_id);
create index idx_interview_results_candidate_id on public.interview_results (candidate_id);
create index idx_interview_results_interview_id on public.interview_results (interview_id);
create index idx_interview_questions_interview_id on public.interview_questions (interview_id);
create index idx_mcq_attempts_candidate_id on public.mcq_attempts (candidate_id);
create index idx_mcq_attempts_interview_id on public.mcq_attempts (interview_id);
create index idx_mcq_answers_attempt_id on public.mcq_answers (attempt_id);
create index idx_questions_category on public.questions (category);
create index idx_questions_question_type on public.questions (question_type);
create index idx_questions_created_by on public.questions (created_by);
create index idx_mcq_questions_category on public.mcq_questions (category);
create index idx_mcq_questions_created_by on public.mcq_questions (created_by);
create index idx_audit_logs_user_id on public.audit_logs (user_id);
create index idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index idx_assessment_events_interview_id on public.assessment_events (interview_id);
create index idx_interviewer_notes_interview_id on public.interviewer_notes (interview_id);
create index idx_interview_invitations_interview_id on public.interview_invitations (interview_id);
create index idx_interview_invitations_candidate_email on public.interview_invitations (candidate_email);

-- ============================================================================
-- updated_at maintenance
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_interviews_set_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

create trigger trg_questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create trigger trg_mcq_questions_set_updated_at
  before update on public.mcq_questions
  for each row execute function public.set_updated_at();

create trigger trg_platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();
