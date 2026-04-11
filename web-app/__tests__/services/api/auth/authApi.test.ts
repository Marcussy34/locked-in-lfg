import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock httpClient before importing authApi
vi.mock('@/services/api/httpClient', () => ({
  httpRequest: vi.fn(),
}));

import { httpRequest } from '@/services/api/httpClient';
import {
  createAuthChallenge,
  verifyAuthChallenge,
  refreshAuthSession,
} from '@/services/api/auth/authApi';

describe('authApi', () => {
  beforeEach(() => {
    vi.mocked(httpRequest).mockReset();
  });

  describe('createAuthChallenge', () => {
    it('sends POST to /v1/auth/challenge with walletAddress', async () => {
      const mockResponse = {
        challengeId: 'challenge-123',
        message: 'Sign this message',
        expiresAt: '2024-01-01T00:10:00Z',
      };
      vi.mocked(httpRequest).mockResolvedValueOnce(mockResponse);

      const result = await createAuthChallenge({ walletAddress: 'MyWallet123' });

      expect(httpRequest).toHaveBeenCalledWith('/v1/auth/challenge', {
        method: 'POST',
        body: { walletAddress: 'MyWallet123' },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('verifyAuthChallenge', () => {
    it('sends POST to /v1/auth/verify with signature', async () => {
      const mockSession = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresAt: '2024-01-01T01:00:00Z',
      };
      vi.mocked(httpRequest).mockResolvedValueOnce(mockSession);

      const result = await verifyAuthChallenge({
        walletAddress: 'MyWallet123',
        challengeId: 'challenge-123',
        signature: 'base64sig==',
      });

      expect(httpRequest).toHaveBeenCalledWith('/v1/auth/verify', {
        method: 'POST',
        body: {
          walletAddress: 'MyWallet123',
          challengeId: 'challenge-123',
          signature: 'base64sig==',
        },
      });
      expect(result).toEqual(mockSession);
    });
  });

  describe('refreshAuthSession', () => {
    it('sends POST to /v1/auth/refresh with refresh token', async () => {
      const mockSession = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresAt: '2024-01-01T02:00:00Z',
      };
      vi.mocked(httpRequest).mockResolvedValueOnce(mockSession);

      const result = await refreshAuthSession({ refreshToken: 'old-refresh' });

      expect(httpRequest).toHaveBeenCalledWith('/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken: 'old-refresh' },
      });
      expect(result).toEqual(mockSession);
    });
  });
});
