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
const INIT_PROTOCOL_DISCRIMINATOR = Buffer.from([188, 233, 252, 106, 134, 146, 202, 91]);
const PROTOCOL_SEED = Buffer.from('protocol');

function readEnvFile() {
  const contents = fs.readFileSync('.env', 'utf8');
  return Object.fromEntries(
    contents
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function encodeU16LE(value) {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(value, 0);
  return bytes;
}

function encodeInitializeProtocolData({
  fuelCap,
  maxSavers,
  missExtensionDays,
  usdcMint,
  skrMint,
}) {
  return Buffer.concat([
    INIT_PROTOCOL_DISCRIMINATOR,
    encodeU16LE(fuelCap),
    Buffer.from([maxSavers]),
    encodeU16LE(missExtensionDays),
    usdcMint.toBuffer(),
    skrMint.toBuffer(),
  ]);
}

async function main() {
  const env = readEnvFile();
  const rpcUrl = env.EXPO_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');
  const deployer = Keypair.fromSecretKey(bs58.decode(env.DEPLOYER_PRIVATE_KEY));
  const programId = new PublicKey(env.EXPO_PUBLIC_LOCK_VAULT_PROGRAM_ID);
  const usdcMint = new PublicKey(env.EXPO_PUBLIC_LOCK_VAULT_USDC_MINT);
  const skrMint = new PublicKey(env.EXPO_PUBLIC_LOCK_VAULT_SKR_MINT);

  const [protocolConfig] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId);
  const existing = await connection.getAccountInfo(protocolConfig, 'confirmed');
  if (existing) {
    console.log(
      JSON.stringify(
        {
          protocolConfig: protocolConfig.toBase58(),
          status: 'already_initialized',
        },
        null,
        2,
      ),
    );
    return;
  }

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: protocolConfig, isSigner: false, isWritable: true },
      { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodeInitializeProtocolData({
      fuelCap: 7,
      maxSavers: 3,
      missExtensionDays: 7,
      usdcMint,
      skrMint,
    }),
  });

  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  const transaction = new Transaction({
    feePayer: deployer.publicKey,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(instruction);

  const signature = await sendAndConfirmTransaction(connection, transaction, [deployer], {
    commitment: 'confirmed',
  });

  console.log(
    JSON.stringify(
      {
        signature,
        protocolConfig: protocolConfig.toBase58(),
        fuelCap: 7,
        maxSavers: 3,
        missExtensionDays: 7,
        usdcMint: usdcMint.toBase58(),
        skrMint: skrMint.toBase58(),
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
