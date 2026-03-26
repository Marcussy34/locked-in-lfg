'use client';

import { useState } from 'react';
import { useWalletConnection } from '@solana/react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { T } from './theme';

/**
 * Wallet connect button — imperative flow matching Android's WalletConnectScreen.
 *
 * Android: handleConnect() → connectWallet() → issueBackendSession() → setWallet()
 * Web:     handleConnect() → connect()        → authenticate()        → stores JWT
 *
 * One button press → one connect prompt → one sign prompt → done.
 */
export function WalletConnect() {
  const { connectors, connected, connecting, connect, wallet, isReady } =
    useWalletConnection();
  const { isAuthenticated, authError, authenticate, retry, disconnect } = useAuth();
  const [authInProgress, setAuthInProgress] = useState(false);

  // Imperative connect + auth — mirrors Android's handleConnect exactly
  const handleConnect = async (connectorId: string) => {
    setAuthInProgress(true);
    try {
      // 1. Connect wallet (prompts user once for wallet access)
      await connect(connectorId);

      // 2. Small delay for session to stabilize after connect
      await new Promise((r) => setTimeout(r, 200));

      // 3. Get the connected address from the wallet
      // Note: useWalletConnection doesn't return the address from connect(),
      // so we read it from the wallet session after connection
      const address = wallet?.account?.address?.toString();
      if (!address) {
        // Wallet connected but address not available yet — auth will be
        // handled when the component re-renders with the connected state
        return;
      }

      // 4. Authenticate: challenge → sign → verify (prompts user once for signature)
      await authenticate(address);
    } catch (error) {
      // User rejected or network error — already handled in useAuth
      console.warn('[wallet] Connect/auth failed:', error);
    } finally {
      setAuthInProgress(false);
    }
  };

  // SSR hydration guard
  if (!isReady) {
    return <div className="h-12 w-48 bg-white/5 rounded-lg animate-pulse" />;
  }

  // Connected state — show address + auth status
  if (connected && wallet) {
    const address = wallet.account.address.toString();
    const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

    // If wallet is connected but not authenticated, trigger auth imperatively
    if (!isAuthenticated && !authError && !authInProgress) {
      // Wallet was connected (e.g. auto-reconnect) but JWT is missing — authenticate
      authenticate(address).catch(() => {});
      setAuthInProgress(true);
    }

    return (
      <div className="flex flex-col items-center gap-3">
        {authError && (
          <div className="text-center space-y-2 max-w-xs">
            <p className="text-red-400 text-sm">{authError}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={retry}
                className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-85"
                style={{ backgroundColor: T.violet, color: '#1A1000' }}
              >
                Retry
              </button>
              <button
                onClick={disconnect}
                className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-85"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: T.textPrimary }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {!authError && (
          <div className="flex items-center gap-3">
            <div className="text-sm">
              {isAuthenticated ? (
                <span className="text-green-400">Authenticated</span>
              ) : (
                <span className="text-yellow-400">Signing in...</span>
              )}
            </div>
            <button
              onClick={disconnect}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-85"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: T.textPrimary }}
            >
              {shortAddress}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Connecting / auth in progress
  if (connecting || authInProgress) {
    return (
      <button
        disabled
        className="w-full py-3.5 rounded-lg cursor-wait"
        style={{
          backgroundColor: 'rgba(153,69,255,0.5)',
          color: '#1A1000',
          fontFamily: 'Georgia, serif',
          fontWeight: 800,
          letterSpacing: 2.5,
          textTransform: 'uppercase' as const,
        }}
      >
        {connecting ? 'Connecting...' : 'Signing in...'}
      </button>
    );
  }

  // No wallets discovered
  if (connectors.length === 0) {
    return (
      <div className="text-center space-y-2">
        <p className="text-foreground/50 text-sm">No Solana wallet detected.</p>
        <a
          href="https://phantom.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline transition-opacity hover:opacity-75"
          style={{ color: T.violet }}
        >
          Install Phantom
        </a>
      </div>
    );
  }

  // Single wallet — direct connect
  if (connectors.length === 1) {
    return (
      <button
        onClick={() => handleConnect(connectors[0].id)}
        className="w-full py-3.5 rounded-lg transition-opacity hover:opacity-85"
        style={{
          backgroundColor: T.violet,
          border: '1px solid #B06AFF',
          fontFamily: 'Georgia, serif',
          fontWeight: 800,
          letterSpacing: 2.5,
          textTransform: 'uppercase' as const,
          color: '#1A1000',
          fontSize: 14,
        }}
      >
        Connect Wallet
      </button>
    );
  }

  // Multiple wallets
  return (
    <div className="flex flex-col gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => handleConnect(connector.id)}
          className="w-full py-3.5 rounded-lg transition-opacity hover:opacity-85"
          style={{
            backgroundColor: T.violet,
            border: '1px solid #B06AFF',
            fontFamily: 'Georgia, serif',
            fontWeight: 800,
            letterSpacing: 2.5,
            textTransform: 'uppercase' as const,
            color: '#1A1000',
            fontSize: 14,
          }}
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
