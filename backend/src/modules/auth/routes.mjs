import { badRequest, unauthorized } from '../../lib/errors.mjs';
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from '../../lib/jwt.mjs';
import { consumeChallenge, createChallenge } from './state.mjs';

function assertWalletAddress(value) {
  if (!value || typeof value !== 'string') {
    throw badRequest('walletAddress is required', 'MISSING_WALLET_ADDRESS');
  }
  return value;
}

function assertSignature(value) {
  if (!value || typeof value !== 'string') {
    throw badRequest('signature is required', 'MISSING_SIGNATURE');
  }
  return value;
}

async function buildSession(walletAddress) {
  const accessToken = await signAccessToken(walletAddress);
  const refreshToken = await signRefreshToken(walletAddress);

  return {
    accessToken,
    refreshToken,
    // Mirror 15m default from config for mobile scheduling hints.
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

export async function authRoutes(app) {
  app.post('/v1/auth/challenge', async (request) => {
    const walletAddress = assertWalletAddress(request.body?.walletAddress);
    return createChallenge(walletAddress);
  });

  app.post('/v1/auth/verify', async (request) => {
    const walletAddress = assertWalletAddress(request.body?.walletAddress);
    const challengeId = request.body?.challengeId;
    const signature = assertSignature(request.body?.signature);

    if (!challengeId || typeof challengeId !== 'string') {
      throw badRequest('challengeId is required', 'MISSING_CHALLENGE_ID');
    }

    const challenge = consumeChallenge(challengeId, walletAddress);
    if (!challenge) {
      throw unauthorized('Invalid or expired challenge', 'INVALID_CHALLENGE');
    }

    // TODO: Replace this placeholder with real wallet signature verification
    // using tweetnacl/ed25519 against challenge.message bytes.
    if (signature.length < 16) {
      throw unauthorized('Signature is too short', 'INVALID_SIGNATURE');
    }

    return buildSession(walletAddress);
  });

  app.post('/v1/auth/refresh', async (request) => {
    const refreshToken = request.body?.refreshToken;
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw badRequest('refreshToken is required', 'MISSING_REFRESH_TOKEN');
    }

    const decoded = await verifyToken(refreshToken, 'refresh');
    return buildSession(decoded.walletAddress);
  });
}
