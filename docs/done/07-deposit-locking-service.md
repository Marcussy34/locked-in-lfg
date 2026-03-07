# Done: 07 Deposit and Locking Service

## Scope Completed

This checkpoint replaced the placeholder deposit path with a real devnet `LockVault` flow.
The mobile app now creates funded course locks on-chain, persists them across reconnects, exposes a live resurface card, and the repo includes lock inspection tooling for verification.

## What Was Implemented

### Real deposit transaction builder

- The app now derives:
  - `ProtocolConfig` PDA
  - per-course `LockAccount` PDA
  - stable vault ATA
  - SKR vault ATA
- Deposit input is now built into the real `lock_funds(...)` instruction instead of a mock onboarding transition.

### Wallet signing and submission flow

- Deposit signing runs through mobile wallet approval.
- The app now signs with MWA and submits the serialized transaction itself.
- This removed the previous hang-prone wallet-side send path.

### Devnet deployment and bootstrap

- `LockVault` is deployed on devnet.
- The protocol PDA is initialized with:
  - official devnet USDC mint
  - project SKR mint
  - canonical Fuel/saver config
- The current client flow is configured for `USDC + SKR` only.

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

### Live resurface UI

- `Profile` now reads the live lock account from chain.
- It shows:
  - locked principal
  - locked SKR
  - unlock timestamp
  - current lock availability state
- `Unlock & Resurface` is only enabled when the program-derived lock is actually unlockable.

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

## Remaining Follow-up

- Relay verified completion, burn, and miss events from backend workers into the `LockVault` instruction surface.
- Live-test `unlock_funds` once the current devnet lock reaches maturity.
- Optionally add a dedicated unlock history or receipt view in the app.
