-- Tracks devnet faucet claims per wallet (rate limiting)
CREATE TABLE IF NOT EXISTS lesson.faucet_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  sol_signature text,
  usdc_signature text,
  sol_amount_lamports bigint NOT NULL DEFAULT 0,
  usdc_amount_atomic bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faucet_claims_wallet
  ON lesson.faucet_claims (wallet_address, created_at DESC);
