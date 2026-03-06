# Fuel — Earn and Burn Economy

## What This Is

Fuel is the in-app utility currency that powers the Flame system. Users earn Fuel fragments by completing lessons. Full Fuel units are burned at a rate of 1 per day to keep the Flame alive. While the Flame burns, yield accrues on the user's locked deposit.

Fuel is non-tradeable and non-transferable. It is a game mechanic, not an on-chain asset.

## Current State

Fuel is currently tracked in local state via Zustand (`tokenStore.ts`). Users earn fragments (0.1–0.4 per lesson), which consolidate into full units. There is a daily earning cap of 1 and a wallet cap of 7–14.

## How It Should Work

### Earning (Credit)
1. User completes a lesson and scores above a threshold.
2. Backend validates completion and calculates fragment reward.
3. Fuel fragments are credited to the user's account.
4. Fragments consolidate into full Fuel when they reach 1.0.
5. Daily earning is capped at 1 full Fuel. Wallet can hold 7–14 max.

### Spending (Burn)
1. The Flame consumes 1 Fuel per day automatically.
2. Users can manually feed extra Fuel to build a buffer.
3. Fuel spent on cosmetics (Flame skins, room decorations) is burned.
4. Burned Fuel is removed permanently from the user's balance.

### The Earn-Burn Cycle
- Earning brings Fuel in.
- Daily Flame burn pulls Fuel out.
- Users must keep learning to keep earning and keep the Flame lit.
- If earning stops, Fuel runs out and the Flame dies.

## Architecture Decision

Fuel should be a centralized backend service, not an SPL token.

- Source of truth: backend ledger + balances table.
- Client cache: Zustand `tokenStore.ts` mirrors backend state.
- Ledger model: append-only credit/debit entries with reason codes (`lesson_reward`, `daily_burn`, `cosmetic_purchase`, `manual_feed`).
- Idempotency: use per-action IDs so retries cannot double-credit or double-burn.
- Auditing: keep immutable history for dispute/debug and anti-cheat checks.

No Fuel mint address or token account is required.

## Where Solana Fits In

- Keep real-money flows on-chain: USDC deposits, vault accounting, yield, and community pot.
- Keep Fuel off-chain for instant, free, high-frequency game actions.
- If needed later, backend can pass signed Fuel-derived outcomes to on-chain instructions.

## Key Considerations

- Run daily burn as an idempotent backend job (cron + catch-up logic).
- Enforce caps server-side, not just in client state.
- Keep anti-cheat checks on lesson completion before reward credits.
- Expose read APIs for balance and ledger history so UI stays transparent.
- Design schema so Fuel can be migrated on-chain later if requirements change.

## Related Files

- `src/stores/tokenStore.ts` — local Fuel tracking cache
- `src/types/token.ts` — Fuel balance and history types
- `src/stores/flameStore.ts` — Flame system that burns Fuel daily
