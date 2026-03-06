# Tokenomics and Economic Rules (v3.0)

## Core Economic Model

Locked In uses commitment-based yield economics.

- Users lock stablecoin principal (`USDC` or `USDT`) for 30/60/90 days.
- Principal is not arbitrarily confiscated.
- Economic consequence is applied to yield, not principal.
- Ichor is an internal redemption counter, not a market token.

## Asset Roles

### Principal stablecoin

- on-chain token movement
- locked for course duration
- always returned at resurface (subject to lock timer/extension)

### SKR catalyst

- optional locked commitment alongside principal
- tier snapshotted at lock time
- tier fixed for lock duration
- always returned in full at resurface

### Fuel

- `u16` counter in `LockAccount`
- powers Brewer cycles

### Ichor

- `u64` counter in `LockAccount`
- produced from eligible yield when Brewer is active
- redeemed for stablecoin via Ichor Exchange

## SKR Catalyst Tiers

| Locked SKR | Ichor boost |
| --- | --- |
| 0-99 | +0% |
| 100-999 | +2% |
| 1,000-9,999 | +5% |
| 10,000+ | +10% |

Boost applies multiplicatively to base Ichor output.

## Ichor Conversion Tiers

| Lifetime accumulated Ichor | Conversion rate |
| --- | --- |
| 0-9,999 | 1,000 Ichor = 0.90 USDC |
| 10,000-49,999 | 1,000 Ichor = 1.00 USDC |
| 50,000-99,999 | 1,000 Ichor = 1.10 USDC |
| 100,000+ | 1,000 Ichor = 1.25 USDC |

## Saver Penalty Curve

| Saver event | Yield redirected to community pot |
| --- | --- |
| 1st saver consumed | 10% |
| 2nd saver consumed | 20% |
| 3rd saver consumed | 20% |
| no savers left and missed day | 100% + lock extension |

## Yield Split Policy

At harvest, gross yield is partitioned into:

1. user-eligible yield (converted to Ichor when Brewer is active)
2. platform fee (10-20%)
3. community pot share (penalties/forfeitures)

## Community Pot Distribution

- Pot accumulates redirected yield.
- Distribution cadence: monthly.
- Eligibility: active streakers.
- Weighting inputs: streak length and locked deposit size.

## Invariants

1. Fuel and Ichor remain internal counters only.
2. No secondary market exists for Fuel/Ichor.
3. Principal and locked SKR are not consumed by penalty flow.
4. Per-course economics are isolated across multiple simultaneous locks.
