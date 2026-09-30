-- The Lab. Application tables. Identity stays in Better Auth's "user" table.
-- users.id is that verified id. Never accept a user id from the browser.

create table if not exists users (
  id text primary key,
  first_name text not null,
  email text not null unique,
  role text not null check (role in ('learner', 'admin')),
  workplace_type text,
  years_experience integer,
  created_at timestamptz not null default now()
);

create table if not exists cases (
  id text primary key,
  title text not null,
  month integer not null,
  week integer not null,
  slot_type text not null,
  vignette text not null,
  ecg_image text not null,
  answer_key jsonb not null default '{}'::jsonb,
  scored_steps jsonb not null default '[]'::jsonb,
  model_impression text not null default '',
  teaching_point text not null default '',
  retrieval_month integer,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'feedback')),
  chest_pain boolean not null default false,
  provenance text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists submissions (
  id text primary key,
  user_id text not null references users (id),
  case_id text not null references cases (id),
  answers jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, case_id)
);

create index if not exists submissions_user_id_idx on submissions (user_id);
create index if not exists submissions_case_id_idx on submissions (case_id);

create table if not exists focus_requests (
  id text primary key,
  user_id text not null references users (id),
  topic text not null,
  why_it_matters text not null,
  reply_email text,
  created_at timestamptz not null default now()
);

create index if not exists focus_requests_user_id_idx on focus_requests (user_id);

create table if not exists case_suggestions (
  id text primary key,
  user_id text not null references users (id),
  summary text not null,
  teaching_point text not null,
  fits text not null,
  contributor_name text not null,
  contributor_role text not null,
  consent boolean not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists case_suggestions_user_id_idx on case_suggestions (user_id);

insert into cases (
  id, title, month, week, slot_type, vignette, ecg_image, answer_key, scored_steps,
  model_impression, teaching_point, retrieval_month, status, chest_pain, provenance
) values (
  'c-week-1',
  'Week 1',
  1,
  1,
  'undifferentiated',
  $vignette$63yr old male
1 week indigestion
8hrs chest discomfort
Presented to ED with 4/10 central chest pain$vignette$,
  '/week-1.jpg',
  '{}'::jsonb,
  '["rate","rhythm","p","pr","qrs","q","st","t","qtc"]'::jsonb,
  '',
  '',
  null,
  'draft',
  true,
  'Photograph of a 12-lead supplied for teaching. The printed header was removed, including the machine interpretation and the recorded age, sex and location.'
) on conflict (id) do nothing;
