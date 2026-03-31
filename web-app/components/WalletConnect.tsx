'use client';

import { useLogin, usePrivy } from '@privy-io/react-auth';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStore, useUserStore } from '@/stores';
import { useFlameStore } from '@/stores/flameStore';
import { getUserEnrollments } from '@/services/api/progress/progressApi';
import { T } from './theme';

export function WalletConnect() {
  const { ready, authenticated } = usePrivy();
  const {
    isReady,
    isConnected,
    isAuthenticated,
    walletAddress,
    authError,
    authInProgress,
    markFreshLogin,
    retry,
    disconnect,
  } = useAuth();

  const { login } = useLogin({
    onComplete: async () => {
      // Auth hook auto-triggers challenge-sign-verify when wallet becomes available.
      // After JWT is obtained, sync backend state.
      const waitForToken = () =>
        new Promise<string | null>((resolve) => {
          // Poll briefly for the auth token to be set by the useAuth hook
          let attempts = 0;
          const check = () => {
            const token = useUserStore.getState().authToken;
            if (token || attempts > 20) {
              resolve(token);
              return;
            }
            attempts++;
            setTimeout(check, 250);
          };
          check();
        });

      const token = await waitForToken();
      if (!token) return;
      try {
        const data = await getUserEnrollments(token);
        useCourseStore.getState().restoreFromBackend(data);
        const bestStreak = Math.max(
          ...data.enrollments.map((e) => e.runtime?.currentStreak ?? 0),
          0,
        );
        if (bestStreak > 0) {
          useFlameStore.getState().updateFromStreak(bestStreak);
        }
      } catch {
        // Fail silently — local state is still usable
      }
    },
    onError: (error) => {
      console.error('[wallet] Login failed:', error);
    },
  });

  // Loading — Privy not ready yet
  if (!ready || !isReady) {
    return (
      <div className="flex justify-center">
        <div
          className="h-12 w-48 rounded-lg animate-pulse"
          style={{ backgroundColor: `${T.violet}20` }}
        />
      </div>
    );
  }

  // Connected + authenticated — show address + disconnect
  if (isConnected && isAuthenticated && walletAddress) {
    const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg border"
          style={{
            borderColor: `${T.green}30`,
            backgroundColor: `${T.green}08`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: T.green }}
          />
          <span className="text-xs font-medium" style={{ color: T.green }}>
            Connected
          </span>
          <span className="text-xs font-mono" style={{ color: T.textSecondary }}>
            {shortAddress}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="text-xs underline"
          style={{ color: T.textMuted }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Auth error — show retry + disconnect
  if (authError) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-center" style={{ color: T.crimson }}>
          {authError}
        </p>
        <div className="flex gap-3">
          <button
            onClick={retry}
            className="px-4 py-2 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: T.violet,
              color: '#fff',
              border: '1px solid #B06AFF',
            }}
          >
            Retry
          </button>
          <button
            onClick={disconnect}
            className="px-4 py-2 rounded-lg text-xs font-semibold"
            style={{
              backgroundColor: 'transparent',
              color: T.textSecondary,
              border: `1px solid ${T.borderDormant}`,
            }}
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // Privy authenticated but backend auth in progress
  if (authenticated && authInProgress) {
    return (
      <div className="flex justify-center">
        <button
          disabled
          className="w-full max-w-xs py-3 rounded-lg text-sm font-semibold opacity-60"
          style={{
            backgroundColor: T.violet,
            color: '#fff',
            border: '1px solid #B06AFF',
          }}
        >
          Signing in...
        </button>
      </div>
    );
  }

  // Privy has a session but no backend JWT — let user continue or switch
  if (authenticated && !isAuthenticated && !authInProgress) {
    const shortAddr = walletAddress
      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
      : '';
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <p className="text-xs" style={{ color: T.textSecondary }}>
          Welcome back{shortAddr ? ` (${shortAddr})` : ''}
        </p>
        <button
          onClick={() => { markFreshLogin(); }}
          className="w-full max-w-xs py-3.5 rounded-lg text-sm font-bold tracking-wide"
          style={{
            backgroundColor: T.violet,
            color: '#fff',
            border: '1px solid #B06AFF',
            fontFamily: 'Georgia, serif',
          }}
        >
          Continue
        </button>
        <button
          onClick={disconnect}
          className="text-xs underline"
          style={{ color: T.textMuted }}
        >
          Use a different account
        </button>
      </div>
    );
  }

  // Not authenticated — show dual sign-in
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Primary: Google sign-in */}
      <button
        onClick={() => { markFreshLogin(); login({ loginMethods: ['google'] }); }}
        className="w-full max-w-xs py-3.5 rounded-lg text-sm font-bold tracking-wide flex items-center justify-center gap-2"
        style={{
          backgroundColor: T.violet,
          color: '#fff',
          border: '1px solid #B06AFF',
          fontFamily: 'Georgia, serif',
        }}
      >
        <svg viewBox="0 0 18 18" width={16} height={16} fill="none">
          <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.79 2.72v2.26h2.9c1.7-1.56 2.68-3.87 2.68-6.62z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A8.99 8.99 0 009 18z" fill="#34A853"/>
          <path d="M3.96 10.71A5.41 5.41 0 013.68 9c0-.6.1-1.17.28-1.71V4.96H.96A8.99 8.99 0 000 9c0 1.45.35 2.82.96 4.04l3-2.33z" fill="#FBBC05"/>
          <path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A8.99 8.99 0 00.96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <div className="flex-1 h-px" style={{ backgroundColor: T.borderDormant }} />
        <span className="text-[10px]" style={{ color: T.textMuted }}>or</span>
        <div className="flex-1 h-px" style={{ backgroundColor: T.borderDormant }} />
      </div>

      {/* Secondary: Connect existing wallet */}
      <button
        onClick={() => { markFreshLogin(); login({ loginMethods: ['wallet'] }); }}
        className="text-xs underline"
        style={{ color: T.textSecondary }}
      >
        Connect existing wallet
      </button>
    </div>
  );
}
