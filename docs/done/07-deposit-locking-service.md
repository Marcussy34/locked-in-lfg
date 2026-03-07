# Done: 07 Deposit and Locking Service

## Scope Completed

This checkpoint replaced the placeholder deposit path with a real devnet `LockVault` flow.
The mobile app now creates funded course locks on-chain, persists them across reconnects, exposes a live resurface card, and the repo includes lock inspection tooling for verification.
It now also treats each course as its own lock path instead of a global/shared deposit state.

## What Was Implemented

### Real deposit transaction builder

- The app now derives:
  - `ProtocolConfig` PDA
  - per-course `CoursePolicy` PDA
  - per-course `LockAccount` PDA
  - stable vault ATA
  - SKR vault ATA
- Deposit input is now built into the real `lock_funds(...)` instruction instead of a mock onboarding transition.

### Wallet signing and submission flow

- Deposit signing runs through mobile wallet approval.
- The app now signs with MWA and submits the serialized transaction itself.
- This removed the previous hang-prone wallet-side send path.
- The deposit builder now also passes a safe trailing placeholder for `owner_skr_token_account` when locking `0 SKR`, which fixes the live `USDC`-only deposit path on Anchor.
- The deposit screen now simulates `lock_funds` before wallet approval, so token-account and program-level errors surface in-app instead of only as a generic Phantom failure.
- The screen also shows current `SOL`, `USDC`, and `SKR` balances before deposit, and it defaults the new lock amount to `1 USDC` for devnet testing.
- The deposit screen is now scrollable on smaller phones.

### Course-specific lock flow

- After wallet connect, the user sees the course catalog first.
- Selecting a course now leads to that course's own deposit screen.
- Each course now has its own:
  - deposit bounds
  - demo override
  - lock duration range
  - on-chain `CoursePolicy` PDA
- The in-app course browser no longer uses the old mock activation path for available courses.
- Inactive course detail pages no longer let users open lessons before that specific course has been locked.
- The main app now treats only real locked courses as active/descendable.

### Live catalog expansion

- The live backend catalog now includes four lockable courses:
  - `solana-fundamentals`
  - `anchor-dev`
  - `rust-solana`
  - `defi-protocols`
- The current published starter lesson counts are:
  - `5` for Solana Fundamentals
  - `3` for Anchor Development
  - `3` for Rust for Solana
  - `3` for DeFi Protocols
- `scripts/sync-lock-vault-course-policies.mjs` can now sync every backend course policy row to devnet in one command.

### Devnet deployment and bootstrap

- `LockVault` is deployed on devnet.
- The protocol PDA is initialized with:
  - official devnet USDC mint
  - project SKR mint
  - canonical Fuel/saver config
- The current client flow is configured for `USDC + SKR` only.
- Live course policies are now also written on-chain for the published courses.

### Lock inspection tooling

- `scripts/inspect-lock-vault.mjs` can now read a live lock account from devnet.
- The script decodes:
  - principal
  - stable mint
  - lock start/end
  - gauntlet state
  - Fuel state
  - saver state
  - SKR amount and tier

### Unlock transaction builder

- The client now has a real `buildUnlockFundsTransaction(...)` helper.
- It derives the existing lock PDA and both owner/vault ATAs.
- It prepares the owner-signed `unlock_funds` instruction for the live resurface UI.

### Reconnect and lock-state recovery

- Reconnect now reconciles persisted onboarding state with the real locked course state.
- The app no longer drops a user back onto the deposit screen when a lock already exists.
- Fresh-device onboarding now also checks for an existing on-chain lock before attempting deposit, so the same wallet can resume its course from another phone without trying to create a duplicate lock PDA.

### Live resurface UI

- `Profile` now reads the live lock account from chain.
- It shows:
  - locked principal
  - locked SKR
  - unlock timestamp
  - current lock availability state
- `Unlock & Resurface` is only enabled when the program-derived lock is actually unlockable.

### Resurface receipt history

- The app now persists successful resurface receipts locally per wallet.
- Backend can now also discover real `unlock_funds` transactions from chain and store verified receipts without depending only on the app postback.
- A dedicated `Resurface Receipts` screen can show:
  - course title
  - returned principal
  - returned SKR
  - unlock target timestamp
  - actual unlock timestamp
  - transaction signature
- Successful unlocks now route into that receipt screen instead of dropping straight back to browsing.
- Runtime rows now persist lock metadata so the backend unlock indexer can resolve course/amount fields from chain-detected unlocks.

## Main Files

- `programs/lock_vault/src/lib.rs`
- `src/services/solana/lockVault.ts`
- `src/services/solana/walletService.ts`
- `src/screens/onboarding/DepositScreen.tsx`
- `src/screens/onboarding/CourseSelectionScreen.tsx`
- `src/stores/courseStore.ts`
- `src/types/courseState.ts`
- `scripts/init-lock-vault-protocol.mjs`
- `scripts/inspect-lock-vault.mjs`

## Verified Outcomes

- Depositing from the app now opens Phantom for a real devnet `lock_funds` transaction.
- Confirmed deposit creates a live `LockAccount` PDA on devnet.
- The inspected lock currently shows:
  - `1 USDC` principal
  - `1000 SKR` locked
  - `skrTier = 2`
  - `gauntletDay = 1` before any on-chain lesson relay
- After reconnect, the app returns to the existing locked-course flow instead of incorrectly requesting a second deposit.
- `Profile` now shows the live resurface card with the correct principal, SKR, and unlock time.
- Available courses in the main browser now route into the real deposit screen instead of a mock enroll action.
- The current live catalog is no longer a thin stub; it now publishes four real course entries with their own lesson lists.

## Remaining Follow-up

- Live-test `unlock_funds` once the current devnet lock reaches maturity.
