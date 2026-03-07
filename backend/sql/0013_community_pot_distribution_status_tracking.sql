alter table lesson.community_pot_distribution_snapshots
  add column if not exists distribution_transaction_signature text,
  add column if not exists distribution_last_error text,
  add column if not exists distributed_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'community_pot_distribution_snapshots_status_check'
  ) then
    alter table lesson.community_pot_distribution_snapshots
      drop constraint community_pot_distribution_snapshots_status_check;
  end if;
end $$;

alter table lesson.community_pot_distribution_snapshots
  add constraint community_pot_distribution_snapshots_status_check
    check (status in ('pending', 'publishing', 'distributed', 'failed'));
