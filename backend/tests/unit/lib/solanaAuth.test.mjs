import { describe, it, expect } from 'vitest';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { verifySolanaChallengeSignature } from '../../../src/lib/solanaAuth.mjs';

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

describe('solanaAuth - verifySolanaChallengeSignature', () => {
  describe('valid signatures', () => {
    it('returns true for a correctly signed message', () => {
      const { keypair, walletAddress } = createTestKeypair();
      const message = 'Locked In authentication\nWallet: test\nNonce: abc123';
      const signature = signMessage(message, keypair.secretKey);

      const result = verifySolanaChallengeSignature({
        walletAddress,
        message,
        signature,
      });

      expect(result).toBe(true);
    });

    it('accepts base64 encoded signatures', () => {
      const { keypair, walletAddress } = createTestKeypair();
      const message = 'Test challenge message';
      const messageBytes = new TextEncoder().encode(message);
      const sigBytes = nacl.sign.detached(messageBytes, keypair.secretKey);
      const signature = Buffer.from(sigBytes).toString('base64');

      const result = verifySolanaChallengeSignature({
        walletAddress,
        message,
        signature,
      });

      expect(result).toBe(true);
    });

    it('accepts combined signature+message format (nacl.sign output)', () => {
      const { keypair, walletAddress } = createTestKeypair();
      const message = 'Test combined format';
      const messageBytes = new TextEncoder().encode(message);
      // nacl.sign produces signature || message (combined)
      const combined = nacl.sign(messageBytes, keypair.secretKey);
      const signature = bs58.encode(combined);

      const result = verifySolanaChallengeSignature({
        walletAddress,
        message,
        signature,
      });

      expect(result).toBe(true);
    });
  });

  describe('invalid signatures', () => {
    it('returns false when signature is from wrong public key', () => {
      const { keypair: signerKeypair } = createTestKeypair();
      const { walletAddress: differentWallet } = createTestKeypair();
      const message = 'Locked In authentication\nTest message';
      const signature = signMessage(message, signerKeypair.secretKey);

      const result = verifySolanaChallengeSignature({
        walletAddress: differentWallet,
        message,
        signature,
      });

      expect(result).toBe(false);
    });

    it('returns false when message is tampered with', () => {
      const { keypair, walletAddress } = createTestKeypair();
      const originalMessage = 'Original message content';
      const signature = signMessage(originalMessage, keypair.secretKey);

      const result = verifySolanaChallengeSignature({
        walletAddress,
        message: 'Tampered message content',
        signature,
      });

      expect(result).toBe(false);
    });
  });

  describe('invalid walletAddress', () => {
    it('throws for non-base58 wallet address', () => {
      const { keypair } = createTestKeypair();
      const message = 'Test message';
      const signature = signMessage(message, keypair.secretKey);

      expect(() =>
        verifySolanaChallengeSignature({
          walletAddress: '!!!not-base58!!!',
          message,
          signature,
        }),
      ).toThrow('walletAddress must be valid base58');
    });

    it('throws for wallet address with wrong byte length', () => {
      const { keypair } = createTestKeypair();
      const message = 'Test message';
      const signature = signMessage(message, keypair.secretKey);
      // Encode only 16 bytes (wrong length, should be 32)
      const shortWallet = bs58.encode(new Uint8Array(16));

      expect(() =>
        verifySolanaChallengeSignature({
          walletAddress: shortWallet,
          message,
          signature,
        }),
      ).toThrow('walletAddress must decode to 32-byte Ed25519 public key');
    });
  });

  describe('invalid signature encoding', () => {
    it('throws for completely invalid signature string', () => {
      const { walletAddress } = createTestKeypair();
      const message = 'Test message';

      // An empty string or whitespace-only string won't decode to any valid bytes
      // Actually the decoder tries base58, base64, hex in order -- we need something
      // that all three reject or produce zero bytes. An empty string will fail.
      expect(() =>
        verifySolanaChallengeSignature({
          walletAddress,
          message,
          signature: '',
        }),
      ).toThrow();
    });
  });
});
