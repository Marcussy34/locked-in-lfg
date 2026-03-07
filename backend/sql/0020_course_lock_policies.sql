alter table lesson.courses
  add column if not exists min_principal_amount_usdc numeric(12, 2) not null default 10,
  add column if not exists max_principal_amount_usdc numeric(12, 2),
  add column if not exists min_lock_duration_days integer not null default 30,
  add column if not exists max_lock_duration_days integer not null default 90;

update lesson.courses
set
  min_principal_amount_usdc = case difficulty
    when 'advanced' then 100
    when 'intermediate' then 25
    else 10
  end,
  max_principal_amount_usdc = case difficulty
    when 'advanced' then null
    when 'intermediate' then 250
    else 100
  end,
  min_lock_duration_days = case difficulty
    when 'advanced' then 90
    when 'intermediate' then 30
    else 10
  end,
  max_lock_duration_days = case difficulty
    when 'advanced' then 365
    when 'intermediate' then 90
    else 30
  end
where
  min_principal_amount_usdc = 10
  and max_principal_amount_usdc is null
  and min_lock_duration_days = 30
  and max_lock_duration_days = 90;

alter table lesson.courses
  drop constraint if exists courses_min_principal_positive,
  drop constraint if exists courses_max_principal_valid,
  drop constraint if exists courses_lock_duration_range_valid;

alter table lesson.courses
  add constraint courses_min_principal_positive
    check (min_principal_amount_usdc > 0),
  add constraint courses_max_principal_valid
    check (
      max_principal_amount_usdc is null
      or max_principal_amount_usdc >= min_principal_amount_usdc
    ),
  add constraint courses_lock_duration_range_valid
    check (
      min_lock_duration_days > 0
      and max_lock_duration_days >= min_lock_duration_days
    );
