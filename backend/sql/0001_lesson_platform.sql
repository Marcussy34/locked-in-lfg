-- Lesson Platform v1 schema
-- Scope: courses/modules/lessons, publishing snapshots, and per-wallet lesson progress.

create extension if not exists pgcrypto;

create schema if not exists lesson;

-- ---------- Content model (editorial write model) ----------
create table if not exists lesson.courses (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null,
  category text not null,
  difficulty text not null,
  image_url text,
  estimated_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (difficulty in ('beginner', 'intermediate', 'advanced')),
  check (category in ('solana', 'web3', 'defi', 'security', 'rust'))
);

create table if not exists lesson.modules (
  id text primary key,
  slug text not null,
  title text not null,
  description text not null,
  difficulty text not null,
  estimated_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (difficulty in ('beginner', 'intermediate', 'advanced'))
);

-- Supports reusing one module in multiple courses.
create table if not exists lesson.course_modules (
  course_id text not null references lesson.courses(id) on delete cascade,
  module_id text not null references lesson.modules(id) on delete cascade,
  module_order integer not null,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (course_id, module_id)
);

create unique index if not exists course_modules_course_order_idx
  on lesson.course_modules (course_id, module_order);

create index if not exists course_modules_module_id_idx
  on lesson.course_modules (module_id);

create table if not exists lesson.lessons (
  id text primary key,
  slug text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lessons_slug_idx
  on lesson.lessons (slug);

create table if not exists lesson.module_lessons (
  module_id text not null references lesson.modules(id) on delete cascade,
  lesson_id text not null references lesson.lessons(id) on delete cascade,
  lesson_order integer not null,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (module_id, lesson_id)
);

create unique index if not exists module_lessons_module_order_idx
  on lesson.module_lessons (module_id, lesson_order);

create index if not exists module_lessons_lesson_id_idx
  on lesson.module_lessons (lesson_id);

create table if not exists lesson.publish_releases (
  id uuid primary key default gen_random_uuid(),
  release_name text not null,
  notes text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists lesson.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references lesson.lessons(id) on delete cascade,
  version integer not null,
  state text not null default 'draft',
  release_id uuid references lesson.publish_releases(id) on delete set null,
  changelog text,
  source_fingerprint text,
  created_by text not null,
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  published_at timestamptz,
  unique (lesson_id, version),
  check (state in ('draft', 'in_review', 'published', 'archived'))
);

-- Partial index keeps published read paths fast.
create index if not exists lesson_versions_published_idx
  on lesson.lesson_versions (lesson_id, published_at desc)
  where state = 'published';

create table if not exists lesson.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_version_id uuid not null references lesson.lesson_versions(id) on delete cascade,
  block_order integer not null,
  block_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (lesson_version_id, block_order),
  check (block_type in ('paragraph', 'code', 'callout', 'image'))
);

create index if not exists lesson_blocks_lesson_version_idx
  on lesson.lesson_blocks (lesson_version_id, block_order);

create table if not exists lesson.questions (
  id text primary key,
  lesson_version_id uuid not null references lesson.lesson_versions(id) on delete cascade,
  question_order integer not null,
  question_type text not null,
  prompt text not null,
  correct_answer text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (lesson_version_id, question_order),
  check (question_type in ('mcq', 'short_text'))
);

create index if not exists questions_lesson_version_idx
  on lesson.questions (lesson_version_id, question_order);

create table if not exists lesson.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references lesson.questions(id) on delete cascade,
  option_order integer not null,
  option_text text not null,
  created_at timestamptz not null default now(),
  unique (question_id, option_order)
);

create index if not exists question_options_question_idx
  on lesson.question_options (question_id, option_order);

create table if not exists lesson.source_attributions (
  id uuid primary key default gen_random_uuid(),
  lesson_version_id uuid not null references lesson.lesson_versions(id) on delete cascade,
  source_url text not null,
  source_repo text,
  source_ref text,
  source_license text,
  citation_note text,
  created_at timestamptz not null default now()
);

create index if not exists source_attributions_lesson_version_idx
  on lesson.source_attributions (lesson_version_id);

-- ---------- Read model (published snapshot for mobile delivery) ----------
create table if not exists lesson.published_modules (
  release_id uuid not null references lesson.publish_releases(id) on delete cascade,
  course_id text not null references lesson.courses(id) on delete cascade,
  module_id text not null references lesson.modules(id) on delete cascade,
  module_order integer not null,
  payload jsonb not null,
  primary key (release_id, course_id, module_id)
);

create index if not exists published_modules_lookup_idx
  on lesson.published_modules (course_id, module_order);

create table if not exists lesson.published_lessons (
  release_id uuid not null references lesson.publish_releases(id) on delete cascade,
  lesson_id text not null references lesson.lessons(id) on delete cascade,
  module_id text not null references lesson.modules(id) on delete cascade,
  lesson_version_id uuid not null references lesson.lesson_versions(id) on delete restrict,
  lesson_order integer not null,
  payload jsonb not null,
  primary key (release_id, lesson_id)
);

create index if not exists published_lessons_module_lookup_idx
  on lesson.published_lessons (module_id, lesson_order);

