import { randomBytes } from 'node:crypto';
import bs58 from 'bs58';

export function generateTestWallet() {
  const bytes = randomBytes(32);
  return bs58.encode(bytes);
}

export async function getTestAuthHeaders(walletAddress) {
  // Import dynamically so env.mjs has run first
  const { signAccessToken } = await import('../../src/lib/jwt.mjs');
  const token = await signAccessToken(walletAddress);
  return {
    authorization: `Bearer ${token}`,
  };
}

export async function getTestAccessToken(walletAddress) {
  const { signAccessToken } = await import('../../src/lib/jwt.mjs');
  return signAccessToken(walletAddress);
}
