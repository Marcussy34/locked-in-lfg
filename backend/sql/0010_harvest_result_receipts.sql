-- Manual/scheduler harvest receipts for Ichor accrual into LockVault.

create table if not exists lesson.harvest_result_receipts (
  wallet_address text not null,
  course_id text not null references lesson.courses(id) on delete cascade,
  harvest_id text not null,
  harvested_at timestamptz not null,
  gross_yield_amount bigint not null,
  applied boolean,
  reason text,
  platform_fee_amount bigint,
  redirected_amount bigint,
  ichor_awarded bigint,
  lock_vault_status text not null default 'pending',
  lock_vault_published_at timestamptz,
  lock_vault_last_error text,
  lock_vault_transaction_signature text,
  created_at timestamptz not null default now(),
  primary key (wallet_address, course_id, harvest_id),
  check (gross_yield_amount >= 0),
  check (platform_fee_amount is null or platform_fee_amount >= 0),
  check (redirected_amount is null or redirected_amount >= 0),
  check (ichor_awarded is null or ichor_awarded >= 0),
  check (lock_vault_status in ('pending', 'publishing', 'published', 'failed'))
);

create index if not exists harvest_result_receipts_harvested_at_idx
  on lesson.harvest_result_receipts (harvested_at desc);
