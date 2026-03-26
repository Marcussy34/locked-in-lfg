# Next.js PWA Migration Design

## Context

The locked-in mobile app (React Native/Expo) is being migrated to a **web-only Next.js PWA**. The goal is to make the app accessible from any device via browser, eliminating the need for app store distribution. This is a full rewrite of the frontend — the backend (Fastify on Render), database (Supabase PostgreSQL), Solana programs, and dungeon web build remain untouched.

## Architecture

```
Vercel (Frontend)
├── Next.js App Router (PWA)
│   ├── Pages (rebuilt from ~20 RN screens)
│   ├── Zustand stores (ported, localStorage)
│   ├── @solana/client + @solana/react-hooks (framework-kit)
│   ├── @solana/kit + @solana/web3-compat (Anchor boundary)
│   ├── Tailwind CSS (direct, no NativeWind)
│   └── Dungeon iframe + postMessage bridge
│
Render (Backend - untouched)
├── Fastify API (auth, content, progress)
├── 5 background workers
│
Supabase (PostgreSQL - untouched)
Solana Devnet (programs - untouched)
Vercel (Dungeon - untouched, https://dist-ochre-kappa-70.vercel.app)
```

### What stays the same
- Entire Fastify backend (API + workers)
- PostgreSQL schema and data
- Solana programs (LockVault, YieldSplitter, CommunityPot)
- Dungeon Babylon.js web build on Vercel

### What gets rewritten
- All screen components (React Native -> React/HTML/Tailwind)
- Navigation (React Navigation -> Next.js App Router)
- Wallet connection (MWA -> framework-kit)
- Dungeon integration (WebView -> iframe)
- Animations (Reanimated -> CSS/Framer Motion/GSAP)
- Storage (AsyncStorage -> localStorage)

## Project Structure

```
locked-in-web/              # New Next.js project (or subdirectory)
├── app/
│   ├── layout.tsx          # Root layout (Providers wrapper)
│   ├── page.tsx            # Landing / wallet connect
│   ├── manifest.ts         # PWA manifest
│   ├── onboarding/
│   │   ├── courses/page.tsx
│   │   ├── deposit/page.tsx
│   │   └── gauntlet/page.tsx
│   ├── dungeon/page.tsx
│   ├── courses/page.tsx
│   ├── lessons/[id]/
│   │   ├── page.tsx
│   │   └── result/page.tsx
│   ├── dashboard/page.tsx
│   ├── alchemy/page.tsx
│   ├── shop/page.tsx
│   ├── streaks/page.tsx
│   ├── community-pot/page.tsx
│   ├── leaderboard/page.tsx
│   ├── profile/page.tsx
│   ├── inventory/page.tsx
│   └── history/page.tsx
├── components/             # Shared UI components
├── stores/                 # Zustand (ported from src/stores/)
├── services/
│   ├── api/                # API client (ported, Platform.OS removed)
│   └── solana/
│       ├── kit/            # Kit-first code (addresses, tx assembly)
│       ├── web3/           # Boundary adapters for Anchor TS client
│       └── providers.tsx   # SolanaProvider setup
├── lib/                    # Utilities
├── hooks/                  # Custom React hooks
├── public/
│   └── icons/              # PWA icons
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

## Route Mapping

| RN Screen | Next.js Route | Purpose |
|---|---|---|
| WalletConnectScreen | `/` | Landing + wallet connect CTA |
| CourseSelectionScreen | `/onboarding/courses` | Post-connect course pick |
| DepositScreen | `/onboarding/deposit` | Lock deposit flow |
| GauntletRoomScreen | `/onboarding/gauntlet` | Gauntlet intro |
| UndergroundHubScreen | `/dungeon` | Main hub (iframe embed) |
| CourseBrowserScreen | `/courses` | Browse/manage courses |
| LessonScreen | `/lessons/[id]` | Lesson content + quiz |
| LessonResultScreen | `/lessons/[id]/result` | Completion feedback |
| FlameDashboardScreen | `/dashboard` | Streak/flame tracking |
| AlchemyScreen | `/alchemy` | Brewer/Ichor production |
| IchorShopScreen | `/shop` | Redemption shop |
| StreakStatusScreen | `/streaks` | Saver status |
| CommunityPotScreen | `/community-pot` | Pot contributions |
| LeaderboardScreen | `/leaderboard` | Rankings |
| ProfileScreen | `/profile` | User settings |
| InventoryScreen | `/inventory` | Owned items |
| ResurfaceHistoryScreen | `/history` | Lock history |

**Auth guard:** All routes except `/` require connected wallet + valid JWT. Handled by middleware or layout-level redirect.

**Navigation:** Persistent sidebar or top nav (web-native pattern, not mobile bottom tabs).

## Wallet Integration (framework-kit)

### Dependencies
```bash
npm install @solana/client@latest @solana/react-hooks@latest @solana/kit@latest
```

### Provider Setup
```tsx
// app/providers.tsx
'use client';
import { SolanaProvider } from '@solana/react-hooks';
import type { SolanaClientConfig } from '@solana/client';

