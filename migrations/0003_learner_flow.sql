-- Stage 2: autosave, server-side scoring, and case governance fields.

alter table submissions add column if not exists status text not null default 'submitted'
  check (status in ('in_progress', 'submitted'));
alter table submissions add column if not exists score_per_step jsonb not null default '{}'::jsonb;
alter table submissions add column if not exists total_score numeric;
alter table submissions add column if not exists started_at timestamptz not null default now();
alter table submissions add column if not exists submitted_at timestamptz;
alter table submissions add column if not exists updated_at timestamptz not null default now();

alter table cases add column if not exists author text not null default '';
alter table cases add column if not exists verified_by text not null default '';
alter table cases add column if not exists learning_outcomes text not null default '';
alter table cases add column if not exists step_reasons jsonb not null default '{}'::jsonb;
