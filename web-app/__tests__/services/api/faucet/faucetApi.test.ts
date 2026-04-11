import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api/httpClient', () => ({
  httpRequest: vi.fn(),
}));

import { httpRequest } from '@/services/api/httpClient';
import { claimFaucet } from '@/services/api/faucet/faucetApi';

describe('faucetApi', () => {
  beforeEach(() => {
    vi.mocked(httpRequest).mockReset();
  });

  describe('claimFaucet', () => {
    it('POSTs to /v1/faucet/claim with auth token', async () => {
      const mockResponse = {
        claimed: true,
        message: 'Faucet claimed successfully',
        sol: { signature: 'SolSig123', amountSol: '0.1' },
        usdc: { signature: 'UsdcSig456', amountUsdc: '10' },
      };
      vi.mocked(httpRequest).mockResolvedValueOnce(mockResponse);

      const result = await claimFaucet('auth-token-123');

      expect(httpRequest).toHaveBeenCalledWith('/v1/faucet/claim', {
        method: 'POST',
        token: 'auth-token-123',
      });
      expect(result.claimed).toBe(true);
      expect(result.sol.signature).toBe('SolSig123');
      expect(result.usdc.amountUsdc).toBe('10');
    });

    it('returns claimed: false when faucet already used', async () => {
      const mockResponse = {
        claimed: false,
        message: 'Already claimed this round',
        sol: { signature: null, amountSol: '0' },
        usdc: { signature: null, amountUsdc: '0' },
      };
      vi.mocked(httpRequest).mockResolvedValueOnce(mockResponse);

      const result = await claimFaucet('auth-token');

      expect(result.claimed).toBe(false);
    });
  });
});
