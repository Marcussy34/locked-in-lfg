ALTER TABLE lesson.faucet_claims
  ADD COLUMN IF NOT EXISTS round integer NOT NULL DEFAULT 1;
