-- Add LockVault publish lifecycle tracking for burn and miss receipts.

alter table lesson.fuel_burn_cycle_receipts
  add column if not exists lock_vault_status text not null default 'pending',
  add column if not exists lock_vault_published_at timestamptz,
  add column if not exists lock_vault_last_error text,
  add column if not exists lock_vault_transaction_signature text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'fuel_burn_cycle_receipts_lock_vault_status_check'
  ) then
    alter table lesson.fuel_burn_cycle_receipts
      drop constraint fuel_burn_cycle_receipts_lock_vault_status_check;
  end if;
end $$;

alter table lesson.fuel_burn_cycle_receipts
  add constraint fuel_burn_cycle_receipts_lock_vault_status_check
    check (lock_vault_status in ('pending', 'publishing', 'published', 'failed'));

alter table lesson.miss_consequence_receipts
  add column if not exists lock_vault_status text not null default 'pending',
  add column if not exists lock_vault_published_at timestamptz,
  add column if not exists lock_vault_last_error text,
  add column if not exists lock_vault_transaction_signature text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'miss_consequence_receipts_lock_vault_status_check'
  ) then
    alter table lesson.miss_consequence_receipts
      drop constraint miss_consequence_receipts_lock_vault_status_check;
  end if;
end $$;

alter table lesson.miss_consequence_receipts
  add constraint miss_consequence_receipts_lock_vault_status_check
    check (lock_vault_status in ('pending', 'publishing', 'published', 'failed'));