const config: SolanaClientConfig = {
  cluster: 'devnet',
  rpc: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
  websocket: process.env.NEXT_PUBLIC_SOLANA_WS_URL ?? 'wss://api.devnet.solana.com',
};

export function Providers({ children }: { children: React.ReactNode }) {
  return <SolanaProvider config={config}>{children}</SolanaProvider>;
}
```

### Hooks
- `useConnectWallet()` / `useDisconnectWallet()` — wallet connection
- `useSignMessage()` — auth challenge signing
- `useSolTransfer()` — SOL transfers
- Wallet Standard auto-discovery (Phantom, Solflare, Backpack)

### Anchor Boundary
Existing Anchor program interactions (`@solana/web3.js` types) get isolated behind `@solana/web3-compat`:
- `services/solana/kit/` — new Kit-first code
- `services/solana/web3/` — adapters for Anchor TS client only
- No `PublicKey` or `Connection` leaking into app-level code

## Auth Flow

Identical to current flow, only the signing transport changes:

1. `POST /v1/auth/challenge` -> get nonce (same)
2. `useSignMessage()` via framework-kit -> browser wallet signs nonce
3. `POST /v1/auth/verify` -> get JWT (same)
4. Store JWT in `localStorage` via Zustand persist

Backend auth endpoints are completely untouched.

## State Management

Zustand stores port directly. Only change is the storage adapter:

```tsx
// stores/storage.ts
// No custom adapter needed — Zustand's persist middleware
// uses localStorage by default on web
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
```

### Stores to port
- `userStore` — wallet address, JWT, profile
- `courseStore` — enrolled courses, progress
- `flameStore` — streak/flame state
- `lessonStore` — current lesson state
- Any other existing stores

## Dungeon Integration

Embed via iframe pointing to existing Vercel deployment:

```tsx
<iframe
  ref={iframeRef}
  src="https://dist-ochre-kappa-70.vercel.app"
  className="w-full h-full border-0"
  allow="autoplay"
/>
```

### Bridge Communication
```tsx
// Send to dungeon
iframeRef.current.contentWindow.postMessage(
  { type: 'setViewpoint', payload: 'alchemy' },
  'https://dist-ochre-kappa-70.vercel.app'
);

