import { randomUUID } from 'node:crypto';

const challenges = new Map();

export function createChallenge(walletAddress) {
  const challengeId = randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const nonce = randomUUID();

  const message = [
    'Locked In authentication',
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Challenge: ${challengeId}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');

  challenges.set(challengeId, {
    walletAddress,
    message,
    expiresAt,
    consumed: false,
  });

  return {
    challengeId,
    message,
    expiresAt: expiresAt.toISOString(),
  };
}

export function consumeChallenge(challengeId, walletAddress) {
  const challenge = challenges.get(challengeId);
  if (!challenge) return null;

  if (challenge.walletAddress !== walletAddress) return null;
  if (challenge.consumed) return null;
  if (new Date() > challenge.expiresAt) return null;

  challenge.consumed = true;
  challenges.set(challengeId, challenge);

  return challenge;
}
