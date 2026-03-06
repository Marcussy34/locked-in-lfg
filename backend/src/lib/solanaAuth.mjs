import bs58 from 'bs58';
import nacl from 'tweetnacl';

const textEncoder = new TextEncoder();
const HEX_RE = /^[0-9a-fA-F]+$/;

function toUint8Array(input) {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function bytesEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function decodeBase58Bytes(value) {
  try {
    return toUint8Array(bs58.decode(value));
  } catch {
    return null;
  }
}

function decodeBase64Bytes(value) {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    return toUint8Array(Buffer.from(normalized, 'base64'));
  } catch {
    return null;
  }
}

function decodeHexBytes(value) {
  if (!HEX_RE.test(value) || value.length % 2 !== 0) {
    return null;
  }
  try {
    return toUint8Array(Buffer.from(value, 'hex'));
  } catch {
    return null;
  }
}

function decodeSignatureBytes(value) {
  const decoders = [decodeBase58Bytes, decodeBase64Bytes, decodeHexBytes];
  for (const decode of decoders) {
    const output = decode(value);
    if (output && output.length > 0) {
      return output;
    }
  }
  throw new Error('Unsupported signature encoding. Expected base58, base64/base64url, or hex.');
}

function toDetachedSignature(signatureBytes, messageBytes) {
  if (signatureBytes.length === nacl.sign.signatureLength) {
    return signatureBytes;
  }

  const expectedLength = messageBytes.length + nacl.sign.signatureLength;
  if (signatureBytes.length !== expectedLength) {
    throw new Error('Invalid signature length.');
  }

  const messagePrefix = signatureBytes.slice(0, messageBytes.length);
  if (bytesEqual(messagePrefix, messageBytes)) {
    return signatureBytes.slice(messageBytes.length);
  }

  // Defensive fallback for providers returning signature || message.
  const messageSuffix = signatureBytes.slice(nacl.sign.signatureLength);
  if (bytesEqual(messageSuffix, messageBytes)) {
    return signatureBytes.slice(0, nacl.sign.signatureLength);
  }

  throw new Error('Signed payload does not match challenge message.');
}

function decodeWalletPublicKey(walletAddress) {
  const publicKeyBytes = decodeBase58Bytes(walletAddress);
  if (!publicKeyBytes) {
    throw new Error('walletAddress must be valid base58.');
  }

  if (publicKeyBytes.length !== nacl.sign.publicKeyLength) {
    throw new Error('walletAddress must decode to 32-byte Ed25519 public key.');
  }

  return publicKeyBytes;
}

export function verifySolanaChallengeSignature({
  walletAddress,
  message,
  signature,
}) {
  const publicKey = decodeWalletPublicKey(walletAddress);
  const messageBytes = textEncoder.encode(message);
  const signatureBytes = decodeSignatureBytes(signature);
  const detachedSignature = toDetachedSignature(signatureBytes, messageBytes);

  return nacl.sign.detached.verify(messageBytes, detachedSignature, publicKey);
}