// Receive from dungeon
useEffect(() => {
  const handler = (e: MessageEvent) => {
    if (e.origin !== 'https://dist-ochre-kappa-70.vercel.app') return;
    const { type, payload } = e.data;
    // handle: cameraGoBack, gauntletComplete, etc.
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

Existing message types stay the same: `initState`, `flameState`, `setViewpoint`, `setRoomPhase`, `cameraGoBack`, `setLightingMode`, `playGauntletCinematic`.

## PWA Setup

### Dependencies
```bash
npm install @serwist/next serwist
```

### Configuration
- `app/manifest.ts` — name, icons, theme color, `display: "standalone"`, start URL
- Service worker via `@serwist/next` integration in `next.config.ts`
- Custom install prompt component for "Add to Home Screen"

### Caching Strategy
- **App shell** (layout, nav, styles): Precached on install — always available offline
- **Lesson content**: Cache-first after first load (offline review)
- **API reads** (courses, leaderboard): Network-first with stale fallback
- **Wallet/blockchain ops**: Online-only (no offline signing)

## API Client

Port existing API client, removing React Native specifics:

```tsx
// services/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
// e.g., https://locked-in-mmxz.onrender.com

// Standard fetch — no Axios, no Platform.OS checks
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = useUserStore.getState().jwt;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}
```

### CORS
Backend needs to allow the Vercel frontend origin:
```
CORS_ORIGIN=https://locked-in.vercel.app
```
(Already configurable in Fastify via env var)

## Styling

Plain Tailwind CSS — no NativeWind abstraction layer.

- `tailwind.config.ts` with project theme (colors, fonts matching current design)
- Standard HTML elements (`<div>`, `<button>`, `<input>`) instead of RN primitives (`View`, `Text`, `Pressable`)
- Responsive design with Tailwind breakpoints (mobile-first for PWA)

## Animations

- **Simple transitions**: CSS transitions/animations (hover, fade, slide)
- **Complex sequences**: GSAP (already in deps, web-native)
- **Layout animations**: Framer Motion for route transitions, list reordering
- **Dungeon**: Handled by Babylon.js inside iframe (unchanged)

## Deployment

### Frontend (Vercel)
- Connect new Next.js project to Vercel
- Environment variables:
  - `NEXT_PUBLIC_API_URL` — Fastify backend URL
  - `NEXT_PUBLIC_SOLANA_RPC_URL` — Solana RPC endpoint
  - `NEXT_PUBLIC_SOLANA_WS_URL` — Solana WebSocket endpoint
  - `NEXT_PUBLIC_DUNGEON_URL` — Dungeon iframe URL
  - `NEXT_PUBLIC_LOCK_VAULT_PROGRAM_ID`
  - `NEXT_PUBLIC_YIELD_SPLITTER_PROGRAM_ID`
  - `NEXT_PUBLIC_COMMUNITY_POT_PROGRAM_ID`

### Backend (Render - no changes)
- Add Vercel frontend domain to CORS allowlist

### Domain
- Custom domain on Vercel for the PWA

## What Can Be Directly Reused (Copy + Adapt)

| Source | Target | Changes Needed |
|---|---|---|
| `src/stores/*.ts` | `stores/*.ts` | Swap AsyncStorage -> localStorage |
| `src/services/api/*.ts` | `services/api/*.ts` | Remove Platform.OS, use fetch |
| `src/types/*.ts` | `types/*.ts` | Minimal (remove RN-specific types) |
| Solana tx-building logic | `services/solana/web3/` | Wrap behind web3-compat boundary |
| `web/dungeon/` | Unchanged | Already deployed on Vercel |
| `backend/` | Unchanged | Just add CORS origin |

## Verification Plan

1. **Wallet connects** — Phantom/Solflare connects via framework-kit, address displayed
2. **Auth flow** — Challenge -> sign -> JWT works, protected routes redirect correctly
3. **Course browsing** — Courses load from Fastify API, lesson content renders
4. **Lesson completion** — Start -> answer -> submit -> verified completion chain works
5. **Dungeon** — iframe loads, bridge messages work (viewpoint changes, state sync)
6. **PWA install** — "Add to Home Screen" works on mobile Chrome/Safari, standalone mode launches
7. **Offline shell** — App shell loads offline, cached lessons viewable
8. **Responsive** — Works on mobile, tablet, and desktop viewports
9. **Solana transactions** — Lock deposit, verified completion relay, ichor redemption all succeed on devnet
