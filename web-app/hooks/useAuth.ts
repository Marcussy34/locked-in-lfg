'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWalletSession, useDisconnectWallet } from '@solana/react-hooks';
import { useUserStore } from '@/stores';
import { createAuthChallenge, verifyAuthChallenge } from '@/services/api/auth/authApi';

// Cookie flag for proxy auth guard (server-side check)
function setAuthCookie(value: boolean) {
  if (value) {
    document.cookie = 'locked-in-auth=1; path=/; max-age=604800; samesite=lax';
  } else {
    document.cookie = 'locked-in-auth=; path=/; max-age=0';
  }
}

/**
 * Handles the challenge -> sign -> JWT auth flow after wallet connects.
 * Watches the wallet session and triggers auth when a new wallet connects.
 */
export function useAuth() {
  const session = useWalletSession();
  const disconnect = useDisconnectWallet();
  const authInFlight = useRef(false);
  const [authError, setAuthError] = useState<string | null>(null);
  // Track which address we already attempted auth for to prevent retry loops
  const attemptedRef = useRef<string | null>(null);

  const walletAddress = useUserStore((s) => s.walletAddress);
  const accessToken = useUserStore((s) => s.authToken);
  const setWallet = useUserStore((s) => s.setWallet);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const disconnectUser = useUserStore((s) => s.disconnect);

  // Derive the connected wallet address from framework-kit session
  const connectedAddress = session?.account?.address?.toString() ?? null;

  // Run auth flow when wallet connects
  const authenticate = useCallback(async (address: string) => {
    if (authInFlight.current) return;
    authInFlight.current = true;
    setAuthError(null);

    try {
      // 1. Request challenge from backend
      const challenge = await createAuthChallenge({ walletAddress: address });

      // 2. Sign the challenge message using the wallet
      if (!session?.signMessage) {
        throw new Error('Wallet does not support message signing.');
      }
      const messageBytes = new TextEncoder().encode(challenge.message);
      const signatureBytes = await session.signMessage(messageBytes);

      // 3. Convert signature to base64 for backend verification
      const signature = btoa(
        String.fromCharCode(...signatureBytes),
      );

      // 4. Verify with backend to get JWT
      const authSession = await verifyAuthChallenge({
        walletAddress: address,
        challengeId: challenge.challengeId,
        signature,
      });

      // 5. Store in Zustand (persisted to localStorage)
      setWallet(address);
      setAuthSession(authSession.accessToken, authSession.refreshToken);
      setAuthCookie(true);
      attemptedRef.current = null;
    } catch (error) {
      console.error('[auth] Authentication failed:', error);
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(message);
      // Mark this address as attempted so we don't retry automatically
      attemptedRef.current = address;
      // Don't disconnect the wallet — let user retry or disconnect manually
    } finally {
      authInFlight.current = false;
    }
  }, [session, setWallet, setAuthSession]);

  // Manual retry
  const retry = useCallback(() => {
    if (connectedAddress) {
      attemptedRef.current = null;
      authenticate(connectedAddress);
    }
  }, [connectedAddress, authenticate]);

  // Manual disconnect
  const handleDisconnect = useCallback(async () => {
    await disconnect();
    disconnectUser();
    setAuthCookie(false);
    setAuthError(null);
    attemptedRef.current = null;
  }, [disconnect, disconnectUser]);

  // Wait for store hydration before auto-auth — prevents sign message
  // from firing when persisted walletAddress/accessToken haven't loaded yet
  const [hydrated, setHydrated] = useState(useUserStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    return useUserStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  // Auto-authenticate when wallet connects (only after store hydration)
  useEffect(() => {
    if (!hydrated) return;

    if (!connectedAddress) {
      // Wallet disconnected
      if (walletAddress) {
        disconnectUser();
        setAuthCookie(false);
      }
      attemptedRef.current = null;
      return;
    }

    // Already authenticated with this address — skip sign message
    if (connectedAddress === walletAddress && accessToken) return;

    // Don't retry automatically if we already failed for this address
    if (attemptedRef.current === connectedAddress) return;

    // New wallet connection — authenticate
    authenticate(connectedAddress);
  }, [hydrated, connectedAddress, walletAddress, accessToken, authenticate, disconnectUser]);

  return {
    isConnected: !!connectedAddress,
    isAuthenticated: !!accessToken,
    walletAddress: connectedAddress,
    authError,
    retry,
    disconnect: handleDisconnect,
  };
}
