import '@/polyfills/buffer';
import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';
import { connection } from './connection';

const POT_WINDOW_DISCRIMINATOR_HEX = '549500a952fc7390';
const WINDOW_SEED = Buffer.from('window');
const rawProgramId = (process.env.EXPO_PUBLIC_COMMUNITY_POT_PROGRAM_ID ?? '').trim();

export interface CommunityPotSnapshot {
  windowId: number;
  windowLabel: string;
  potWindowAddress: string;
  totalRedirectedAmountUi: string;
  redirectCount: number;
  openedAtDate: string | null;
  lastRecordedAtDate: string | null;
}

function parsePublicKey(value: string): PublicKey | null {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

function readU64LE(bytes: Uint8Array, offset: number): bigint {
  let value = 0n;
  for (let index = 0; index < 8; index += 1) {
    value |= BigInt(bytes[offset + index] ?? 0) << (BigInt(index) * 8n);
  }
  return value;
}

function readI64LE(bytes: Uint8Array, offset: number): bigint {
  const value = readU64LE(bytes, offset);
  return value >= (1n << 63n) ? value - (1n << 64n) : value;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function formatUsdcUi(amountAtomic: bigint): string {
  const whole = amountAtomic / 1_000_000n;
  const fraction = (amountAtomic % 1_000_000n).toString().padStart(6, '0');
  const trimmedFraction = fraction.replace(/0+$/, '');
  return trimmedFraction ? `${whole.toString()}.${trimmedFraction}` : whole.toString();
}

function formatWindowLabel(windowId: number): string {
  const year = Math.floor(windowId / 100);
  const monthIndex = (windowId % 100) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return String(windowId);
  }

  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatTimestamp(seconds: bigint): string | null {
  if (seconds <= 0n) {
    return null;
  }
  return new Date(Number(seconds) * 1000).toISOString();
}

export function hasCommunityPotConfig(): boolean {
  return Boolean(parsePublicKey(rawProgramId));
}

export function getCurrentCommunityPotWindowId(date = new Date()): number {
  return date.getUTCFullYear() * 100 + (date.getUTCMonth() + 1);
}

export function deriveCommunityPotWindowAddress(windowId: number): string {
  const programId = parsePublicKey(rawProgramId);
  if (!programId) {
    throw new Error('Missing EXPO_PUBLIC_COMMUNITY_POT_PROGRAM_ID.');
  }

  const seed = Buffer.alloc(8);
  seed.writeBigInt64LE(BigInt(windowId), 0);
  return PublicKey.findProgramAddressSync([WINDOW_SEED, seed], programId)[0].toBase58();
}

export async function fetchCurrentCommunityPotSnapshot(): Promise<CommunityPotSnapshot> {
  const windowId = getCurrentCommunityPotWindowId();
  const potWindowAddress = deriveCommunityPotWindowAddress(windowId);
  const account = await connection.getAccountInfo(new PublicKey(potWindowAddress), 'confirmed');

  if (!account) {
    return {
      windowId,
      windowLabel: formatWindowLabel(windowId),
      potWindowAddress,
      totalRedirectedAmountUi: '0',
      redirectCount: 0,
      openedAtDate: null,
      lastRecordedAtDate: null,
    };
  }

  const data = account.data;
  if (bytesToHex(data.subarray(0, 8)) !== POT_WINDOW_DISCRIMINATOR_HEX) {
    throw new Error('Account is not a CommunityPot window.');
  }

  let offset = 8;
  offset += 32;
  const decodedWindowId = Number(readI64LE(data, offset));
  offset += 8;
  const totalRedirectedAmount = readU64LE(data, offset);
  offset += 8;
  const redirectCount =
    (data[offset] ?? 0) |
    ((data[offset + 1] ?? 0) << 8) |
    ((data[offset + 2] ?? 0) << 16) |
    ((data[offset + 3] ?? 0) << 24);
  offset += 4;
  const openedAtTs = readI64LE(data, offset);
  offset += 8;
  const lastRecordedAtTs = readI64LE(data, offset);

  return {
    windowId: decodedWindowId,
    windowLabel: formatWindowLabel(decodedWindowId),
    potWindowAddress,
    totalRedirectedAmountUi: formatUsdcUi(totalRedirectedAmount),
    redirectCount,
    openedAtDate: formatTimestamp(openedAtTs),
    lastRecordedAtDate: formatTimestamp(lastRecordedAtTs),
  };
}
