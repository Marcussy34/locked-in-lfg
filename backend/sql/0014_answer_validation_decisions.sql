create table if not exists lesson.answer_validation_decisions (
  lesson_attempt_id uuid not null references lesson.user_lesson_attempts(id) on delete cascade,
  question_id text not null references lesson.questions(id) on delete cascade,
  validator_mode text not null,
  validator_version text not null,
  accepted boolean not null,
  score integer not null,
  prompt_snapshot text not null,
  learner_answer text,
  rubric_snapshot jsonb not null default '{}'::jsonb,
  criteria_breakdown jsonb not null default '[]'::jsonb,
  integrity_flags jsonb not null default '[]'::jsonb,
  feedback_summary text not null,
  decision_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (lesson_attempt_id, question_id),
  check (score >= 0 and score <= 100)
);

create index if not exists answer_validation_decisions_question_idx
  on lesson.answer_validation_decisions (question_id, created_at desc);

create unique index if not exists user_question_attempts_attempt_question_uidx
  on lesson.user_question_attempts (lesson_attempt_id, question_id);
