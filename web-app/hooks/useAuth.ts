'use client';

import { useCallback, useEffect, useState } from 'react';
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
 * Auth hook — imperative flow matching the Android app.
 *
 * Android: user taps "Connect Wallet" → handleConnect() runs connect + sign + verify sequentially.
 * Web:     user clicks "Connect Wallet" → WalletConnect calls connect(), then calls authenticate().
 *
 * NO auto-auth effects. The sign message is triggered exactly once by the button handler.
 */
export function useAuth() {
  const session = useWalletSession();
  const disconnect = useDisconnectWallet();
  const [authError, setAuthError] = useState<string | null>(null);

  const walletAddress = useUserStore((s) => s.walletAddress);
  const accessToken = useUserStore((s) => s.authToken);
  const setWallet = useUserStore((s) => s.setWallet);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const disconnectUser = useUserStore((s) => s.disconnect);

  const connectedAddress = session?.account?.address?.toString() ?? null;

  // Imperative auth — called directly by WalletConnect after connect() succeeds.
  // Mirrors Android's handleConnect: challenge → sign → verify → store.
  const authenticate = useCallback(async (address: string) => {
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
    } catch (error) {
      console.error('[auth] Authentication failed:', error);
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(message);
      throw error; // Let caller handle
    }
  }, [session, setWallet, setAuthSession]);

  // Manual retry — called from WalletConnect UI
  const retry = useCallback(() => {
    if (connectedAddress) {
      authenticate(connectedAddress).catch(() => {});
    }
  }, [connectedAddress, authenticate]);

  // Disconnect — clears wallet + auth state
  const handleDisconnect = useCallback(async () => {
    await disconnect();
    disconnectUser();
    setAuthCookie(false);
    setAuthError(null);
  }, [disconnect, disconnectUser]);

  // Cleanup: if wallet disconnects externally, clear auth state
  useEffect(() => {
    if (!connectedAddress && walletAddress) {
      disconnectUser();
      setAuthCookie(false);
    }
  }, [connectedAddress, walletAddress, disconnectUser]);

  return {
    isConnected: !!connectedAddress,
    isAuthenticated: !!accessToken,
    walletAddress: connectedAddress,
    authError,
    authenticate, // Exposed for imperative use by WalletConnect
    retry,
    disconnect: handleDisconnect,
  };
}
