# Wallet Connection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the mocked wallet connection with real Solana Mobile Wallet Adapter (MWA) on native, keeping web mocked.

**Architecture:** Thin wallet service wraps MWA `transact()` API. On native, it opens the user's wallet app (Phantom/Solflare) for authorization. The service returns a base58 public key which gets stored in the existing zustand userStore. Auth tokens are persisted for session reuse (auto-reconnect).

**Tech Stack:** `@solana-mobile/mobile-wallet-adapter-protocol-web3js`, `@solana/web3.js` v1, Expo React Native

---

### Task 1: Create Solana Connection Service

**Files:**
- Create: `src/services/solana/connection.ts`
- Delete: `src/services/solana/.gitkeep`

**Step 1: Create the connection module**

```typescript
// src/services/solana/connection.ts
import { Connection, clusterApiUrl } from '@solana/web3.js';

// Switch to 'mainnet-beta' for production
export const CLUSTER = 'devnet';
export const RPC_ENDPOINT = clusterApiUrl(CLUSTER);

// Shared connection instance — reused across the app
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to connection.ts

**Step 3: Commit**

```bash
git add src/services/solana/connection.ts
git rm src/services/solana/.gitkeep
git commit -m "feat: add shared Solana devnet connection service"
```

---

### Task 2: Create Wallet Service

**Files:**
- Create: `src/services/solana/walletService.ts`
- Create: `src/services/solana/index.ts`

**Step 1: Create the wallet service**

The MWA `authorize()` returns accounts with base64-encoded addresses. We decode to get the raw bytes, then create a PublicKey to get the base58 string.

```typescript
// src/services/solana/walletService.ts
import { Platform } from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { toByteArray } from 'base64-js';

// App identity shown in wallet approval prompt
const APP_IDENTITY = {
  name: 'Locked In',
  // uri and icon can be added later for richer wallet UI
};

// MWA chain identifier for devnet
const CHAIN = 'solana:devnet';

export interface WalletSession {
  /** Base58-encoded public key */
  publicKey: string;
  /** MWA auth token for session reuse */
  authToken: string;
  /** Wallet label (e.g. "Phantom") */
  walletLabel?: string;
}

/**
 * Connect to a wallet via MWA. Opens the user's wallet app for approval.
 * Returns the wallet session on success, null if not on a supported platform.
 */
export async function connectWallet(): Promise<WalletSession> {
  if (Platform.OS === 'web') {
    // Web stays mocked for now
    return { publicKey: 'MOCK_WALLET_ADDRESS', authToken: 'mock' };
  }

  // Dynamic import — MWA only works on native
  const { transact } = await import(
    '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
  );

  const result = await transact(async (wallet) => {
    const auth = await wallet.authorize({
      identity: APP_IDENTITY,
      chain: CHAIN,
    });

    // auth.accounts[0].address is base64-encoded
    const firstAccount = auth.accounts[0];
    const addressBytes = toByteArray(firstAccount.address);
    const publicKey = new PublicKey(addressBytes).toBase58();

    return {
      publicKey,
      authToken: auth.auth_token,
      walletLabel: firstAccount.label,
    };
  });

  return result;
}

/**
 * Reconnect using a cached auth token. Silent — no wallet app popup if token is still valid.
 * Returns a refreshed session, or throws if the token is expired/invalid.
 */
export async function reconnectWallet(authToken: string): Promise<WalletSession> {
  if (Platform.OS === 'web') {
    return { publicKey: 'MOCK_WALLET_ADDRESS', authToken: 'mock' };
  }

  const { transact } = await import(
    '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
  );

  const result = await transact(async (wallet) => {
    const auth = await wallet.reauthorize({
      auth_token: authToken,
      identity: APP_IDENTITY,
    });

    const firstAccount = auth.accounts[0];
    const addressBytes = toByteArray(firstAccount.address);
    const publicKey = new PublicKey(addressBytes).toBase58();

    return {
      publicKey,
      authToken: auth.auth_token,
      walletLabel: firstAccount.label,
    };
  });

  return result;
}

/**
 * Disconnect — deauthorizes the session in the wallet app.
 */
export async function disconnectWallet(authToken: string): Promise<void> {
  if (Platform.OS === 'web' || !authToken || authToken === 'mock') return;

  const { transact } = await import(
    '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
  );

  await transact(async (wallet) => {
    await wallet.deauthorize({ auth_token: authToken });
  });
}
```

**Step 2: Create barrel export**

```typescript
// src/services/solana/index.ts
export { connection, CLUSTER, RPC_ENDPOINT } from './connection';
export {
  connectWallet,
  reconnectWallet,
  disconnectWallet,
  type WalletSession,
} from './walletService';
```

**Step 3: Install base64-js (needed for address decoding)**

Run: `npm install base64-js`

Note: Check if it's already available transitively. If `toByteArray` import fails, this is needed.

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to walletService.ts

**Step 5: Commit**

```bash
git add src/services/solana/walletService.ts src/services/solana/index.ts
git commit -m "feat: add MWA wallet service with connect/reconnect/disconnect"
```

---

### Task 3: Update User Store for Auth Token

**Files:**
- Modify: `src/types/user.ts`
- Modify: `src/stores/userStore.ts`

**Step 1: Add authToken to UserProfile type**

In `src/types/user.ts`, add the `authToken` field:

```typescript
export interface UserProfile {
  walletAddress: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  onboardingPhase: OnboardingPhase;
  createdAt: string | null;
  gauntletStartDate: string | null;
  gauntletCompleted: boolean;
  /** MWA auth token for session reuse (auto-reconnect) */
  authToken: string | null;
}
```

**Step 2: Update userStore initialState and setWallet**

In `src/stores/userStore.ts`:

- Add `authToken: null` to `initialState`
- Update `setWallet` to accept and store `authToken`
- Update `disconnect` to clear `authToken`

```typescript
interface UserStore extends UserProfile {
  setWallet: (address: string, authToken?: string) => void;
  disconnect: () => void;
  setOnboardingPhase: (phase: OnboardingPhase) => void;
  setDisplayName: (name: string) => void;
  completeGauntlet: () => void;
}

