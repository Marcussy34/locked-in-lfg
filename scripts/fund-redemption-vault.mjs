import fs from 'fs';
import bs58Module from 'bs58';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token';
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

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

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function parseUiAmount(value, decimals) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Pass --amount as a positive numeric value.');
  }

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimals.`);
  }

  const atomic = BigInt(`${whole}${fraction.padEnd(decimals, '0')}`);
  if (atomic <= 0n) {
    throw new Error('Amount must be greater than zero.');
  }
  return atomic;
}

async function main() {
  const env = readEnvFile();
  const args = parseArgs(process.argv.slice(2));
  const rpcUrl = env.EXPO_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
  const amountUi = args.amount ?? '5';

  const connection = new Connection(rpcUrl, 'confirmed');
  const deployer = Keypair.fromSecretKey(bs58.decode(env.DEPLOYER_PRIVATE_KEY));
  const programId = new PublicKey(env.EXPO_PUBLIC_LOCK_VAULT_PROGRAM_ID);
  const usdcMint = new PublicKey(env.EXPO_PUBLIC_LOCK_VAULT_USDC_MINT);

  const [protocolConfig] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId);
  const sourceAta = getAssociatedTokenAddressSync(
    usdcMint,
    deployer.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const redemptionVault = getAssociatedTokenAddressSync(
    usdcMint,
    protocolConfig,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );

  const mint = await getMint(connection, usdcMint, 'confirmed', TOKEN_PROGRAM_ID);
  const amountAtomic = parseUiAmount(amountUi, mint.decimals);

  const instructions = [];
  const existingVault = await connection.getAccountInfo(redemptionVault, 'confirmed');
  if (!existingVault) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        deployer.publicKey,
        redemptionVault,
        protocolConfig,
        usdcMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      ),
    );
  }

  instructions.push(
    createTransferCheckedInstruction(
      sourceAta,
      usdcMint,
      redemptionVault,
      deployer.publicKey,
      Number(amountAtomic),
      mint.decimals,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const transaction = new Transaction().add(...instructions);
  const signature = await sendAndConfirmTransaction(connection, transaction, [deployer], {
    commitment: 'confirmed',
  });

  const vaultBalance = await connection.getTokenAccountBalance(redemptionVault, 'confirmed');

  console.log(
    JSON.stringify(
      {
        signature,
        protocolConfig: protocolConfig.toBase58(),
        redemptionVault: redemptionVault.toBase58(),
        fundedAmountUi: amountUi,
        redemptionVaultBalanceUi: vaultBalance.value.uiAmountString ?? '0',
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
