-- User XP tracking — cosmetic progression across all courses.
-- XP is awarded once per milestone (first lesson completion, module done, course done).

CREATE TABLE IF NOT EXISTS lesson.user_xp (
  wallet_address text PRIMARY KEY,
  xp_total integer NOT NULL DEFAULT 0,
  xp_level integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Log of XP events for auditability
CREATE TABLE IF NOT EXISTS lesson.user_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  xp_amount integer NOT NULL,
  source text NOT NULL,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_xp_events_wallet
  ON lesson.user_xp_events (wallet_address, created_at DESC);
