-- Opt-in "new case" email. Consent is per account, off by default, and every
-- email carries a one-click unsubscribe link keyed by a private token.
alter table users add column if not exists notify_new_cases boolean not null default false;
alter table users add column if not exists unsubscribe_token text not null
  default (md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text));
create unique index if not exists users_unsubscribe_token_idx on users (unsubscribe_token);

create table if not exists case_emails (
  id serial primary key,
  case_id text not null references cases(id),
  subject text not null,
  recipients integer not null,
  sent_at timestamptz not null default now()
);

-- Authorship is the site owner's until a case says otherwise.
update cases set author = 'Brad Chesham, RN, MSc' where id = 'c-week-1';
