# Timer and Yield Product

## What This Is

The user-facing yield product experience — a combination of the lockup timer (countdown to unlock), real-time yield display, and the ability to extend the lockup period. This is "the same as the OG one" (the original locked-in concept) plus the new extend lockup feature.

## Current State

The yield store tracks locked amount, APY (8% default), and accrued yield locally. The profile screen shows wallet address, locked amount, and yield earned. There's no countdown timer, no real-time ticking yield display, and no extend lockup functionality.

## How It Should Work

### The Timer
1. Shows a countdown to the user's unlock date (when their locked USDC becomes withdrawable).
2. Displays days, hours, minutes remaining in the lock period.
3. The timer is prominent — visible on the profile screen and potentially in the 3D hub (on the character or a clock object).
4. When the timer reaches zero, the user can withdraw their principal plus accrued yield.

### The Yield Display
1. A real-time ticking counter showing yield accruing in USDC.
2. Updates every second (or visually interpolates between actual calculation intervals).
3. Shows: current daily rate, total accrued, projected total at unlock, and any penalties applied.
4. The ticking creates a satisfying "money growing" feeling — a key motivator to keep the Flame alive.

### Extend Lockup Period
1. Users can voluntarily extend their lockup beyond the original commitment date.
2. Extending means: new unlock date is pushed further into the future.
3. Benefits of extending could include: slightly higher APY, bonus Fuel, leaderboard score multiplier, or cosmetic rewards.
4. Extending is also used as a penalty: when a user exhausts all savers and misses a day, the lockup is automatically extended (e.g., by 7 days).
5. The user should see a clear comparison: current unlock date vs. new unlock date, and what benefits the extension provides.

### Penalty-Triggered Extension
- When all 3 savers are used and the user misses another day: streak breaks.
- Consequence: 100% yield is redirected to community pot AND lockup period extends.
- The extension length could be fixed (e.g., +7 days) or proportional to the severity.
- The user is notified immediately and sees their timer reset with the new, later unlock date.

## Where Solana Fits In

- The lock end date is stored on-chain in the user's vault PDA account. The timer reads this value.
- Extending the lockup is an on-chain transaction — the user signs a transaction that updates their vault's lock end date.
- Penalty-triggered extensions are initiated by the backend (authorized by the program to update vault state when streak conditions are met).
- The yield display reads from the on-chain vault state (locked amount, lock start, APY) and calculates accrual client-side for real-time display.
- Actual yield credits happen periodically on-chain (via crank), but the display interpolates between these for smooth UX.

## Key Considerations

- The timer and yield display are primarily UI/UX features — they read on-chain state and present it attractively.
- The extend lockup feature needs clear UX: what are the benefits? Is it voluntary or forced? What does the user gain?
- Penalty extensions could feel punishing. The messaging should frame it as "your deposit is still safe, you just need more time to prove commitment" rather than "you're being penalized."
- Consider minimum and maximum extension periods (e.g., extend by at least 7 days, no more than 90 days total lockup).
- The ticking yield counter should be visually prominent and satisfying — this is one of the main dopamine drivers.

## Related Files

- `src/stores/yieldStore.ts` — yield calculation logic
- `src/screens/main/ProfileScreen.tsx` — shows wallet and yield info
- `src/stores/streakStore.ts` — streak/saver state that triggers penalties
