-- Add explicit publish lifecycle tracking for LockVault completion relay.

alter table lesson.verified_completion_events
  add column if not exists transaction_signature text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'verified_completion_events_status_check'
  ) then
    alter table lesson.verified_completion_events
      drop constraint verified_completion_events_status_check;
  end if;
end $$;

alter table lesson.verified_completion_events
  add constraint verified_completion_events_status_check
    check (status in ('pending', 'publishing', 'published', 'failed'));
