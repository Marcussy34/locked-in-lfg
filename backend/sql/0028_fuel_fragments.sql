-- Add fuel fragment tracking columns to runtime state.
-- Fragments accumulate per day (0.00–1.00). When >= 1.0, one integer fuel is credited on-chain.

ALTER TABLE lesson.user_course_runtime_state
  ADD COLUMN IF NOT EXISTS fuel_fragments_today numeric(4,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fuel_fragments_day date;
