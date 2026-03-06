# Locked In Technical Architecture v3.0 (Canonical)

## Purpose

This document is the canonical technical specification for Locked In v3.0.
All docs in `docs/` must match this file.

Design goals:

1. Habit formation with real economic consequence.
2. Principal safety for user deposits.
3. Minimal on-chain complexity for game counters.
4. Clear separation between on-chain financial state and off-chain learning delivery.

## System Topology

| Layer | Components | Responsibility |
| --- | --- | --- |
| Mobile app | React Native + Expo, wallet integration, 3D dungeon UI | User onboarding, lesson UX, timer/brewer/pot views, transaction signing |
| Backend | Lesson API, progress verification, scheduler workers, Supabase/Postgres, Helius webhooks | Course content, lesson verification, off-chain aggregation, job orchestration |
| On-chain (Solana) | `LockVault`, `YieldSplitter`, `CommunityPot` | Locking principal/SKR, Fuel/Ichor counters, yield splitting, pot accounting, resurface/unlock |
| DeFi yield substrate | Kamino, Marginfi, Jupiter routing | Passive yield generation on locked stablecoin capital |

## Canonical Program Topology

Locked In v3.0 uses three on-chain programs:

1. `LockVault`
2. `YieldSplitter`
3. `CommunityPot`

`Ichor` and `Fuel` are not SPL tokens and are not separate programs.
They are integer counters inside each course lock account.

## Canonical Account Model

Each active course lock is represented by one `LockAccount`.
A user with multiple active courses has multiple independent `LockAccount`s.

Minimum required fields:

- `owner: Pubkey`
- `course_id_hash: [u8; 32]`
- `stable_mint: Pubkey` (`USDC`)
- `principal_amount: u64`
- `lock_start_ts: i64`
- `lock_end_ts: i64`
- `extension_seconds_total: u64`
- `status: u8` (`active`, `unlockable`, `closed`)
- `gauntlet_complete: bool`
- `savers_remaining: u8` (0 to 3)
- `saver_recovery_mode: bool`
- `fuel_counter: u16`
- `fuel_cap: u16` (protocol-configured between 7 and 14)
- `last_fuel_credit_day: i64`
- `last_brewer_burn_ts: i64`
- `ichor_counter: u64` (redeemable balance)
- `ichor_lifetime_total: u64` (tier eligibility basis)
- `skr_locked_amount: u64`
- `skr_tier: u8` (0..3)
- `current_yield_redirect_bps: u16`
- `bump: u8`

Global/config accounts (program-level):

- protocol fee settings (10-20%)
- saver penalty schedule
- conversion tier table
- extension policy parameters
- authorized backend/scheduler signer set

Token vault accounts:

- stablecoin vault ATA per lock
- SKR vault ATA per lock (optional if SKR amount > 0)
- protocol fee vault ATA
- community pot vault ATA

## Economic Constants (v3.0)

### SKR catalyst tiers

| Locked SKR | Tier | Ichor output multiplier |
| --- | --- | --- |
| 0-99 | 0 | 1.00x |
| 100-999 | 1 | 1.02x |
| 1,000-9,999 | 2 | 1.05x |
| 10,000+ | 3 | 1.10x |

### Saver penalties

| Event | Yield redirect |
| --- | --- |
| 1st saver consumed | 10% |
| 2nd saver consumed | 20% |
| 3rd saver consumed | 20% |
| Miss with no savers left | 100% + lock extension |

### Ichor conversion tiers

| Ichor lifetime total | Conversion |
| --- | --- |
| 0-9,999 | 1,000 Ichor = 0.90 USDC |
| 10,000-49,999 | 1,000 Ichor = 1.00 USDC |
| 50,000-99,999 | 1,000 Ichor = 1.10 USDC |
| 100,000+ | 1,000 Ichor = 1.25 USDC |

## Lifecycle State Machine

1. **Onboarding lock**
   - User locks stablecoin principal (USDC), optional SKR.
   - SKR tier snapshot is fixed for lock duration.
2. **Gauntlet (Day 1-7)**
   - No brewer output.
   - No savers available.
   - Miss consequences are maximal per policy.
3. **Post-gauntlet active course**
   - Savers inventory unlocked (3 max).
   - Brewer active only when Fuel > 0.
   - Yield harvest can increment Ichor counter when brewer is active.
4. **Recovery mode**
   - Triggered when saver inventory drops below max.
   - Lessons earn savers back faster than one per day.
   - Fuel earning paused until saver inventory is restored to max.
5. **Resurface**
   - Triggered when lock end timestamp (including extensions) is reached.
   - Principal and SKR are returned in full.
   - User may continue with a new lock cycle.

## On-chain Invariants

1. Principal is never slashed by streak logic.
2. SKR is never spent, burned, or partially confiscated.
3. Fuel and Ichor are counters only; no SPL mint/token account exists for either.
4. Each course lock is isolated; no shared saver/fuel/ichor state across courses.
5. Saver penalties only redirect yield, not principal.
6. Ichor redemption debits `ichor_counter` atomically with stablecoin release from yield pool.

## Scheduler and Idempotency

Required recurring jobs:

- daily course-day rollover / streak validation
- daily brewer fuel burn cycle (24h)
- periodic yield harvest and split
- monthly community pot distribution

All job-triggered instructions must be idempotent.
Every action uses deterministic keys or event IDs to prevent double application.

## Security and Compliance Boundaries

- Solana program authority controls are strict and role-scoped.
- Critical parameters are updateable only through governed admin paths.
- Wallet signatures gate all user-initiated lock/unlock/redemption actions.
- Locked In discloses that user principal is protected while yield is conditional.
- Jurisdiction-specific legal review is required before mainnet launch.
