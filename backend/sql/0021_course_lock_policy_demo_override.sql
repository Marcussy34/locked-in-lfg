alter table lesson.courses
  add column if not exists demo_principal_amount_usdc numeric(12, 2);

update lesson.courses
set demo_principal_amount_usdc = 1
where demo_principal_amount_usdc is null;

alter table lesson.courses
  drop constraint if exists courses_demo_principal_valid;

alter table lesson.courses
  add constraint courses_demo_principal_valid
    check (
      demo_principal_amount_usdc is null
      or (
        demo_principal_amount_usdc > 0
        and (
          max_principal_amount_usdc is null
          or demo_principal_amount_usdc <= max_principal_amount_usdc
        )
      )
    );
