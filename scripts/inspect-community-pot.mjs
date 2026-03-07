import fs from 'fs';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const WINDOW_DISCRIMINATOR_HEX = '549500a952fc7390';
const WINDOW_SEED = Buffer.from('window');

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

function formatUi(amountAtomic) {
  const whole = amountAtomic / 1_000_000n;
  const fraction = (amountAtomic % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

async function main() {
  const env = readEnvFile();
  const rpcUrl = env.EXPO_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('devnet');
  const programId = new PublicKey(env.EXPO_PUBLIC_COMMUNITY_POT_PROGRAM_ID);
  const windowId = Number.parseInt(getArg('--window') ?? String(currentWindowId()), 10);
  const connection = new Connection(rpcUrl, 'confirmed');
  const windowAddress = deriveWindowAddress(programId, windowId);
  const account = await connection.getAccountInfo(windowAddress, 'confirmed');

  if (!account) {
    console.log(
      JSON.stringify(
        {
          windowId,
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
  const protocolConfig = new PublicKey(data.subarray(offset, offset + 32)).toBase58();
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
        windowId: decodedWindowId,
        windowAddress: windowAddress.toBase58(),
        protocolConfig,
        totalRedirectedAmount: totalRedirectedAmount.toString(),
        totalRedirectedAmountUi: formatUi(totalRedirectedAmount),
        redirectCount,
        openedAtDate: new Date(openedAtTs * 1000).toISOString(),
        lastRecordedAtDate: new Date(lastRecordedAtTs * 1000).toISOString(),
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
