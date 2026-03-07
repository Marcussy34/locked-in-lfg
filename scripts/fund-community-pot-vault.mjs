import fs from 'fs';
import bs58Module from 'bs58';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

const bs58 = bs58Module.decode ? bs58Module : bs58Module.default;
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

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return process.argv[index + 1] ?? fallback;
}

function parseUiAmount(value, decimals) {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Amount must be a non-negative decimal string.');
  }
  const [wholePart, fractionalPart = ''] = normalized.split('.');
  const paddedFraction = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(wholePart) * 10n ** BigInt(decimals) + BigInt(paddedFraction || '0');
}

async function main() {
  const env = readEnvFile();
  const rpcUrl = env.EXPO_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
  const connection = new Connection(rpcUrl, 'confirmed');
  const deployer = Keypair.fromSecretKey(bs58.decode(env.DEPLOYER_PRIVATE_KEY));
  const programId = new PublicKey(env.EXPO_PUBLIC_COMMUNITY_POT_PROGRAM_ID);
  const stableMint = new PublicKey(env.EXPO_PUBLIC_LOCK_VAULT_USDC_MINT);
  const amountUi = getArg('--amount', '1');
  const amountAtomic = parseUiAmount(amountUi, 6);
  const [protocolConfig] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId);

  const sourceAta = getAssociatedTokenAddressSync(
    stableMint,
    deployer.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const potVault = getAssociatedTokenAddressSync(
    stableMint,
    protocolConfig,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const instructions = [];
  const potVaultInfo = await connection.getAccountInfo(potVault, 'confirmed');
  if (!potVaultInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        deployer.publicKey,
        potVault,
        protocolConfig,
        stableMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  instructions.push(
    createTransferCheckedInstruction(
      sourceAta,
      stableMint,
      potVault,
      deployer.publicKey,
      amountAtomic,
      6,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  const transaction = new Transaction({
    feePayer: deployer.publicKey,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(...instructions);

  const signature = await sendAndConfirmTransaction(connection, transaction, [deployer], {
    commitment: 'confirmed',
  });
  const balance = await connection.getTokenAccountBalance(potVault, 'confirmed');

  console.log(
    JSON.stringify(
      {
        signature,
        protocolConfig: protocolConfig.toBase58(),
        potVault: potVault.toBase58(),
        fundedAmountUi: amountUi,
        balanceUi: balance.value.uiAmountString,
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
