-- Idempotent receipt log for fuel-to-ichor conversions.

create table if not exists lesson.fuel_conversion_receipts (
  wallet_address text not null,
  course_id text not null,
  conversion_id text not null,
  converted_at timestamptz not null,
  applied boolean not null,
  fuel_before integer not null,
  fuel_after integer not null,
  fuel_amount integer not null,
  ichor_gained bigint not null default 0,
  lock_vault_status text not null default 'pending',
  lock_vault_published_at timestamptz,
  lock_vault_last_error text,
  lock_vault_transaction_signature text,
  created_at timestamptz not null default now(),
  primary key (wallet_address, course_id, conversion_id),
  check (fuel_before >= 0),
  check (fuel_after >= 0),
  check (fuel_amount > 0),
  check (ichor_gained >= 0),
  check (lock_vault_status in ('pending', 'publishing', 'published', 'failed'))
);
