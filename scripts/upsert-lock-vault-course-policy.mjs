import crypto from 'crypto';
import fs from 'fs';
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

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    args[current.slice(2)] = argv[index + 1];
    index += 1;
  }

  return args;
}

function readEnvFile() {
  const contents = fs.readFileSync('.env', 'utf8');
  return Object.fromEntries(
    contents
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
  const [wholeRaw, fractionRaw = ''] = String(amountUi).trim().split('.');
  const whole = BigInt(wholeRaw || '0');
  const fraction = BigInt((fractionRaw.padEnd(6, '0').slice(0, 6)) || '0');
  return whole * 1_000_000n + fraction;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const courseId = args['course-id'];

  if (!courseId) {
    throw new Error(
      'Missing required --course-id. Example: node scripts/upsert-lock-vault-course-policy.mjs --course-id solana-fundamentals --min-principal-ui 10 --max-principal-ui 100 --demo-principal-ui 1 --min-duration-days 10 --max-duration-days 30',
    );
  }

  const minPrincipalUi = args['min-principal-ui'] ?? '10';
  const maxPrincipalUi = args['max-principal-ui'] ?? '0';
  const demoPrincipalUi = args['demo-principal-ui'] ?? '1';
  const minDurationDays = Number.parseInt(args['min-duration-days'] ?? '10', 10);
  const maxDurationDays = Number.parseInt(args['max-duration-days'] ?? '30', 10);

  const env = readEnvFile();
  const rpcUrl = env.EXPO_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
  const programId = new PublicKey(env.EXPO_PUBLIC_LOCK_VAULT_PROGRAM_ID);
  const authority = Keypair.fromSecretKey(bs58.decode(env.DEPLOYER_PRIVATE_KEY));
  const connection = new Connection(rpcUrl, 'confirmed');

  const courseIdHash = hashCourseId(courseId);
  const [protocolConfig] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId);
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
      minPrincipalAmount: parseUiAmountToAtomic(minPrincipalUi),
      maxPrincipalAmount: parseUiAmountToAtomic(maxPrincipalUi),
      demoPrincipalAmount: parseUiAmountToAtomic(demoPrincipalUi),
      minLockDurationDays: minDurationDays,
      maxLockDurationDays: maxDurationDays,
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

  console.log(
    JSON.stringify(
      {
        signature,
        courseId,
        coursePolicy: coursePolicy.toBase58(),
        minPrincipalUi,
        maxPrincipalUi,
        demoPrincipalUi,
        minDurationDays,
        maxDurationDays,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
