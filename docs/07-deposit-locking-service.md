# Deposit and Locking Service

## What This Is

The client-side service layer that handles depositing USDC into the vault contract and managing the lockup lifecycle. This is the bridge between the app's UI and the on-chain vault program.

## Current State

The deposit screen (`DepositScreen.tsx`) shows a hardcoded $100 USDC mock deposit. No actual transaction is built or sent. The `src/services/solana/` directory has placeholder files but no implementation. The yield store tracks a `lockedAmount` locally but it's not connected to any on-chain state.

## How It Should Work

### Deposit Flow
1. User arrives at the deposit screen after selecting a course.
2. The service reads the user's USDC balance from their wallet (SPL token account lookup).
3. User enters the amount they want to lock (must meet a minimum deposit threshold).
4. The service shows a yield projection: estimated earnings over the lock period at current APY.
5. User confirms the deposit.
6. The service builds an Anchor transaction that:
   - Transfers USDC from the user's wallet to the vault PDA.
   - Initializes the user's vault account with: locked amount, lock start date, lock end date.
7. The transaction is sent to the user's wallet for signing.
8. On confirmation, the app updates local state and navigates to the gauntlet.

### Lock Management
- The service can query the user's vault account to get current lock status: locked amount, time remaining, yield accrued, penalty history.
- It handles the "extend lockup" action — building and sending the extend transaction.
- It handles early withdrawal attempts — the vault program may reject these or apply penalties.

### Balance Checking
- Read the user's USDC balance before deposit (to validate they have enough).
- Read the user's Fuel balance from the backend ledger service.
- Read the vault state for locked amount and claimable yield.

## Where Solana Fits In

- **RPC Connection:** The service needs a Solana RPC endpoint (devnet for testing, mainnet-beta for production) to read account data and send transactions.
- **Anchor Client:** Uses the Anchor TypeScript client to build typed instructions for the vault program. The program's IDL (Interface Definition Language) defines available instructions and account structures.
- **Transaction Building:** Each deposit is a Solana transaction containing: the vault program's deposit instruction, SPL Token transfer instruction, and any necessary account references.
- **Wallet Signing:** The Mobile Wallet Adapter handles transaction signing — the service builds the transaction, sends it to the wallet app for signing, then submits it to the network.
- **Confirmation:** After submitting, the service waits for transaction confirmation (using `confirmTransaction` or commitment level checks).

## Key Considerations

- Need environment configuration: RPC endpoint URL, vault program ID, USDC mint address, and backend Fuel service URL/keys. These should be in environment variables.
- Handle transaction failures gracefully: insufficient balance, network errors, user rejects signing, transaction timeout.
- Consider transaction fees — the user pays SOL for gas. Make sure they have enough SOL in their wallet.
- The deposit screen should clearly show: amount to lock, lock duration, projected yield, unlock date, and any penalties for breaking the streak.
- Support for both USDC and USDT deposits, or pick one to simplify.
- The service should cache vault state locally (Zustand) and sync with on-chain state periodically to avoid excessive RPC calls.

## Related Files

- `src/screens/onboarding/DepositScreen.tsx` — deposit UI
- `src/services/solana/` — where this service lives
- `src/stores/yieldStore.ts` — local yield/lock tracking
- `src/stores/userStore.ts` — user wallet address
