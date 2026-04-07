import { httpRequest } from '../httpClient';

export interface FaucetClaimResponse {
  claimed: boolean;
  message?: string;
  sol: { signature: string | null; amountSol: string; error?: string };
  usdc: { signature: string | null; amountUsdc: string };
}

export function claimFaucet(token: string): Promise<FaucetClaimResponse> {
  return httpRequest<FaucetClaimResponse>('/v1/faucet/claim', {
    method: 'POST',
    token,
  });
}
