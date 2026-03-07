# Done: 04 Tokenomics and Community Pot Accumulation

## Scope Completed

This checkpoint made the first real `CommunityPot` path live on devnet.
Redirected yield is no longer just a rules table or placeholder UI value. It now lands in an on-chain monthly pot window and can be read back by the app.

## What Was Implemented

### On-chain CommunityPot accumulator

- Added a new `CommunityPot` Anchor program.
- It supports:
  - `initialize_protocol(stable_mint)`
  - `record_redirect(redirect_event_id, window_id, amount, recorded_at_ts)`
- Redirects are stored in monthly UTC `YYYYMM` windows.
- Receipt PDAs make each redirect idempotent.

### Backend relay path

- Harvest receipts now track CommunityPot relay status separately from LockVault relay status.
- The backend can publish a harvest receipt's `redirected_amount` into the live monthly pot window.
- Zero-redirect harvests can be skipped cleanly without creating fake pot growth.

### Monthly close snapshot

- `close_distribution_window(window_id)` now exists on `CommunityPot`.
- The backend can now:
  - read the live monthly pot window
  - compute eligible active-streak recipients
  - compute deterministic payout amounts
  - persist those payout rows in `lesson.community_pot_distribution_snapshots`
- This is the checkpoint before actual batch USDC distribution.

### Live batch payout path

- `CommunityPot` now has a program-owned USDC vault ATA.
- The backend can fund that vault and then distribute closed-window payouts in batches.
- Each recipient payout is idempotent through an on-chain distribution receipt and a backend snapshot row transition:
  - `pending`
  - `publishing`
  - `distributed`
  - `failed`

### Mobile Community Pot screen

- The screen no longer uses `totalIchorProduced` as a fake proxy.
- It now reads:
  - the live current-month pot balance
  - the live redirect count
  - the latest on-chain update timestamp
- Per-course cards still use local/runtime state for redirect percentage and saver status.
- It now also shows:
  - closed monthly windows
  - current wallet payout history
  - payout status and tx history for distributed rows

## Main Files

- `programs/community_pot/src/lib.rs`
- `backend/sql/0011_harvest_result_community_pot_publish_status.sql`
- `backend/src/lib/communityPot.mjs`
- `backend/src/modules/progress/repository.mjs`
- `backend/src/modules/progress/routes.mjs`
- `src/services/solana/communityPot.ts`
- `src/screens/main/CommunityPotScreen.tsx`
- `scripts/init-community-pot-protocol.mjs`
- `scripts/inspect-community-pot.mjs`

## Verified Outcomes

- `CommunityPot` is deployed on devnet under `BsJDnhJGVdLQ3mxBJ7YCMkkBitKP2RT49zFqR9XsGri1`.
- The protocol PDA is initialized with official devnet USDC.
- Harvest `manual-harvest-002` published its redirected share into the live monthly window.
- The DB row now shows:
  - `community_pot_status = published`
  - `community_pot_window_id = 202603`
- The live on-chain window now shows:
  - `totalRedirectedAmountUi = 0.1`
  - `redirectCount = 1`
- A fresh April test window `202604` was closed with a positive recipient snapshot:
  - `totalRedirectedAmount = 50000`
  - `totalWeight = 1000000`
  - `eligibleRecipientCount = 1`
  - recipient payout row = `50000`
- The CommunityPot vault was funded with `0.1 USDC`.
- The first live payout batch succeeded for `202604`:
  - vault `0.1 -> 0.05 USDC`
  - distribution window `distributedAmount = 50000`
  - snapshot row moved to `distributed`

## Remaining Follow-up

- Decide whether CommunityPot should also ingest non-harvest redirect sources directly.
- Add richer app-side drill-down for individual payout receipts and recipient lists.
