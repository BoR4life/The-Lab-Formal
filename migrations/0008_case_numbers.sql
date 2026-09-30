-- Cases are numbered, not scheduled. No weekly cadence: a case stays open
-- once published, and the newest one is shown first.
alter table cases add column if not exists case_number integer not null default 0;
alter table cases alter column month set default 0;
alter table cases alter column week set default 0;

update cases set case_number = 1, title = 'Case 1' where id = 'c-week-1';
