# Yield Calculator

## What This Is

A component that calculates and displays how much yield (in USDC) a user is earning on their locked deposit. It shows real-time accrual, projected earnings, and the impact of penalties from missed streaks.

## Current State

The yield store (`yieldStore.ts`) has basic calculation logic: daily yield = (locked amount × APY) / 365. It tracks total accrued yield, forfeited yield, and whether yield is currently active (Flame must be lit). The default APY is 8%. Penalty tiers exist (10%, 20%, 20%, 100% redirect) but aren't connected to real on-chain state.

## How It Should Work

1. User deposits and locks USDC into the vault contract.
2. Yield begins accruing immediately based on the locked amount and the current APY.
3. The yield calculator shows:
   - Daily yield rate (how much they earn per day)
   - Total accrued yield so far
   - Projected yield for the remaining lock period
   - Any penalties applied (yield redirected to community pot due to saver usage)
4. Yield only accrues while the Flame is active (LIT or BURNING state). If the Flame goes COLD, accrual pauses.
5. When streaks are broken or savers are used, a percentage of yield is redirected to the community pot.

### Penalty Escalation
- 1st saver used: 10% of yield redirected to community pot
- 2nd saver used: 20% redirected
- 3rd saver used: 20% redirected
- No savers left + miss a day: 100% yield redirected + lockup period extended

## Where Solana Fits In

- The locked amount is stored on-chain in the vault program (PDA per user).
- The yield calculation itself can be done off-chain (backend or client-side) based on the on-chain locked amount and timestamps.
- Actual yield distribution happens on-chain — the vault program (or a crank/automation) periodically credits yield to the user's claimable balance.
- Penalty enforcement should be on-chain to prevent manipulation — the program reads streak state and applies the correct redirect percentage.
- The community pot is an on-chain account that receives redirected yield.

## Key Considerations

- APY source: where does the yield actually come from? Options include: platform treasury, DeFi strategies on locked deposits, or a fixed subsidy model. This affects whether APY is variable or fixed.
- The calculator should clearly separate "earned yield" from "claimable yield" (yield you can actually withdraw).
- Yield should be displayed in real-time with a ticking counter to create a dopamine effect — watching money grow.
- Need to handle edge cases: what if APY changes mid-lockup? What if the user extends their lock?
- The calculator is a display component — it reads state and does math. The actual yield logic lives in the vault contract and yield service.

## Related Files

- `src/stores/yieldStore.ts` — current yield tracking (mocked)
- `src/types/yield.ts` — YieldData and PenaltyInfo types
- `src/stores/streakStore.ts` — streak and saver state (determines penalties)