create table if not exists lesson.published_lesson_payloads (
  release_id uuid not null references lesson.publish_releases(id) on delete cascade,
  lesson_id text not null references lesson.lessons(id) on delete cascade,
  payload jsonb not null,
  content_hash text not null,
  primary key (release_id, lesson_id)
);

-- ---------- User progress ----------
create table if not exists lesson.user_course_enrollments (
  wallet_address text not null,
  course_id text not null references lesson.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (wallet_address, course_id)
);

create index if not exists user_course_enrollments_course_idx
  on lesson.user_course_enrollments (course_id);

create table if not exists lesson.user_lesson_progress (
  wallet_address text not null,
  lesson_id text not null references lesson.lessons(id) on delete cascade,
  completed boolean not null default false,
  score integer,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (wallet_address, lesson_id),
  check (score is null or (score >= 0 and score <= 100))
);

create index if not exists user_lesson_progress_completed_idx
  on lesson.user_lesson_progress (wallet_address, completed)
  where completed = true;

create table if not exists lesson.user_lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  lesson_id text not null references lesson.lessons(id) on delete cascade,
  lesson_version_id uuid not null references lesson.lesson_versions(id) on delete restrict,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score integer,
  accepted boolean,
  check (score is null or (score >= 0 and score <= 100))
);

create index if not exists user_lesson_attempts_wallet_idx
  on lesson.user_lesson_attempts (wallet_address, started_at desc);

create index if not exists user_lesson_attempts_lesson_idx
  on lesson.user_lesson_attempts (lesson_id, started_at desc);

create table if not exists lesson.user_question_attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_attempt_id uuid not null references lesson.user_lesson_attempts(id) on delete cascade,
  question_id text not null references lesson.questions(id) on delete cascade,
  answer_text text,
  is_correct boolean,
  created_at timestamptz not null default now()
);

create index if not exists user_question_attempts_attempt_idx
  on lesson.user_question_attempts (lesson_attempt_id);

-- ---------- Content ops ----------
create table if not exists lesson.ingestion_sources (
  id text primary key,
  source_name text not null,
  source_url text not null,
  source_type text not null,
  is_active boolean not null default true,
  allowlisted boolean not null default false,
  created_at timestamptz not null default now(),
  check (source_type in ('github_repo', 'docs_site', 'markdown_feed'))
);

create table if not exists lesson.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references lesson.ingestion_sources(id) on delete restrict,
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  check (status in ('queued', 'running', 'succeeded', 'failed'))
);

create index if not exists ingestion_jobs_source_status_idx
  on lesson.ingestion_jobs (source_id, status, created_at desc);

create table if not exists lesson.ingestion_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references lesson.ingestion_jobs(id) on delete cascade,
  source_path text not null,
  status text not null default 'queued',
  normalized_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  check (status in ('queued', 'processed', 'failed', 'skipped'))
);

create index if not exists ingestion_job_items_job_idx
  on lesson.ingestion_job_items (job_id, status);

create table if not exists lesson.content_review_tasks (
  id uuid primary key default gen_random_uuid(),
  lesson_version_id uuid not null references lesson.lesson_versions(id) on delete cascade,
  reviewer text,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status in ('pending', 'approved', 'changes_requested'))
);

create index if not exists content_review_tasks_status_idx
  on lesson.content_review_tasks (status, created_at);

-- ---------- Row-level security baseline ----------
alter table lesson.user_course_enrollments enable row level security;
alter table lesson.user_lesson_progress enable row level security;
alter table lesson.user_lesson_attempts enable row level security;
alter table lesson.user_question_attempts enable row level security;

-- JWT must include wallet_address claim for write/read isolation.
create policy user_course_enrollments_wallet_policy
  on lesson.user_course_enrollments
  using ((current_setting('request.jwt.claim.wallet_address', true)) = wallet_address)
  with check ((current_setting('request.jwt.claim.wallet_address', true)) = wallet_address);

create policy user_lesson_progress_wallet_policy
  on lesson.user_lesson_progress
  using ((current_setting('request.jwt.claim.wallet_address', true)) = wallet_address)
  with check ((current_setting('request.jwt.claim.wallet_address', true)) = wallet_address);

create policy user_lesson_attempts_wallet_policy
  on lesson.user_lesson_attempts
  using ((current_setting('request.jwt.claim.wallet_address', true)) = wallet_address)
  with check ((current_setting('request.jwt.claim.wallet_address', true)) = wallet_address);

create policy user_question_attempts_wallet_policy
  on lesson.user_question_attempts
  using (
    exists (
      select 1
      from lesson.user_lesson_attempts attempts
      where attempts.id = lesson.user_question_attempts.lesson_attempt_id
        and attempts.wallet_address = current_setting('request.jwt.claim.wallet_address', true)
    )
  )
  with check (
    exists (
      select 1
      from lesson.user_lesson_attempts attempts
      where attempts.id = lesson.user_question_attempts.lesson_attempt_id
        and attempts.wallet_address = current_setting('request.jwt.claim.wallet_address', true)
    )
  );
