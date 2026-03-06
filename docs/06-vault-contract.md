# Custom Vault Contract with Yield

## What This Is

The core on-chain program (smart contract) that holds user deposits, manages lockup periods, distributes yield, and enforces penalties. It contains two pots: a community pot (funded by penalized yield, distributed to active users) and an operational runway pot (platform revenue for upkeep and development).

## Current State

No on-chain program exists yet. The vault logic is entirely mocked in local Zustand stores. The `yieldStore.ts` tracks locked amounts and yield calculations locally. The `src/services/solana/` directory is empty and waiting for implementation.

## How It Should Work

### Deposit and Locking
1. User selects a course and chooses how much USDC to lock.
2. The app builds a transaction that transfers USDC from the user's wallet into a vault PDA (Program Derived Address) controlled by the program.
3. The program creates a user vault account (PDA) that stores: locked amount, lock start date, lock end date, yield accrued, penalty history.
4. The USDC is now locked — the user cannot withdraw it until the lock period ends.

### Yield Distribution
1. Yield accrues daily based on the user's locked amount and the current APY.
2. A backend crank (or on-chain automation like Clockwork) periodically runs to calculate and credit yield.
3. Credited yield goes into the user's claimable balance within the vault.
4. Users can claim their accrued yield at any time (or it auto-claims at lock expiry).

### Two Pots

**Community Pot:**
- Funded by penalized yield from users who miss streaks or use savers.
- Distributed monthly to active streak holders, weighted by (streak length × deposit size).
- Acts as a reward pool for consistent users — the penalty from one user becomes the bonus for another.

**Operational Runway Pot:**
- Funded by a platform fee (percentage of all yield, e.g., 10–20%).
- Used for platform development, infrastructure costs, and operational expenses.
- This is the business model — the platform takes a cut of yield to sustain itself.

### Extend Lockup Period
- Users can choose to extend their lockup period beyond the original commitment.
- Extending resets or extends the unlock date.
- This may come with benefits: higher APY, bonus Fuel, or leaderboard multipliers.
- Also used as a penalty mechanism: when a user breaks their streak with no savers left, the lockup is automatically extended.

## Where Solana Fits In

This is the most Solana-heavy feature. The vault is an Anchor program deployed on Solana.

- **PDAs (Program Derived Addresses):** Each user's vault is a PDA derived from the program ID and the user's wallet address. The community pot and operational pot are also PDAs.
- **SPL Token Integration:** The program interacts with the SPL Token program to transfer USDC from user wallets into vault PDAs and to distribute yield.
- **Account Structure:** The program manages several account types: UserVault (per user), CommunityPot (global), OperationalPot (global), and ProgramConfig (global settings like APY, fee percentage).
- **Instructions:** The program exposes instructions for: deposit, withdraw (after lock expiry), claim yield, extend lockup, update streak status (called by backend), distribute community pot.
- **Security:** The program must validate that only authorized parties can trigger yield distribution and streak updates. Users can only interact with their own vaults.

## Key Considerations

- The yield source is critical: where does the USDC for yield come from? If it's from a DeFi strategy (lending, staking), the vault needs to integrate with that protocol. If it's subsidized, there needs to be a treasury.
- Time-based calculations on Solana use `Clock::get()` for the current Unix timestamp. Lock periods and yield accrual are calculated from this.
- Community pot distribution needs a fair algorithm — streak length × deposit size is the current plan, but this heavily favors large depositors.
- The program should be upgradeable initially (Anchor's default) to allow bug fixes and parameter adjustments. Can be made immutable later.
- Gas costs: each interaction is a Solana transaction. Batching yield distributions for multiple users in one transaction saves costs.
- Consider rent exemption — vault PDAs need enough SOL to be rent-exempt.

## Related Files

- `src/services/solana/` — empty, where vault service integration should live
- `src/stores/yieldStore.ts` — current mocked yield logic
- `src/screens/onboarding/DepositScreen.tsx` — deposit UI (currently mocked)
