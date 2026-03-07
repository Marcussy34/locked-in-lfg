alter table lesson.user_course_runtime_state
  add column if not exists lock_account_address text,
  add column if not exists stable_mint text,
  add column if not exists principal_amount bigint not null default 0,
  add column if not exists skr_locked_amount bigint not null default 0,
  add column if not exists lock_start_at timestamptz,
  add column if not exists lock_end_at timestamptz;

create index if not exists user_course_runtime_state_lock_account_idx
  on lesson.user_course_runtime_state (lock_account_address)
  where lock_account_address is not null;

create table if not exists lesson.unlock_indexer_state (
  program_id text primary key,
  last_signature text,
  last_slot bigint,
  updated_at timestamptz not null default now()
);
