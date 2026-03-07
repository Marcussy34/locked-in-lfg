alter table lesson.harvest_result_receipts
  add column if not exists community_pot_status text not null default 'pending',
  add column if not exists community_pot_published_at timestamptz,
  add column if not exists community_pot_last_error text,
  add column if not exists community_pot_transaction_signature text,
  add column if not exists community_pot_window_id bigint;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'harvest_result_receipts_community_pot_status_check'
  ) then
    alter table lesson.harvest_result_receipts
      drop constraint harvest_result_receipts_community_pot_status_check;
  end if;
end $$;

alter table lesson.harvest_result_receipts
  add constraint harvest_result_receipts_community_pot_status_check
    check (community_pot_status in ('pending', 'publishing', 'published', 'failed'));
