import { hasRemoteLessonApi } from '../config';
import { createAuthChallenge, verifyAuthChallenge } from './authApi';

/**
 * Starter backend auth bootstrap.
 * TODO: replace dev signature with real wallet-signed challenge bytes.
 */
export async function issueBackendAccessToken(
  walletAddress: string,
): Promise<string | null> {
  if (!hasRemoteLessonApi() || !walletAddress) {
    return null;
  }

  const challenge = await createAuthChallenge({ walletAddress });
  const signature = `dev-signature-${walletAddress}-${challenge.challengeId}`;

  const session = await verifyAuthChallenge({
    walletAddress,
    challengeId: challenge.challengeId,
    signature,
  });

  return session.accessToken;
}
