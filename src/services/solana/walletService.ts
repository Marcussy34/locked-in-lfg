// src/services/solana/walletService.ts
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { toByteArray } from 'base64-js';

// App identity shown in wallet approval prompt
const APP_IDENTITY = {
  name: 'Locked In',
};

// MWA chain identifier for devnet
const CHAIN = 'solana:devnet';

const MWA_UNAVAILABLE_CODE = 'ERROR_WALLET_ADAPTER_UNAVAILABLE';
const MWA_UNAVAILABLE_MESSAGE =
  'Mobile Wallet Adapter is unavailable in this build. Use an Android custom dev build with native Solana MWA support.';

export interface WalletSession {
  /** Base58-encoded public key */
  publicKey: string;
  /** MWA auth token for session reuse */
  authToken: string;
  /** Wallet label (e.g. "Phantom") */
  walletLabel?: string;
}

function createMWAUnavailableError(cause?: unknown): Error & { code: string } {
  const error = new Error(MWA_UNAVAILABLE_MESSAGE) as Error & {
    code: string;
    cause?: unknown;
  };
  error.name = 'WalletServiceError';
  error.code = MWA_UNAVAILABLE_CODE;
  error.cause = cause;
  return error;
}

function hasNativeMWAModule(): boolean {
  const turboRegistry = TurboModuleRegistry as {
    get?: (name: string) => unknown;
  };
  return Boolean(
    turboRegistry.get?.('SolanaMobileWalletAdapter') ||
      (NativeModules as Record<string, unknown>).SolanaMobileWalletAdapter,
  );
}

async function loadTransact() {
  // MWA native module is required and currently available only on Android native builds.
  if (Platform.OS !== 'android' || !hasNativeMWAModule()) {
    throw createMWAUnavailableError();
  }

  try {
    const module = await import(
      '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
    );
    if (typeof module.transact !== 'function') {
      throw createMWAUnavailableError();
    }
    return module.transact;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('SolanaMobileWalletAdapter') ||
      message.includes('TurboModuleRegistry.getEnforcing')
    ) {
      throw createMWAUnavailableError(error);
    }
    throw error;
  }
}

/**
 * Connect to a wallet via MWA. Opens the user's wallet app for approval.
 */
export async function connectWallet(): Promise<WalletSession> {
  if (Platform.OS === 'web') {
    return { publicKey: 'MOCK_WALLET_ADDRESS', authToken: 'mock' };
  }

  const transact = await loadTransact();

  const result = await transact(async (wallet) => {
    const auth = await wallet.authorize({
      identity: APP_IDENTITY,
      chain: CHAIN,
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
 * Reconnect using a cached auth token. Silent — no wallet app popup if token is still valid.
 */
export async function reconnectWallet(authToken: string): Promise<WalletSession> {
  if (Platform.OS === 'web') {
    return { publicKey: 'MOCK_WALLET_ADDRESS', authToken: 'mock' };
  }

  const transact = await loadTransact();

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

  const transact = await loadTransact();

  await transact(async (wallet) => {
    await wallet.deauthorize({ auth_token: authToken });
  });
}
