'use client';

import { useWalletConnection } from '@solana/react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { T } from './theme';

/**
 * Wallet connect dropdown — lists discovered Wallet Standard wallets.
 * Uses framework-kit's useWalletConnection for headless wallet management.
 */
export function WalletConnect() {
  const { connectors, connected, connecting, connect, disconnect, wallet, isReady } =
    useWalletConnection();
  const { isAuthenticated, authError, retry, disconnect: authDisconnect } = useAuth();

  // SSR hydration guard — show placeholder until client-side ready
  if (!isReady) {
    return (
      <div className="h-12 w-48 bg-white/5 rounded-lg animate-pulse" />
    );
  }

  // Connected state — show address + disconnect
  if (connected && wallet) {
    const address = wallet.account.address.toString();
    const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`;

    return (
      <div className="flex flex-col items-center gap-3">
        {/* Auth error with retry */}
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
                onClick={authDisconnect}
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
              onClick={authDisconnect}
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

  // Connecting state
  if (connecting) {
    return (
      <button
        disabled
        className="px-6 py-3 rounded-lg cursor-wait"
        style={{
          backgroundColor: 'rgba(153,69,255,0.5)',
          color: '#1A1000',
          fontFamily: 'Georgia, serif',
          fontWeight: 800,
          letterSpacing: 2.5,
          textTransform: 'uppercase' as const,
        }}
      >
        Connecting...
      </button>
    );
  }

  // No wallets discovered
  if (connectors.length === 0) {
    return (
      <div className="text-center space-y-2">
        <p className="text-foreground/50 text-sm">
          No Solana wallet detected.
        </p>
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
    const connector = connectors[0];
    return (
      <button
        onClick={() => connect(connector.id)}
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

  // Multiple wallets — list
  return (
    <div className="flex flex-col gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect(connector.id)}
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
