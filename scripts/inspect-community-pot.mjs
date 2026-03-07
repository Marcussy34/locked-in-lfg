import fs from 'fs';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

const WINDOW_DISCRIMINATOR_HEX = '549500a952fc7390';
const DISTRIBUTION_WINDOW_DISCRIMINATOR_HEX = '50a0748c9a6a194b';
const PROTOCOL_SEED = Buffer.from('protocol');
const WINDOW_SEED = Buffer.from('window');
const DISTRIBUTION_SEED = Buffer.from('distribution');

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

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function currentWindowId() {
  const now = new Date();
  return now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1);
}

function deriveWindowAddress(programId, windowId) {
  const seed = Buffer.alloc(8);
  seed.writeBigInt64LE(BigInt(windowId), 0);
  return PublicKey.findProgramAddressSync([WINDOW_SEED, seed], programId)[0];
}

function deriveDistributionWindowAddress(programId, windowId) {
  const seed = Buffer.alloc(8);
  seed.writeBigInt64LE(BigInt(windowId), 0);
  return PublicKey.findProgramAddressSync([DISTRIBUTION_SEED, seed], programId)[0];
}

function formatUi(amountAtomic) {
  const whole = amountAtomic / 1_000_000n;
  const fraction = (amountAtomic % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

async function main() {
  const env = readEnvFile();
  const rpcUrl = env.EXPO_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
  const programId = new PublicKey(env.EXPO_PUBLIC_COMMUNITY_POT_PROGRAM_ID);
  const stableMint = new PublicKey(env.EXPO_PUBLIC_LOCK_VAULT_USDC_MINT);
  const windowId = Number.parseInt(getArg('--window') ?? String(currentWindowId()), 10);
  const connection = new Connection(rpcUrl, 'confirmed');
  const [protocolConfigAddress] = PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId);
  const windowAddress = deriveWindowAddress(programId, windowId);
  const distributionWindowAddress = deriveDistributionWindowAddress(programId, windowId);
  const potVault = getAssociatedTokenAddressSync(
    stableMint,
    protocolConfigAddress,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const account = await connection.getAccountInfo(windowAddress, 'confirmed');
  const distributionAccount = await connection.getAccountInfo(distributionWindowAddress, 'confirmed');
  const potVaultBalance = await connection
    .getTokenAccountBalance(potVault, 'confirmed')
    .catch(() => null);

  if (!account) {
    console.log(
      JSON.stringify(
        {
          windowId,
          protocolConfig: protocolConfigAddress.toBase58(),
          potVault: potVault.toBase58(),
          potVaultBalanceUi: potVaultBalance?.value?.uiAmountString ?? '0',
          windowAddress: windowAddress.toBase58(),
          exists: false,
        },
        null,
        2,
      ),
    );
    return;
  }

  const data = account.data;
  if (data.subarray(0, 8).toString('hex') !== WINDOW_DISCRIMINATOR_HEX) {
    throw new Error('Account is not a CommunityPot window.');
  }

  let offset = 8;
  const windowProtocolConfig = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
  offset += 32;
  const decodedWindowId = Number(data.readBigInt64LE(offset));
  offset += 8;
  const totalRedirectedAmount = data.readBigUInt64LE(offset);
  offset += 8;
  const redirectCount = data.readUInt32LE(offset);
  offset += 4;
  const openedAtTs = Number(data.readBigInt64LE(offset));
  offset += 8;
  const lastRecordedAtTs = Number(data.readBigInt64LE(offset));

  console.log(
    JSON.stringify(
      {
        protocolConfig: protocolConfigAddress.toBase58(),
        potVault: potVault.toBase58(),
        potVaultBalanceUi: potVaultBalance?.value?.uiAmountString ?? '0',
        windowId: decodedWindowId,
        windowAddress: windowAddress.toBase58(),
        windowProtocolConfig,
        totalRedirectedAmount: totalRedirectedAmount.toString(),
        totalRedirectedAmountUi: formatUi(totalRedirectedAmount),
        redirectCount,
        openedAtDate: new Date(openedAtTs * 1000).toISOString(),
        lastRecordedAtDate: new Date(lastRecordedAtTs * 1000).toISOString(),
        distributionWindow: distributionAccount
          ? (() => {
              const data = distributionAccount.data;
              if (data.subarray(0, 8).toString('hex') !== DISTRIBUTION_WINDOW_DISCRIMINATOR_HEX) {
                return {
                  address: distributionWindowAddress.toBase58(),
                  error: 'Not a DistributionWindow account',
                };
              }

              let distributionOffset = 8 + 32 + 32 + 8;
              const totalRedirectedDistribution = data.readBigUInt64LE(distributionOffset);
              distributionOffset += 8;
              const totalWeight = data.readBigUInt64LE(distributionOffset);
              distributionOffset += 8;
              const eligibleRecipientCount = data.readUInt32LE(distributionOffset);
              distributionOffset += 4;
              const distributedAmount = data.readBigUInt64LE(distributionOffset);
              distributionOffset += 8;
              const distributionCount = data.readUInt32LE(distributionOffset);
              distributionOffset += 4;
              const closedAtTs = Number(data.readBigInt64LE(distributionOffset));
              distributionOffset += 8;
              const status = data.readUInt8(distributionOffset);

              return {
                address: distributionWindowAddress.toBase58(),
                totalRedirectedAmount: totalRedirectedDistribution.toString(),
                totalRedirectedAmountUi: formatUi(totalRedirectedDistribution),
                totalWeight: totalWeight.toString(),
                eligibleRecipientCount,
                distributedAmount: distributedAmount.toString(),
                distributedAmountUi: formatUi(distributedAmount),
                distributionCount,
                closedAtDate: new Date(closedAtTs * 1000).toISOString(),
                status,
              };
            })()
          : null,
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
