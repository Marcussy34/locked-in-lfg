import crypto from 'crypto';
import bs58Module from 'bs58';
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { appConfig } from '../config.mjs';

const bs58 = bs58Module.decode ? bs58Module : bs58Module.default;

const PROTOCOL_SEED = Buffer.from('protocol');
const LOCK_SEED = Buffer.from('lock');
const COMPLETION_SEED = Buffer.from('completion');
const FUEL_BURN_SEED = Buffer.from('fuel-burn');
const MISS_SEED = Buffer.from('miss');

const APPLY_VERIFIED_COMPLETION_DISCRIMINATOR = anchorDiscriminator(
  'apply_verified_completion',
);
const CONSUME_DAILY_FUEL_DISCRIMINATOR = anchorDiscriminator('consume_daily_fuel');
const CONSUME_SAVER_OR_FULL_CONSEQUENCE_DISCRIMINATOR = anchorDiscriminator(
  'consume_saver_or_apply_full_consequence',
);

let relay = null;

function anchorDiscriminator(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

function encodeU16LE(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function encodeI64LE(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64LE(BigInt(value), 0);
  return buffer;
}

function hashString(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function toEpochDay(value) {
  const milliseconds = new Date(`${value}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Invalid date value: ${value}`);
  }

  return Math.floor(milliseconds / 86_400_000);
}

function toUnixTimestampSeconds(value) {
  const milliseconds = new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Invalid timestamp value: ${value}`);
  }

  return Math.floor(milliseconds / 1000);
}

export function hasLockVaultRelayConfig() {
  return Boolean(
    appConfig.solanaRpcUrl &&
      appConfig.lockVaultProgramId &&
      appConfig.lockVaultUsdcMint &&
      appConfig.lockVaultSkrMint &&
      appConfig.lockVaultWorkerPrivateKey,
  );
}

function getRelay() {
  if (!hasLockVaultRelayConfig()) {
    throw new Error('LockVault relay config is incomplete.');
  }

  if (!relay) {
    relay = {
      connection: new Connection(
        appConfig.solanaRpcUrl || clusterApiUrl('devnet'),
        'confirmed',
      ),
      signer: Keypair.fromSecretKey(
        bs58.decode(appConfig.lockVaultWorkerPrivateKey),
      ),
      programId: new PublicKey(appConfig.lockVaultProgramId),
    };
  }

  return relay;
}

function deriveCourseIdHash(courseId) {
  return hashString(courseId);
}

function deriveLockAccount(programId, walletAddress, courseId) {
  const owner = new PublicKey(walletAddress);
  const [lockAccount] = PublicKey.findProgramAddressSync(
    [LOCK_SEED, owner.toBuffer(), deriveCourseIdHash(courseId)],
    programId,
  );
  return lockAccount;
}

function deriveProtocolConfig(programId) {
  return PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId)[0];
}

function deriveReceiptAccount(programId, seed, lockAccount, receiptKey) {
  return PublicKey.findProgramAddressSync(
    [seed, lockAccount.toBuffer(), receiptKey],
    programId,
  )[0];
}

async function assertLockAccountExists(connection, lockAccount) {
  const account = await connection.getAccountInfo(lockAccount, 'confirmed');
  if (!account) {
    throw new Error(`Lock account not found: ${lockAccount.toBase58()}`);
  }
}

async function sendWorkerInstruction(keys, data) {
  const { connection, signer, programId } = getRelay();
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');

  const transaction = new Transaction({
    feePayer: signer.publicKey,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(
    new TransactionInstruction({
      programId,
      keys,
      data,
    }),
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [signer], {
    commitment: 'confirmed',
  });

  return {
    signature,
    authority: signer.publicKey.toBase58(),
  };
}

export async function publishVerifiedCompletionToLockVault({
  eventId,
  walletAddress,
  courseId,
  completionDay,
  rewardUnits,
}) {
  const { connection, signer, programId } = getRelay();
  const protocolConfig = deriveProtocolConfig(programId);
  const lockAccount = deriveLockAccount(programId, walletAddress, courseId);
  const receiptKey = hashString(eventId);
  const receiptAccount = deriveReceiptAccount(
    programId,
    COMPLETION_SEED,
    lockAccount,
    receiptKey,
  );

  await assertLockAccountExists(connection, lockAccount);

  const data = Buffer.concat([
    APPLY_VERIFIED_COMPLETION_DISCRIMINATOR,
    receiptKey,
    encodeI64LE(toEpochDay(completionDay)),
    encodeU16LE(rewardUnits),
  ]);

  const result = await sendWorkerInstruction(
    [
      { pubkey: protocolConfig, isSigner: false, isWritable: false },
      { pubkey: lockAccount, isSigner: false, isWritable: true },
      { pubkey: signer.publicKey, isSigner: true, isWritable: true },
      { pubkey: receiptAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  );

  return {
    ...result,
    lockAccount: lockAccount.toBase58(),
    receiptAccount: receiptAccount.toBase58(),
    completionDay,
    rewardUnits,
  };
}

export async function publishFuelBurnToLockVault({
  walletAddress,
  courseId,
  cycleId,
  burnedAt,
}) {
  const { connection, signer, programId } = getRelay();
  const protocolConfig = deriveProtocolConfig(programId);
  const lockAccount = deriveLockAccount(programId, walletAddress, courseId);
  const receiptKey = hashString(cycleId);
  const receiptAccount = deriveReceiptAccount(
    programId,
    FUEL_BURN_SEED,
    lockAccount,
    receiptKey,
  );

  await assertLockAccountExists(connection, lockAccount);

  const data = Buffer.concat([
    CONSUME_DAILY_FUEL_DISCRIMINATOR,
    receiptKey,
    encodeI64LE(toUnixTimestampSeconds(burnedAt)),
  ]);

  const result = await sendWorkerInstruction(
    [
      { pubkey: protocolConfig, isSigner: false, isWritable: false },
      { pubkey: lockAccount, isSigner: false, isWritable: true },
      { pubkey: signer.publicKey, isSigner: true, isWritable: true },
      { pubkey: receiptAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  );

  return {
    ...result,
    lockAccount: lockAccount.toBase58(),
    receiptAccount: receiptAccount.toBase58(),
    burnedAt,
  };
}

export async function publishMissConsequenceToLockVault({
  walletAddress,
  courseId,
  missEventId,
  missDay,
}) {
  const { connection, signer, programId } = getRelay();
  const protocolConfig = deriveProtocolConfig(programId);
  const lockAccount = deriveLockAccount(programId, walletAddress, courseId);
  const receiptKey = hashString(missEventId);
  const receiptAccount = deriveReceiptAccount(programId, MISS_SEED, lockAccount, receiptKey);

  await assertLockAccountExists(connection, lockAccount);

  const data = Buffer.concat([
    CONSUME_SAVER_OR_FULL_CONSEQUENCE_DISCRIMINATOR,
    receiptKey,
    encodeI64LE(toEpochDay(missDay)),
  ]);

  const result = await sendWorkerInstruction(
    [
      { pubkey: protocolConfig, isSigner: false, isWritable: false },
      { pubkey: lockAccount, isSigner: false, isWritable: true },
      { pubkey: signer.publicKey, isSigner: true, isWritable: true },
      { pubkey: receiptAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  );

  return {
    ...result,
    lockAccount: lockAccount.toBase58(),
    receiptAccount: receiptAccount.toBase58(),
    missDay,
  };
}
