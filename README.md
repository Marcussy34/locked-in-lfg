# Locked In

> [!IMPORTANT]
> The current public test APK connects to a backend hosted on Render and uses Solana devnet program/mint configuration.
> This is a QA/testing setup, not a production release.
> Because the current Render deployment may cold-start after inactivity, the first backend-auth or content request can occasionally be slow or need a retry.
> Deposit, unlock, and reward flows in this build should be treated as devnet test flows.

Locked In is a Solana-native learning product built around a simple bet on human behavior:

People are much more likely to stay consistent when progress feels real, visible, and costly to lose.

Instead of asking users to rely on willpower alone, Locked In turns online learning into a commitment device. Users lock stablecoin principal for the duration of a course, keep ownership of that principal, and let yield become the consequence layer for whether they stay on track.

## The Problem

Most online learning platforms have the same failure mode:

- signing up is easy
- starting is easy
- quitting is also easy

People know they should learn. They still stop.

That is the real retention problem. Streaks, badges, and XP help, but on their own they are usually too soft. When breaking the habit costs nothing, most users eventually drift.

Locked In exists to solve that gap between intention and follow-through.

## The Core Idea

Locked In combines three systems into one product:

1. A real commitment device
2. Habit-building gamification
3. Transparent on-chain yield logic

The user locks USDC for a course.

That principal is not meant to be arbitrarily taken away. The pressure comes from the yield generated on top of the locked capital:

- stay consistent and keep the system alive
- earn Fuel
- power the Brewer
- accumulate Ichor
- keep more of the yield you generated

If you lapse, the product does not slash your principal. Instead, it progressively redirects your yield to a community pot that rewards users who stayed consistent.

That makes the system high-pressure without being recklessly punitive.

## Why This Idea Works

Locked In is designed around a few behavioral truths.

### 1. Loss aversion is stronger than generic rewards

People protect what feels like theirs.

A normal streak counter is nice. Yield that you could have kept is harder to ignore. Locked In uses that emotional difference. The user is not just chasing points. They are trying not to waste value they already feel attached to.

### 2. Commitment works better than vague intention

Locking capital creates friction against quitting.

The user has already made a deliberate decision: "I am doing this for the next 30, 60, or 90 days." That changes the psychology of the product from casual browsing to active commitment.

### 3. Gamification works better when it is tied to real consequence

Fuel, the Brewer, Ichor, and the dungeon layer make the system legible and satisfying. The game layer is not decoration. It turns abstract financial logic into something users can feel and understand every day.

### 4. Pressure should escalate gradually, not instantly

Locked In does not jump straight from "missed one day" to "everything is gone."

It uses a stepped consequence model:

- saver consumed
- recovery mode
- Brewer pressure
- full yield redirection
- lock extension

That gives users chances to recover while still preserving stakes.

### 5. Social reinforcement matters

Forfeited yield does not disappear into a void. It flows into a community pot.

That creates a strong social and economic loop: users who stay disciplined benefit from the inconsistency of users who do not.

## How Locked In Works

### Step 1: Lock in

The user connects a Solana wallet, chooses a course, and locks USDC for the course duration. They can also optionally lock SKR as a catalyst.

### Step 2: Survive the gauntlet

The first week is the highest-pressure phase.

- no savers
- no Ichor output
- Brewer stays cold
- breaking the streak here triggers the harshest allowed consequence

The point of the gauntlet is to force genuine habit formation up front.

### Step 3: Earn Fuel through verified learning

Lessons are verified. Verified completion credits Fuel.

Fuel is not a token in a wallet. It is an internal counter tied to the user's course lock.

### Step 4: Power the Brewer

Fuel keeps the Brewer alive. When the Brewer is active, eligible yield can be converted into Ichor.

Ichor is the platform's internal redemption currency. It is intentionally more satisfying than watching tiny stablecoin decimals slowly move.

### Step 5: Protect your streak

After the gauntlet, the user gets streak savers.

Missing a day does not immediately destroy everything, but it does hurt:

- 1st saver used: `10%` yield redirected
- 2nd saver used: `20%` yield redirected
- 3rd saver used: `20%` yield redirected
- no savers left: `100%` redirect plus lock extension

### Step 6: Resurface

When the lock period ends, the user resurfaces.

Their principal comes back.
Their locked SKR comes back.
What changes is how much yield they preserved, how much Ichor they accumulated, and whether they finished the course with momentum or regret.

## The Dungeon Model

Locked In uses one core metaphor so the system stays intuitive.

| Concept | Meaning |
| --- | --- |
| Fuel | Daily energy earned from verified learning |
| Brewer | The engine that turns consistency into output |
| Ichor | Internal redemption balance produced while brewing |
| SKR catalyst | Optional locked boost that increases Ichor output |
| Savers | First-layer protection against a missed day |
| Community pot | Yield redirected from inconsistent users to consistent ones |
| Resurface | End-of-lock exit where principal and locked SKR return |

Important implementation note:

In the current repo, `Fuel` and `Ichor` are counters, not SPL tokens.

## Why Solana

Locked In only makes sense if the financial layer can feel native to the product.

Solana gives the project:

- low-cost state changes
- fast user transactions
- practical wallet-based onboarding
- stablecoin-native rails
- a realistic path to transparent yield accounting

## What We Have Built So Far

This repo is not just a concept write-up. The core structure already exists.

### 1. On-chain programs

There are currently three Anchor programs in the repo:

1. `LockVault`
2. `YieldSplitter`
3. `CommunityPot`

`LockVault` handles the core course lock lifecycle:

- protocol setup
- course policy configuration
- user lock creation
- verified completion application
- daily Fuel burn
- saver consequence logic
- Ichor redemption
- unlock / resurface

`YieldSplitter` handles harvest accounting:

- idempotent split receipts
- platform fee math
- yield redirect math
- user share calculation
- brewer-active and full-redirect handling

`CommunityPot` handles redirected-yield accounting:

- redirect recording
- distribution window creation and closing
- recipient settlement

### 2. Backend logic

The backend already contains the core runtime layer for the product:

- lesson catalog and content delivery
- wallet challenge / verify / refresh auth
- lesson start and submit flows
- answer validation
- verified completion events
- gauntlet, Fuel, saver, redirect, and extension state
- relay workers that publish to the on-chain programs
- community pot and leaderboard snapshot support

### 3. Mobile app structure

The React Native app already includes the main user-facing surfaces:

- wallet connection
- onboarding
- course selection
- deposit flow
- dungeon home
- lesson flow
- streak status
- alchemy / brewing
- leaderboard
- community pot views
- Ichor shop
- profile and resurface history

## Repo Structure

- `src/` - React Native app
- `backend/` - API, workers, SQL migrations, runtime logic
- `programs/` - Anchor programs
- `docs/` - technical architecture and detailed specs
- `scripts/` - local utilities and inspection scripts
- `web/dungeon/` - dungeon scene assets

## Technical Docs

This README is meant to explain the concept, the product logic, and what exists so far.

For the engineering source of truth, start with [`docs/00-technical-architecture-v3.md`](/Users/marcus/Projects/locked-in/docs/00-technical-architecture-v3.md).

If the README and technical docs ever differ, the technical docs should win.

## Local Dev

Mobile app:

```bash
npm install
npm run start
```

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Programs:

```bash
cargo test --workspace
```
