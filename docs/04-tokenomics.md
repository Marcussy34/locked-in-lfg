# Hard Cap and In-App Currency Economics (Needs Revision)

## What This Is

The economic design of the in-app currency in a centralized backend model: how fast units are created, how fast they are burned, and whether the system stays sustainable long-term.

## Current Design

- **Earning rate:** 0.1–0.4 fragments per lesson, daily cap of 1 full unit per user.
- **Burn rate:** 1 unit per day per active Flame.
- **Wallet cap:** 7–14 units per user (prevents hoarding).
- **Transferability:** No. Units are non-tradeable and non-transferable.
- **Global cap:** Not currently defined.

## What Needs Revision

### 1. Global Supply Policy
- Should there be a hard cap on total units issued, or a soft cap via emission decay?
- Without any cap, burn rate is the only inflation control.
- With a strict cap, we need a plan for what happens when issuance approaches limits.

### 2. Earning vs Burning Balance
- Current baseline is roughly break-even for active users (earn ~1/day, burn 1/day).
- Missed days create net loss pressure quickly.
- Need to decide whether this pressure is intentionally strict or should be softened.

### 3. Multi-User Dynamics
- At scale, daily issuance can become very large.
- Burn also scales with active usage, but behavior variance can skew supply.
- Need simulations for active, inconsistent, and churned cohorts.

### 4. Cosmetic Sink Tuning
- Cosmetics are an additional unit sink.
- If pricing is too aggressive, the system feels punitive.
- If pricing is too low, sink is ineffective.

### 5. Saver Recovery Impact
- Recovery mode pauses unit earning while burn continues.
- This is intentional pressure but can snowball after misses.
- Need guardrails so one bad stretch does not force permanent failure loops.

## Where Solana Fits In

- Solana remains the source of truth for real-money flows (USDC deposits, vault state, yield, community pot).
- In-app currency economics are enforced by backend rules and ledger processing.
- If needed later, periodic snapshots or proofs can be anchored on-chain for auditability.

## Open Questions

1. Hard cap, soft cap, or uncapped with dynamic emission?
2. Should average earn rate exceed burn rate? By how much?
3. How should wallet cap scale by user progression?
4. Should cosmetic spend return any gameplay benefit or remain a pure sink?
5. Should in-app currency balance influence yield multipliers directly, or stay independent?

## Related Files

- `src/stores/tokenStore.ts` — current earning and cap logic
- `src/stores/flameStore.ts` — current burn logic
- `src/types/token.ts` — in-app currency data structure
