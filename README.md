# LOCKED IN — Technical README (v3.0)

LOCKED IN is a Solana-native learning platform that combines habit formation mechanics with yield-based monetary consequences.

Core principle: users lock stablecoin principal for a course duration, keep principal ownership, and earn or forfeit yield based on consistency.

## Canonical Spec

The v3 source of truth is in `docs/`.

Start here:

- [`docs/00-technical-architecture-v3.md`](docs/00-technical-architecture-v3.md)

Detailed specs:

1. [`docs/01-wallet-connection.md`](docs/01-wallet-connection.md)
2. [`docs/02-lesson-api.md`](docs/02-lesson-api.md)
3. [`docs/03-fuel.md`](docs/03-fuel.md)
4. [`docs/04-tokenomics.md`](docs/04-tokenomics.md)
5. [`docs/05-yield-calculator.md`](docs/05-yield-calculator.md)
6. [`docs/06-vault-contract.md`](docs/06-vault-contract.md)
7. [`docs/07-deposit-locking-service.md`](docs/07-deposit-locking-service.md)
8. [`docs/08-timer-yield-product.md`](docs/08-timer-yield-product.md)
9. [`docs/09-leaderboard.md`](docs/09-leaderboard.md)
10. [`docs/10-answer-validator.md`](docs/10-answer-validator.md)

`docs/done/` is archive-only and not a source of truth.

## v3 Core Mechanics

### Fuel

- On-chain `u16` counter in each course `LockAccount`
- Earned from verified lesson completion
- Burns at `1 Fuel / 24h` while Brewer is active
- Not an SPL token

### Ichor

- On-chain `u64` counter in each course `LockAccount`
- Produced from eligible yield while Brewer is active
- Redeemable for stablecoin via Ichor Exchange
- Not an SPL token

### SKR Catalyst

- Optional SKR locked with principal at course start
- Tier snapshotted and fixed for course duration
- Boosts Ichor output (`+0%`, `+2%`, `+5%`, `+10%`)
- Returned in full at resurface

### Gauntlet and Consequences

- Day 1-7 gauntlet: no savers, no Ichor production
- Day 8+: savers unlocked, Brewer/Ichor unlocked
- Saver penalties: `10% -> 20% -> 20%`
- No savers left + miss: `100% yield redirect + lock extension`

### Ichor Conversion Tiers

- `0-9,999`: `1,000 Ichor = 0.90 USDC`
- `10,000-49,999`: `1,000 Ichor = 1.00 USDC`
- `50,000-99,999`: `1,000 Ichor = 1.10 USDC`
- `100,000+`: `1,000 Ichor = 1.25 USDC`

## On-chain Program Topology

Canonical v3 topology uses three programs:

1. `LockVault`
2. `YieldSplitter`
3. `CommunityPot`

No standalone token program exists for Fuel/Ichor.

## System Architecture

| Layer | Stack | Responsibility |
| --- | --- | --- |
| Mobile App | React Native + Expo, Zustand, React Navigation | UX, wallet connect, lesson loop, lock/redeem signing |
| Backend | Fastify, Postgres/Supabase, scheduler workers | content API, auth, progress verification, event orchestration |
| Blockchain | Solana + Anchor programs | custody, counters, yield split, pot accounting |
| Yield Substrate | Kamino, Marginfi, Jupiter routing | passive stablecoin yield generation |

## Repository Status

This repo contains working app and backend scaffolding, plus legacy prototype naming in some runtime code paths.

For all new implementation work, follow v3 docs in `docs/` even when legacy prototype code still uses older terminology.

Current implementation checkpoint:

- app + backend cover wallet auth, lesson verification, verified completion events, Fuel runtime, burn cycles, and saver consequences
- the first on-chain `LockVault` scaffold now exists under `programs/lock_vault`
- `LockVault` now includes canonical `lock_funds` plus the worker-driven Fuel/saver instructions
- the onboarding deposit screen now builds and submits `lock_funds` transactions when LockVault env config is present
- current on-chain scope still does not include `unlock_funds` or `redeem_ichor`

## Monorepo Layout

- `src/` — mobile app
- `backend/` — lesson API and auth/progress services
- `programs/` — Anchor on-chain programs
- `docs/` — canonical v3 technical specs
- `assets/`, `models/`, `textures/` — client visuals/resources

## Quick Start

### Mobile app

```bash
npm install
npm run start
```

Native builds:

```bash
npm run android
npm run ios
```

### Backend API

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Default backend URL: `http://localhost:3001`

### On-chain programs

```bash
cargo test -p lock-vault
```

Current note:

- `anchor build` currently depends on matching local Anchor CLI / SBF toolchain versions
- this repo currently has `@coral-xyz/anchor` `0.32.1` in JavaScript, while the installed CLI is `0.31.1`

Client deposit env config now lives in `.env.example`.

## Backend API Surface (current)

Public content:

- `GET /health`
- `GET /v1/content/version`
- `GET /v1/courses`
- `GET /v1/courses/:courseId/modules`
- `GET /v1/modules/:moduleId/lessons`
- `GET /v1/lessons/:lessonId`

Auth:

- `POST /v1/auth/challenge`
- `POST /v1/auth/verify`
- `POST /v1/auth/refresh`

Progress (bearer token):

- `POST /v1/progress/lessons/:lessonId/start`
- `POST /v1/progress/lessons/:lessonId/submit`
- `GET /v1/progress/courses/:courseId`
- `GET /v1/progress/modules/:moduleId`

## Wallet Notes

- Mobile wallet flow uses Solana Mobile Wallet Adapter.
- In this setup, real MWA flow is Android-native runtime dependent.
- Wallet signatures are required for lock, redeem, and unlock flows.

## Security and Launch Gates

Before mainnet launch:

1. Smart contract audit (all 3 programs)
2. End-to-end idempotency and replay protection validation
3. Production key management and signer isolation
4. Monitoring/alerting for scheduler and harvest pipelines
5. Legal/regulatory review for yield redirection and lock-extension policies

## Development Rule

If README and docs conflict, docs win.
If docs conflict internally, `docs/00-technical-architecture-v3.md` wins.
