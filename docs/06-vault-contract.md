# LockVault Program Spec (v3.0)

## Scope

`LockVault` is the core custody and per-course state program.
It owns lock lifecycle, principal/SKR custody, and Fuel/Ichor counter state.

Current implementation checkpoint:

- Anchor workspace scaffold now exists under `programs/lock_vault`
- `initialize_protocol` and canonical `lock_funds` are now implemented
- `lock_funds` validates configured USDC + SKR mints, creates the lock PDA, creates stable/SKR vault ATAs, transfers funds atomically, and snapshots `skr_tier`
- worker-only `apply_verified_completion`, `consume_daily_fuel`, and `consume_saver_or_apply_full_consequence` are implemented with receipt-PDA idempotency
- Rust tests now cover deposit snapshotting, SKR tier thresholds, Fuel credit, gauntlet unlock, saver recovery, and full-consequence extension logic
- token exit paths (`unlock_funds`, `redeem_ichor`) remain the next on-chain slice

Companion programs in the same on-chain stack:

- `YieldSplitter` for harvest partitioning and Ichor credit logic
- `CommunityPot` for redirected-yield accounting and distribution settlement

## Responsibilities

1. Lock stablecoin principal and optional SKR in one course lock.
2. Enforce lock duration and extension policy.
3. Persist per-course game/economy counters.
4. Authorize unlock/resurface only when timer conditions are met.
5. Support atomic Ichor redemption settlement.

## Canonical Instructions

### `lock_funds(usdc_amount, skr_amount, lock_duration_days, course_id)`

Effects:

- transfers stablecoin from user ATA to vault ATA
- transfers SKR to vault ATA when `skr_amount > 0`
- derives and initializes per-course `LockAccount`
- snapshots `skr_tier`
- sets initial state:
  - `fuel_counter = 0`
  - `ichor_counter = 0`
  - `savers_remaining = 0` during gauntlet
  - `gauntlet_complete = false`

Validation:

- supported stablecoin mint only
- lock duration in allowed set (`30`, `60`, `90`)
- one active lock per `(owner, course_id)` key

Current scaffold note:

- the current scaffold always initializes the SKR vault ATA so the lock account topology stays deterministic, even when `skr_amount = 0`

### `apply_verified_completion(completion_event_id, completion_day, reward_units)`

Authorized caller: backend/scheduler signer set.

Effects:

- validates idempotency (`completion_event_id`)
- updates streak/gauntlet progression
- credits Fuel within cap rules when eligible
- drives saver recovery when applicable

Current scaffold note:

- receipt keys are passed as `32-byte` deterministic hashes for PDA-safe idempotency

### `consume_daily_fuel(cycle_id)`

Authorized caller: scheduler signer set.

Effects:

- idempotently consumes `1` Fuel per 24h cycle when available
- updates brewer active/inactive derivation state

Current scaffold note:

- the first scaffold records one receipt PDA per burn cycle and returns a no-op outcome while gauntlet is still active

### `consume_saver_or_apply_full_consequence(miss_event_id)`

Authorized caller: scheduler signer set.

Effects:

- consumes saver and updates penalty tier when saver exists
- otherwise applies full consequence:
  - sets redirect to 100%
  - extends lock by configured amount

Current scaffold note:

- the first scaffold stores canonical `savers_remaining` on-chain, even though the current backend runtime still uses a consumed-saver counter

### `redeem_ichor(ichor_amount)`

Authorized caller: lock owner.

Preconditions:

- gauntlet complete
- `ichor_amount > 0`
- `ichor_amount <= ichor_counter`

Effects:

- computes quote from conversion tier
- debits `ichor_counter`
- transfers stablecoin out from redemption/yield pool
- emits redemption event

### `unlock_funds()`

Authorized caller: lock owner.

Preconditions:

- `now >= lock_end_ts` including extensions
- lock status is unlockable

Effects:

- returns principal stablecoin in full
- returns locked SKR in full
- handles final residual yield settlement per policy
- marks lock closed and releases rent where applicable

## Account Topology

Per course lock PDAs:

- `LockAccount`
- stablecoin vault ATA (program-owned authority)
- SKR vault ATA (program-owned authority, optional)

Global PDAs:

- `ProtocolConfig`
- authorized signer registry
- idempotency/event receipt records

## Access Control

User-signed only:

- `lock_funds`
- `redeem_ichor`
- `unlock_funds`
- voluntary extension (if enabled as user action)

Authorized worker only:

- verified completion application
- daily cycle burns
- missed-day consequence application

Admin/governance only:

- protocol parameters
- signer registry
- emergency pause controls

## Time Source

Program time logic uses Solana clock sysvar unix timestamp.
No client clock is trusted for settlement-critical decisions.

## Safety Invariants

1. Principal cannot be redirected to community pot via saver penalties.
2. SKR cannot be spent by reward/penalty paths.
3. Counter updates use checked arithmetic and bounded ranges.
4. Every worker-driven mutation is idempotent.
5. Lock extension can only increase lock end time.

## Events (Required)

- `LockCreated`
- `FuelCredited`
- `FuelBurned`
- `SaverConsumed`
- `FullConsequenceApplied`
- `IchorRedeemed`
- `LockUnlocked`

Events are used for analytics, indexers, and reconciliation.

## Companion Program Interfaces

### `YieldSplitter` (required interface contract)

Responsibilities:

1. receive realized yield from strategy adapters
2. split yield into user share, platform fee, and community redirect share
3. apply saver penalty tier and SKR boost logic
4. increment `LockAccount.ichor_counter` and `ichor_lifetime_total` only when Brewer is active

Canonical instruction surface:

- `harvest_and_split(harvest_id, lock_account, gross_yield_amount)`
- `apply_harvest_result(lock_account, split_result)` (when two-step execution is needed)

Required guards:

- idempotent `harvest_id`
- only authorized harvester/worker signers
- checked arithmetic on split outputs

### `CommunityPot` (required interface contract)

Responsibilities:

1. accumulate redirected yield from saver penalties and full-consequence events
2. maintain monthly distribution windows
3. settle distributions to eligible active streakers by weighting policy

Canonical instruction surface:

- `record_redirect(redirect_event_id, amount)` (or equivalent CPI entrypoint)
- `close_distribution_window(window_id)`
- `distribute_window(window_id, recipient_batch)`

Distribution weighting inputs:

- active streak length
- locked deposit size

Required guards:

- idempotent window/event keys
- deterministic snapshot cutoffs per window
- no principal vault funds used for pot settlement
