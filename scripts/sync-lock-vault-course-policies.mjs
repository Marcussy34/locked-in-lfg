import crypto from 'crypto';
import fs from 'fs';
import { createRequire } from 'module';
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

const require = createRequire(import.meta.url);
const { Client } = require('../backend/node_modules/pg');

const bs58 = bs58Module.decode ? bs58Module : bs58Module.default;
const PROTOCOL_SEED = Buffer.from('protocol');
const COURSE_POLICY_SEED = Buffer.from('course-policy');

function instructionDiscriminator(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

function hashCourseId(courseId) {
  return crypto.createHash('sha256').update(courseId).digest();
}

function encodeU16LE(value) {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(value, 0);
  return bytes;
}

function encodeU64LE(value) {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(BigInt(value), 0);
  return bytes;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function encodeInstructionData({
  courseIdHash,
  minPrincipalAmount,
  maxPrincipalAmount,
  demoPrincipalAmount,
  minLockDurationDays,
  maxLockDurationDays,
}) {
  return Buffer.concat([
    instructionDiscriminator('upsert_course_policy'),
    Buffer.from(courseIdHash),
    encodeU64LE(minPrincipalAmount),
    encodeU64LE(maxPrincipalAmount),
    encodeU64LE(demoPrincipalAmount),
    encodeU16LE(minLockDurationDays),
    encodeU16LE(maxLockDurationDays),
  ]);
}

function parseUiAmountToAtomic(amountUi) {
  const [wholeRaw, fractionRaw = ''] = String(amountUi ?? '0').trim().split('.');
  const whole = BigInt(wholeRaw || '0');
  const fraction = BigInt((fractionRaw.padEnd(6, '0').slice(0, 6)) || '0');
  return whole * 1_000_000n + fraction;
}

async function main() {
  const rootEnv = parseEnvFile('.env');
  const backendEnv = parseEnvFile('backend/.env');
  const env = {
    ...rootEnv,
    ...backendEnv,
  };

  if (!env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL in backend/.env');
  }

  if (!env.EXPO_PUBLIC_LOCK_VAULT_PROGRAM_ID) {
    throw new Error('Missing EXPO_PUBLIC_LOCK_VAULT_PROGRAM_ID in .env');
  }

  if (!env.DEPLOYER_PRIVATE_KEY) {
    throw new Error('Missing DEPLOYER_PRIVATE_KEY in .env');
  }

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  const result = await client.query(`
    select
      id,
      min_principal_amount_usdc::text as min_principal_amount_ui,
      coalesce(max_principal_amount_usdc::text, '0') as max_principal_amount_ui,
      coalesce(demo_principal_amount_usdc::text, '0') as demo_principal_amount_ui,
      min_lock_duration_days,
      max_lock_duration_days
    from lesson.courses
    order by id
  `);

  await client.end();

  const rpcUrl = env.EXPO_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');
  const programId = new PublicKey(env.EXPO_PUBLIC_LOCK_VAULT_PROGRAM_ID);
  const authority = Keypair.fromSecretKey(bs58.decode(env.DEPLOYER_PRIVATE_KEY));
  const [protocolConfig] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId);

  const outputs = [];

  for (const row of result.rows) {
    const courseIdHash = hashCourseId(row.id);
    const [coursePolicy] = PublicKey.findProgramAddressSync(
      [COURSE_POLICY_SEED, courseIdHash],
      programId,
    );

    const instruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: protocolConfig, isSigner: false, isWritable: false },
        { pubkey: coursePolicy, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: encodeInstructionData({
        courseIdHash,
        minPrincipalAmount: parseUiAmountToAtomic(row.min_principal_amount_ui),
        maxPrincipalAmount: parseUiAmountToAtomic(row.max_principal_amount_ui),
        demoPrincipalAmount: parseUiAmountToAtomic(row.demo_principal_amount_ui),
        minLockDurationDays: Number(row.min_lock_duration_days),
        maxLockDurationDays: Number(row.max_lock_duration_days),
      }),
    });

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({
      feePayer: authority.publicKey,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }).add(instruction);

    const signature = await sendAndConfirmTransaction(connection, transaction, [authority], {
      commitment: 'confirmed',
    });

    outputs.push({
      courseId: row.id,
      coursePolicy: coursePolicy.toBase58(),
      signature,
      minPrincipalUi: row.min_principal_amount_ui,
      maxPrincipalUi: row.max_principal_amount_ui === '0' ? null : row.max_principal_amount_ui,
      demoPrincipalUi:
        row.demo_principal_amount_ui === '0' ? null : row.demo_principal_amount_ui,
      minDurationDays: Number(row.min_lock_duration_days),
      maxDurationDays: Number(row.max_lock_duration_days),
    });
  }

  console.log(JSON.stringify({ synced: outputs.length, policies: outputs }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
