import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { createTestServer, closeTestServer } from '../../helpers/test-server.mjs';

let app;
beforeAll(async () => { app = await createTestServer(); });
afterAll(async () => { await closeTestServer(app); });

function createTestKeypair() {
  const keypair = nacl.sign.keyPair();
  const walletAddress = bs58.encode(keypair.publicKey);
  return { keypair, walletAddress };
}

function signMessage(message, secretKey) {
  const messageBytes = new TextEncoder().encode(message);
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return bs58.encode(signature);
}

describe('POST /v1/auth/challenge', () => {
  it('returns challengeId, message, and expiresAt for valid walletAddress', async () => {
    const { walletAddress } = createTestKeypair();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/challenge',
      payload: { walletAddress },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.challengeId).toBeDefined();
    expect(typeof body.challengeId).toBe('string');
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
    expect(body.message).toContain('Locked In authentication');
    expect(body.message).toContain(walletAddress);
    expect(body.expiresAt).toBeDefined();
  });

  it('returns 400 when walletAddress is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/challenge',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.code).toBe('MISSING_WALLET_ADDRESS');
  });

  it('returns 400 when walletAddress is not a string', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/challenge',
      payload: { walletAddress: 12345 },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('POST /v1/auth/verify', () => {
  it('returns tokens for valid challenge signature flow', async () => {
    const { keypair, walletAddress } = createTestKeypair();

    // Step 1: Get a challenge
    const challengeResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/challenge',
      payload: { walletAddress },
    });
    const challenge = challengeResponse.json();

    // Step 2: Sign the challenge message
    const signature = signMessage(challenge.message, keypair.secretKey);

    // Step 3: Verify
    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify',
      payload: {
        walletAddress,
        challengeId: challenge.challengeId,
        signature,
      },
    });

    expect(verifyResponse.statusCode).toBe(200);
    const body = verifyResponse.json();
    expect(body.accessToken).toBeDefined();
    expect(typeof body.accessToken).toBe('string');
    expect(body.refreshToken).toBeDefined();
    expect(typeof body.refreshToken).toBe('string');
    expect(body.expiresAt).toBeDefined();
  });

  it('returns 401 for wrong signature', async () => {
    const { keypair, walletAddress } = createTestKeypair();
    const { keypair: wrongKeypair } = createTestKeypair();

    // Get a challenge
    const challengeResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/challenge',
      payload: { walletAddress },
    });
    const challenge = challengeResponse.json();

    // Sign with wrong keypair
    const signature = signMessage(challenge.message, wrongKeypair.secretKey);

    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify',
      payload: {
        walletAddress,
        challengeId: challenge.challengeId,
        signature,
      },
    });

    expect(verifyResponse.statusCode).toBe(401);
    const body = verifyResponse.json();
    expect(body.code).toBe('INVALID_SIGNATURE');
  });

  it('returns 400 when challengeId is missing', async () => {
    const { keypair, walletAddress } = createTestKeypair();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify',
      payload: {
        walletAddress,
        signature: 'somesig',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.code).toBe('MISSING_CHALLENGE_ID');
  });

  it('returns 400 when signature is missing', async () => {
    const { walletAddress } = createTestKeypair();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify',
      payload: {
        walletAddress,
        challengeId: 'some-challenge-id',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.code).toBe('MISSING_SIGNATURE');
  });

  it('returns 401 for invalid/expired challenge', async () => {
    const { keypair, walletAddress } = createTestKeypair();
    const signature = signMessage('fake message', keypair.secretKey);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify',
      payload: {
        walletAddress,
        challengeId: '00000000-0000-0000-0000-000000000000',
        signature,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.code).toBe('INVALID_CHALLENGE');
  });
});

describe('POST /v1/auth/refresh', () => {
  it('returns new token pair for valid refresh token', async () => {
    const { keypair, walletAddress } = createTestKeypair();

    // Authenticate first to get a refresh token
    const challengeResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/challenge',
      payload: { walletAddress },
    });
    const challenge = challengeResponse.json();
    const signature = signMessage(challenge.message, keypair.secretKey);

    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify',
      payload: {
        walletAddress,
        challengeId: challenge.challengeId,
        signature,
      },
    });
    const session = verifyResponse.json();

    // Now refresh
    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: session.refreshToken },
    });

    expect(refreshResponse.statusCode).toBe(200);
    const body = refreshResponse.json();
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.expiresAt).toBeDefined();
    // Tokens are valid JWTs (three dot-separated segments)
    expect(body.accessToken.split('.').length).toBe(3);
    expect(body.refreshToken.split('.').length).toBe(3);
  });

  it('returns 400 when refreshToken is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.code).toBe('MISSING_REFRESH_TOKEN');
  });

  it('returns 401 for an invalid refresh token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: 'not-a-valid-token' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 when using an access token as refresh token', async () => {
    const { keypair, walletAddress } = createTestKeypair();

    // Authenticate
    const challengeResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/challenge',
      payload: { walletAddress },
    });
    const challenge = challengeResponse.json();
    const signature = signMessage(challenge.message, keypair.secretKey);

    const verifyResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/verify',
      payload: {
        walletAddress,
        challengeId: challenge.challengeId,
        signature,
      },
    });
    const session = verifyResponse.json();

    // Try to use access token as refresh
    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: session.accessToken },
    });

    expect(refreshResponse.statusCode).toBe(401);
    const body = refreshResponse.json();
    expect(body.code).toBe('INVALID_TOKEN_TYPE');
  });
});
