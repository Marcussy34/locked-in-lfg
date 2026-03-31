'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignMessage } from '@privy-io/react-auth/solana';
import { useUserStore, useCourseStore } from '@/stores';
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
 * Auth hook — uses Privy for wallet management, our backend for JWT.
 *
 * Flow: Privy login (Google or wallet) → get Solana wallet → challenge-sign-verify → JWT
 *
 * Backend doesn't know about Privy. It just sees an Ed25519 signature.
 */
export function useAuth() {
  const { ready: privyReady, authenticated: privyAuthenticated, logout: privyLogout, user: privyUser } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signMessage } = useSignMessage();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInProgress, setAuthInProgress] = useState(false);

  const walletAddress = useUserStore((s) => s.walletAddress);
  const accessToken = useUserStore((s) => s.authToken);
  const setWallet = useUserStore((s) => s.setWallet);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const disconnectUser = useUserStore((s) => s.disconnect);

  // Get the first Solana wallet (embedded or external)
  const solanaWallet = wallets[0] ?? null;
  const connectedAddress = solanaWallet?.address ?? null;

  // Authenticate with our backend using the Privy-managed wallet
  const authenticate = useCallback(async () => {
    if (!solanaWallet) {
      setAuthError('No Solana wallet available. Please try again.');
      return;
    }

    setAuthError(null);
    setAuthInProgress(true);

    try {
      const address = solanaWallet.address;

      // 1. Request challenge from backend
      const challenge = await createAuthChallenge({ walletAddress: address });

      // 2. Sign the challenge message using Privy wallet
      const messageBytes = new TextEncoder().encode(challenge.message);
      const result = await signMessage({
        message: messageBytes,
        wallet: solanaWallet,
      });

      // 3. Convert signature to base64 for backend verification
      const signature = btoa(
        String.fromCharCode(...result.signature),
      );

      // 4. Verify with backend to get JWT
      const authSession = await verifyAuthChallenge({
        walletAddress: address,
        challengeId: challenge.challengeId,
        signature,
      });

      // 5. Store in Zustand (persisted to localStorage)
      setWallet(address);
      useCourseStore.getState().bindToWallet(address);
      setAuthSession(authSession.accessToken, authSession.refreshToken);
      setAuthCookie(true);
    } catch (error) {
      console.error('[auth] Authentication failed:', error);
      const message = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(message);
    } finally {
      setAuthInProgress(false);
    }
  }, [solanaWallet, signMessage, setWallet, setAuthSession]);

  // Track whether user just logged in this session (not a page reload)
  const [freshLogin, setFreshLogin] = useState(false);

  // Only auto-authenticate after a FRESH login (user clicked sign-in), not on page reload
  useEffect(() => {
    if (
      freshLogin &&
      privyAuthenticated &&
      walletsReady &&
      solanaWallet &&
      !accessToken &&
      !authInProgress &&
      !authError
    ) {
      authenticate();
      setFreshLogin(false);
    }
  }, [freshLogin, privyAuthenticated, walletsReady, solanaWallet, accessToken, authInProgress, authError, authenticate]);

  // Manual retry — called from UI
  const retry = useCallback(() => {
    setAuthError(null);
    authenticate();
  }, [authenticate]);

  // Disconnect — clears Privy + our auth state
  const handleDisconnect = useCallback(async () => {
    await privyLogout();
    disconnectUser();
    setAuthCookie(false);
    setAuthError(null);
  }, [privyLogout, disconnectUser]);

  // Cleanup: if Privy logs out externally, clear our state
  useEffect(() => {
    if (privyReady && !privyAuthenticated && walletAddress) {
      disconnectUser();
      setAuthCookie(false);
    }
  }, [privyReady, privyAuthenticated, walletAddress, disconnectUser]);

  // Called by WalletConnect after user deliberately clicks sign-in
  const markFreshLogin = useCallback(() => setFreshLogin(true), []);

  return {
    isReady: privyReady && walletsReady,
    isConnected: privyAuthenticated && !!connectedAddress,
    isAuthenticated: !!accessToken,
    walletAddress: connectedAddress,
    authError,
    authInProgress,
    loginMethod: privyUser?.google ? 'google' as const : privyAuthenticated ? 'wallet' as const : null,
    authenticate,
    markFreshLogin,
    retry,
    disconnect: handleDisconnect,
  };
}
