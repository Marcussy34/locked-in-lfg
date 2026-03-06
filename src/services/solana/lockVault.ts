import '@/polyfills/buffer';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token';
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { connection } from './connection';

export type LockDurationDays = 30 | 60 | 90;

const LOCK_FUNDS_DISCRIMINATOR = Uint8Array.from([171, 49, 9, 86, 156, 155, 2, 88]);
const PROTOCOL_SEED = Buffer.from('protocol');
const LOCK_SEED = Buffer.from('lock');

const rawProgramId = (process.env.EXPO_PUBLIC_LOCK_VAULT_PROGRAM_ID ?? '').trim();
const rawUsdcMint = (process.env.EXPO_PUBLIC_LOCK_VAULT_USDC_MINT ?? '').trim();
const rawSkrMint = (process.env.EXPO_PUBLIC_LOCK_VAULT_SKR_MINT ?? '').trim();

interface LockVaultConfig {
  programId: PublicKey;
  usdcMint: PublicKey;
  skrMint: PublicKey;
}

export interface WalletDepositBalances {
  stableBalanceUi: string;
  skrBalanceUi: string;
}

export interface LockFundsBuildResult {
  transaction: Transaction;
  lockAccountAddress: string;
  stableVaultAddress: string;
  skrVaultAddress: string;
  stableMintAddress: string;
  stableAmountAtomic: string;
  skrAmountAtomic: string;
}