const initialState: UserProfile = {
  walletAddress: null,
  displayName: null,
  avatarUrl: null,
  onboardingPhase: 'auth',
  createdAt: null,
  gauntletStartDate: null,
  gauntletCompleted: false,
  authToken: null,
};
```

Update `setWallet`:
```typescript
setWallet: (address, authToken) =>
  set({
    walletAddress: address,
    authToken: authToken ?? null,
    onboardingPhase: 'onboarding',
    createdAt: new Date().toISOString(),
  }),
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/types/user.ts src/stores/userStore.ts
git commit -m "feat: add authToken to user store for MWA session persistence"
```

---

### Task 4: Wire Up WalletConnectScreen

**Files:**
- Modify: `src/screens/auth/WalletConnectScreen.tsx`

**Step 1: Replace mock connection with real wallet service**

```typescript
// src/screens/auth/WalletConnectScreen.tsx
import { useState } from 'react';
import { View, Text, Pressable, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '@/stores';
import { connectWallet } from '@/services/solana';

export function WalletConnectScreen() {
  const setWallet = useUserStore((s) => s.setWallet);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const session = await connectWallet();
      setWallet(session.publicKey, session.authToken);
    } catch (error: any) {
      // Handle specific MWA errors
      const code = error?.code;
      if (code === 'ERROR_WALLET_NOT_FOUND') {
        Alert.alert(
          'No Wallet Found',
          'Install a Solana wallet like Phantom to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Get Phantom',
              onPress: () => Linking.openURL('https://phantom.app/download'),
            },
          ],
        );
      } else if (code === 'ERROR_AUTHORIZATION_FAILED') {
        // User rejected — do nothing, they can try again
      } else {
        Alert.alert('Connection Failed', 'Something went wrong. Please try again.');
        console.warn('Wallet connect error:', error);
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-4xl font-bold text-white">Locked In</Text>
        <Text className="mt-3 text-center text-base text-neutral-400">
          Lock your funds. Light the flame. Learn or burn.
        </Text>

        <Pressable
          className="mt-12 w-full rounded-xl bg-purple-600 px-6 py-4 active:bg-purple-700"
          onPress={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center text-lg font-semibold text-white">
              Connect Wallet
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/screens/auth/WalletConnectScreen.tsx
git commit -m "feat: wire WalletConnectScreen to real MWA wallet service"
```

---

### Task 5: Add Auto-Reconnect on App Launch

**Files:**
- Modify: `App.tsx`

**Step 1: Read current App.tsx**

Read the file to understand existing structure before modifying.

**Step 2: Add reconnect effect**

Add a `useEffect` in App.tsx (or AppNavigator) that checks for a stored `authToken` on mount and attempts silent reconnect. If it fails, clear the auth state so the user sees the connect screen.

```typescript
// Add to App.tsx or wrap in a component near the root
import { useEffect } from 'react';
import { useUserStore } from '@/stores';
import { reconnectWallet } from '@/services/solana';

function useAutoReconnect() {
  const authToken = useUserStore((s) => s.authToken);
  const walletAddress = useUserStore((s) => s.walletAddress);
  const setWallet = useUserStore((s) => s.setWallet);
  const disconnect = useUserStore((s) => s.disconnect);

  useEffect(() => {
    // Only attempt if we have a cached session
    if (!authToken || !walletAddress) return;

    reconnectWallet(authToken)
      .then((session) => {
        // Refresh the stored token (it may have rotated)
        setWallet(session.publicKey, session.authToken);
      })
      .catch(() => {
        // Token expired or invalid — send back to connect screen
        disconnect();
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 4: Test manually**

1. Run on Android device with Phantom installed
2. Connect wallet → should open Phantom
3. Kill and reopen app → should auto-reconnect silently

**Step 5: Commit**

```bash
git add App.tsx
git commit -m "feat: add auto-reconnect on app launch using cached MWA auth token"
```

---

### Task 6: Update Wallet Connection Documentation

**Files:**
- Modify: `docs/01-wallet-connection.md`

**Step 1: Update Current State section**

Change from "Currently mocked" to reflect the real implementation. Update Related Files to include the new service files. Keep the rest of the doc as-is since the design matches what was already described.

**Step 2: Commit**

```bash
git add docs/01-wallet-connection.md
git commit -m "docs: update wallet connection doc to reflect MWA implementation"
```

---

## Risk Notes

- **Signing/fees**: This plan only covers wallet *connection* (authorization). No transactions are signed or sent. No fees are incurred.
- **Auth token storage**: The MWA auth token is stored in AsyncStorage (unencrypted). This is acceptable for devnet. For mainnet, consider expo-secure-store.
- **base64 address decoding**: MWA returns base64-encoded addresses. The plan uses `base64-js` to decode. If this dependency causes issues, `Buffer.from(addr, 'base64')` is an alternative since Buffer is already polyfilled.
- **Platform.OS checks**: Web stays mocked. The `connectWallet()` function returns a mock session on web so the app remains testable in browser during development.
