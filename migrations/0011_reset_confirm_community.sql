-- Password reset, confirmed newsletter opt-in, case discussion, problem reports,
-- and ECG images stored in the database (Vercel cannot write files at runtime).

create table if not exists password_resets (
  token_hash text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_user_idx on password_resets (user_id, created_at desc);

-- Double opt-in: notify_new_cases only turns true once the address is confirmed.
alter table users add column if not exists notify_confirm_token text;
create unique index if not exists users_notify_confirm_idx on users (notify_confirm_token) where notify_confirm_token is not null;

create table if not exists case_comments (
  id text primary key,
  case_id text not null references cases (id) on delete cascade,
  user_id text not null references users (id) on delete cascade,
  parent_id text references case_comments (id) on delete cascade,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists case_comments_case_idx on case_comments (case_id, created_at);

create table if not exists comment_reports (
  id text primary key,
  comment_id text not null references case_comments (id) on delete cascade,
  user_id text not null references users (id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create table if not exists problem_reports (
  id text primary key,
  user_id text references users (id) on delete set null,
  case_id text,
  message text not null,
  reply_email text,
  created_at timestamptz not null default now()
);

create table if not exists case_images (
  case_id text primary key references cases (id) on delete cascade,
  content_type text not null,
  data bytea not null,
  updated_at timestamptz not null default now()
);

-- Publishing needs the author to confirm the trace is de-identified and cleared for use.
alter table cases add column if not exists consent_confirmed boolean not null default false;
update cases set consent_confirmed = true where id = 'c-week-1';