function parsePublicKey(value: string): PublicKey | null {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

function formatConfigError(): string {
  return [
    'Missing LockVault env config.',
    'Set EXPO_PUBLIC_LOCK_VAULT_PROGRAM_ID, EXPO_PUBLIC_LOCK_VAULT_USDC_MINT,',
    'and EXPO_PUBLIC_LOCK_VAULT_SKR_MINT.',
  ].join(' ');
}

export function hasLockVaultConfig(): boolean {
  return Boolean(
    parsePublicKey(rawProgramId) &&
      parsePublicKey(rawUsdcMint) &&
      parsePublicKey(rawSkrMint),
  );
}

export function getLockVaultConfig(): LockVaultConfig {
  const programId = parsePublicKey(rawProgramId);
  const usdcMint = parsePublicKey(rawUsdcMint);
  const skrMint = parsePublicKey(rawSkrMint);

  if (!programId || !usdcMint || !skrMint) {
    throw new Error(formatConfigError());
  }

  return {
    programId,
    usdcMint,
    skrMint,
  };
}

export function getStableMintAddress(): string {
  return getLockVaultConfig().usdcMint.toBase58();
}

function encodeU16LE(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  bytes[0] = value & 0xff;
  bytes[1] = (value >> 8) & 0xff;
  return bytes;
}

function encodeU64LE(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  let remaining = value;

  for (let index = 0; index < 8; index += 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  return bytes;
}

function encodeLockFundsInstructionData(
  courseIdHash: Uint8Array,
  lockDurationDays: LockDurationDays,
  stableAmount: bigint,
  skrAmount: bigint,
): Buffer {
  return Buffer.concat([
    Buffer.from(LOCK_FUNDS_DISCRIMINATOR),
    Buffer.from(courseIdHash),
    Buffer.from(encodeU16LE(lockDurationDays)),
    Buffer.from(encodeU64LE(stableAmount)),
    Buffer.from(encodeU64LE(skrAmount)),
  ]);
}

export function parseUiTokenAmount(value: string, decimals: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Enter a valid numeric amount.');
  }

  const [wholePart, fractionalPart = ''] = normalized.split('.');
  if (fractionalPart.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places.`);
  }

  const paddedFraction = fractionalPart.padEnd(decimals, '0');
  const combined = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, '');
  const atomic = BigInt(combined || '0');

  return atomic;
}

function formatAtomicAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const paddedFraction = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}.${paddedFraction}`;
}

async function hashCourseId(courseId: string): Promise<Uint8Array> {
  const hashHex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    courseId,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return Uint8Array.from(Buffer.from(hashHex, 'hex'));
}

async function getMintDecimals(mintAddress: PublicKey): Promise<number> {
  const mint = await getMint(connection, mintAddress, 'confirmed', TOKEN_PROGRAM_ID);
  return mint.decimals;
}

async function getTokenBalanceUi(
  ownerAddress: PublicKey,
  mintAddress: PublicKey,
): Promise<string> {
  const ownerAta = getAssociatedTokenAddressSync(
    mintAddress,
    ownerAddress,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const account = await connection.getAccountInfo(ownerAta, 'confirmed');
  if (!account) {
    return '0';
  }

  const balance = await connection.getTokenAccountBalance(ownerAta, 'confirmed');
  return balance.value.uiAmountString ?? '0';
}

export async function fetchWalletDepositBalances(
  ownerAddress: string,
): Promise<WalletDepositBalances> {
  const config = getLockVaultConfig();
  const owner = new PublicKey(ownerAddress);

  const [stableBalanceUi, skrBalanceUi] = await Promise.all([
    getTokenBalanceUi(owner, config.usdcMint),
    getTokenBalanceUi(owner, config.skrMint),
  ]);

  return {
    stableBalanceUi,
    skrBalanceUi,
  };
}

export async function buildLockFundsTransaction(params: {
  ownerAddress: string;
  courseId: string;
  stableAmountUi: string;
  skrAmountUi: string;
  lockDurationDays: LockDurationDays;
}): Promise<LockFundsBuildResult> {
  const config = getLockVaultConfig();
  const owner = new PublicKey(params.ownerAddress);
  const stableMint = config.usdcMint;

  const [stableDecimals, skrDecimals, courseIdHash] = await Promise.all([
    getMintDecimals(stableMint),
    getMintDecimals(config.skrMint),
    hashCourseId(params.courseId),
  ]);

  const stableAmount = parseUiTokenAmount(params.stableAmountUi, stableDecimals);
  const skrAmount = params.skrAmountUi.trim()
    ? parseUiTokenAmount(params.skrAmountUi, skrDecimals)
    : 0n;

  if (stableAmount <= 0n) {
    throw new Error('Stable deposit amount must be greater than zero.');
  }

  const [protocolConfig] = PublicKey.findProgramAddressSync(
    [PROTOCOL_SEED],
    config.programId,
  );
  const [lockAccount] = PublicKey.findProgramAddressSync(
    [LOCK_SEED, owner.toBuffer(), Buffer.from(courseIdHash)],
    config.programId,
  );

  const ownerStableTokenAccount = getAssociatedTokenAddressSync(
    stableMint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const stableVault = getAssociatedTokenAddressSync(
    stableMint,
    lockAccount,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const skrVault = getAssociatedTokenAddressSync(
    config.skrMint,
    lockAccount,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const ownerSkrTokenAccount = getAssociatedTokenAddressSync(
    config.skrMint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const [stableSourceAccount, skrSourceAccount] = await Promise.all([
    connection.getAccountInfo(ownerStableTokenAccount, 'confirmed'),
    skrAmount > 0n
      ? connection.getAccountInfo(ownerSkrTokenAccount, 'confirmed')
      : Promise.resolve(null),
  ]);

  if (!stableSourceAccount) {
    throw new Error('No USDC token account was found for this wallet on the configured cluster.');
  }

  if (skrAmount > 0n && !skrSourceAccount) {
    throw new Error('No SKR token account was found for this wallet on the configured cluster.');
  }

  const keys = [
    { pubkey: protocolConfig, isSigner: false, isWritable: false },
    { pubkey: lockAccount, isSigner: false, isWritable: true },
    { pubkey: stableMint, isSigner: false, isWritable: false },
    { pubkey: config.skrMint, isSigner: false, isWritable: false },
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: ownerStableTokenAccount, isSigner: false, isWritable: true },
    { pubkey: stableVault, isSigner: false, isWritable: true },
    { pubkey: skrVault, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  if (skrAmount > 0n) {
    keys.push({
      pubkey: ownerSkrTokenAccount,
      isSigner: false,
      isWritable: true,
    });
  }

  const instruction = new TransactionInstruction({
    programId: config.programId,
    keys,
    data: encodeLockFundsInstructionData(
      courseIdHash,
      params.lockDurationDays,
      stableAmount,
      skrAmount,
    ),
  });

  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  const transaction = new Transaction({
    feePayer: owner,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(instruction);

  return {
    transaction,
    lockAccountAddress: lockAccount.toBase58(),
    stableVaultAddress: stableVault.toBase58(),
    skrVaultAddress: skrVault.toBase58(),
    stableMintAddress: stableMint.toBase58(),
    stableAmountAtomic: stableAmount.toString(),
    skrAmountAtomic: skrAmount.toString(),
  };
}

export function formatDepositAmountUi(amountAtomic: string, decimals: number): string {
  return formatAtomicAmount(BigInt(amountAtomic), decimals);
}
