# Done: 05 Yield and Ichor

## Scope Completed

This checkpoint established the first real Ichor accrual and redemption plumbing on devnet.
It does not integrate Kamino/Marginfi yet, but it now has a working harvest receipt path, on-chain Ichor counters, funded redemption vault, and live app-side shop state.

## What Was Implemented

### On-chain harvest and Ichor accrual

- `LockVault` now supports worker-only `apply_harvest_result(...)`.
- Harvest applies:
  - platform fee
  - saver/community redirect
  - SKR boost
  - Ichor accrual into `ichor_counter` and `ichor_lifetime_total`

### Backend harvest receipt pipeline

- Added `lesson.harvest_result_receipts`.
- Backend can record manual/scheduler harvest receipts.
- Backend can publish those receipts into the live lock on devnet.
- Backend can now also relay the published `redirected_amount` into the live `CommunityPot`.
- Receipt rows store:
  - applied vs skipped outcome
  - fee amount
  - redirect amount
  - Ichor awarded
  - relay signature/status

### Live devnet verification

- Seeded valid post-lock completion events to finish gauntlet on the dev lock.
- Published a positive harvest into the live lock.
- Verified the live lock now holds:
  - `ichor_counter = 840000`
  - `ichor_lifetime_total = 840000`

### Redemption vault funding

- Added a reusable script to fund the protocol redemption vault:
  - `scripts/fund-redemption-vault.mjs`
- Funded the live redemption vault with `5 USDC` on devnet.

### Mobile Ichor Shop

- `Ichor Shop` now reads the live on-chain lock snapshot.
- It shows:
  - real Ichor balance
  - real lifetime total
  - real conversion tier
  - real protocol redemption-vault liquidity
- The redeem button is enabled/disabled from live chain state, not placeholder copy.

## Main Files

- `programs/lock_vault/src/lib.rs`
- `backend/sql/0010_harvest_result_receipts.sql`
- `backend/src/lib/lockVault.mjs`
- `backend/src/modules/progress/repository.mjs`
- `backend/src/modules/progress/routes.mjs`
- `src/services/solana/lockVault.ts`
- `src/screens/main/IchorShopScreen.tsx`
- `scripts/fund-redemption-vault.mjs`

## Verified Outcomes

- Manual harvest `manual-harvest-001` published as `HARVEST_SKIPPED` while the lock was still in gauntlet.
- Manual harvest `manual-harvest-002` published as `HARVEST_APPLIED`.
- The positive harvest stored:
  - `platformFeeAmount = 100000`
  - `redirectedAmount = 100000`
  - `ichorAwarded = 840000`
- The live redemption vault now has `5 USDC`.
- The app shop shows the live Ichor state, live vault liquidity, and a redeemable quote.
- The live mobile redemption path is now usable against the deployed devnet program.
- The redirected `0.1 USDC` share from `manual-harvest-002` now also exists in the live `CommunityPot` monthly window.

## Remaining Follow-up

- Replace manual harvest seeding with a real `YieldSplitter` / strategy integration path.
- Decide whether harvest logic stays in `LockVault` or moves behind a dedicated companion program.
- Add monthly `CommunityPot` settlement from redirected yield.
