import { describe, it, expect } from 'vitest';
import { decodeJwt } from 'jose';
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  getAccessTokenExpiryDate,
  getRefreshTokenExpiryDate,
} from '../../../src/lib/jwt.mjs';

const TEST_WALLET = '7XkPxZ3nM9DqCj2oWkQr4FJ8ZypVcheKNpQ1uRfGi4Bz';

describe('jwt', () => {
  describe('signAccessToken + verifyToken round-trip', () => {
    it('produces a valid JWT decodable by verifyToken', async () => {
      const token = await signAccessToken(TEST_WALLET);
      const result = await verifyToken(token, 'access');

      expect(result.walletAddress).toBe(TEST_WALLET);
      expect(result.tokenId).toBeNull();
      expect(result.payload.type).toBe('access');
    });

    it('decoded payload contains expected standard claims', async () => {
      const token = await signAccessToken(TEST_WALLET);
      const payload = decodeJwt(token);

      expect(payload.iss).toBe('lockedin-api');
      expect(payload.aud).toBe('lockedin-mobile');
      expect(payload.wallet_address).toBe(TEST_WALLET);
      expect(payload.type).toBe('access');
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });
  });

  describe('signRefreshToken', () => {
    it('includes JTI claim', async () => {
      const tokenId = 'test-jti-id-12345';
      const token = await signRefreshToken(TEST_WALLET, tokenId);
      const payload = decodeJwt(token);

      expect(payload.jti).toBe(tokenId);
      expect(payload.type).toBe('refresh');
    });

    it('is verifiable with type=refresh', async () => {
      const tokenId = 'another-jti-id';
      const token = await signRefreshToken(TEST_WALLET, tokenId);
      const result = await verifyToken(token, 'refresh');

      expect(result.walletAddress).toBe(TEST_WALLET);
      expect(result.tokenId).toBe(tokenId);
    });
  });

  describe('verifyToken rejects expired tokens', () => {
    it('throws TOKEN_EXPIRED for expired access token', async () => {
      const pastDate = new Date(Date.now() - 1000);
      const token = await signAccessToken(TEST_WALLET, pastDate);

      await expect(verifyToken(token, 'access')).rejects.toMatchObject({
        statusCode: 401,
        code: 'TOKEN_EXPIRED',
      });
    });

    it('throws TOKEN_EXPIRED for expired refresh token', async () => {
      const pastDate = new Date(Date.now() - 1000);
      const token = await signRefreshToken(TEST_WALLET, 'some-jti', pastDate);

      await expect(verifyToken(token, 'refresh')).rejects.toMatchObject({
        statusCode: 401,
        code: 'TOKEN_EXPIRED',
      });
    });
  });

  describe('verifyToken rejects wrong audience/issuer', () => {
    it('rejects token with wrong issuer', async () => {
      // Create a token manually with wrong issuer using jose
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'test-jwt-secret-that-is-at-least-32-characters-long-for-hs256',
      );

      const token = await new SignJWT({ wallet_address: TEST_WALLET, type: 'access' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('wrong-issuer')
        .setAudience('lockedin-mobile')
        .setExpirationTime('1h')
        .sign(secret);

      await expect(verifyToken(token, 'access')).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_TOKEN',
      });
    });

    it('rejects token with wrong audience', async () => {
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'test-jwt-secret-that-is-at-least-32-characters-long-for-hs256',
      );

      const token = await new SignJWT({ wallet_address: TEST_WALLET, type: 'access' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('lockedin-api')
        .setAudience('wrong-audience')
        .setExpirationTime('1h')
        .sign(secret);

      await expect(verifyToken(token, 'access')).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_TOKEN',
      });
    });
  });

  describe('verifyToken with type mismatch', () => {
    it('rejects refresh token when expecting access', async () => {
      const token = await signRefreshToken(TEST_WALLET, 'jti-123');

      await expect(verifyToken(token, 'access')).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_TOKEN_TYPE',
      });
    });

    it('rejects access token when expecting refresh', async () => {
      const token = await signAccessToken(TEST_WALLET);

      await expect(verifyToken(token, 'refresh')).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_TOKEN_TYPE',
      });
    });
  });

  describe('verifyToken rejects garbage strings', () => {
    it('rejects completely invalid string', async () => {
      await expect(verifyToken('not-a-jwt', 'access')).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_TOKEN',
      });
    });

    it('rejects empty string', async () => {
      await expect(verifyToken('', 'access')).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_TOKEN',
      });
    });

    it('rejects malformed base64 JWT-like string', async () => {
      await expect(verifyToken('eyJ.eyJ.sig', 'access')).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_TOKEN',
      });
    });
  });

  describe('token expiry dates are in correct ranges', () => {
    it('access token expiry is approximately 15 minutes from now', () => {
      const before = Date.now();
      const expiryDate = getAccessTokenExpiryDate();
      const after = Date.now();

      const expectedMs = 15 * 60 * 1000;
      const diff = expiryDate.getTime() - before;

      expect(diff).toBeGreaterThanOrEqual(expectedMs - 100);
      expect(diff).toBeLessThanOrEqual(expectedMs + (after - before) + 100);
    });

    it('refresh token expiry is approximately 30 days from now', () => {
      const before = Date.now();
      const expiryDate = getRefreshTokenExpiryDate();
      const after = Date.now();

      const expectedMs = 30 * 86_400_000;
      const diff = expiryDate.getTime() - before;

      expect(diff).toBeGreaterThanOrEqual(expectedMs - 100);
      expect(diff).toBeLessThanOrEqual(expectedMs + (after - before) + 100);
    });
  });
});
