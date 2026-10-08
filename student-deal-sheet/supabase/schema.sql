create extension if not exists pgcrypto;

create table if not exists public.week7_case_submissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  group_names text not null check (char_length(group_names) between 1 and 160),
  case_id text not null check (case_id in ('A', 'B', 'C')),
  case_about text not null check (char_length(case_about) between 1 and 300),
  what_happened text not null check (char_length(what_happened) between 1 and 1800),
  first_reaction text not null check (char_length(first_reaction) between 1 and 500),
  question_answers text check (
    question_answers is null or char_length(question_answers) between 1 and 3000
  ),
  figure_selections text[] not null default '{}' check (
    cardinality(figure_selections) between 0 and 10
  ),
  edit_token_hash text not null check (char_length(edit_token_hash) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists week7_case_submissions_updated_at_idx
  on public.week7_case_submissions (updated_at desc);

alter table public.week7_case_submissions enable row level security;

revoke all on table public.week7_case_submissions from anon, authenticated;
grant all on table public.week7_case_submissions to service_role;

comment on table public.week7_case_submissions is
  'MCOM 2010 Week 7 group responses. Accessed only by the server-side service role.';
