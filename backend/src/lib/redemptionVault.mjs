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
import { appConfig } from '../config.mjs';

const bs58 = bs58Module.decode ? bs58Module : bs58Module.default;
const PROTOCOL_SEED = Buffer.from('protocol');

let autofund = null;

function parseUiAmount(value, decimals) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid UI amount: ${value}`);
  }

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimals.`);
  }

  return BigInt(`${whole}${fraction.padEnd(decimals, '0')}` || '0');
}

function formatAtomicAmount(value, decimals) {
  const amount = BigInt(value ?? 0);
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = (amount % divisor)
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');

  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

export function hasRedemptionVaultAutofundConfig() {
  return Boolean(
    appConfig.solanaRpcUrl &&
      appConfig.lockVaultProgramId &&
      appConfig.lockVaultUsdcMint &&
      appConfig.lockVaultWorkerPrivateKey,
  );
}

function getAutofundClient() {
  if (!hasRedemptionVaultAutofundConfig()) {
    throw new Error('Redemption vault autofund config is incomplete.');
  }

  if (!autofund) {
    autofund = {
      connection: new Connection(
        appConfig.solanaRpcUrl || clusterApiUrl('devnet'),
        'confirmed',
      ),
      signer: Keypair.fromSecretKey(bs58.decode(appConfig.lockVaultWorkerPrivateKey)),
      programId: new PublicKey(appConfig.lockVaultProgramId),
      usdcMint: new PublicKey(appConfig.lockVaultUsdcMint),
    };
  }

  return autofund;
}

function deriveProtocolConfig(programId) {
  return PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId)[0];
}

async function readVaultState(connection, vaultAddress) {
  const account = await connection.getAccountInfo(vaultAddress, 'confirmed');
  if (!account) {
    return {
      exists: false,
      balanceUi: '0',
      balanceAtomic: 0n,
    };
  }

  const balance = await connection.getTokenAccountBalance(vaultAddress, 'confirmed');
  return {
    exists: true,
    balanceUi: balance.value.uiAmountString ?? '0',
    balanceAtomic: BigInt(balance.value.amount ?? '0'),
  };
}

export async function ensureRedemptionVaultLiquidity() {
  const { connection, signer, programId, usdcMint } = getAutofundClient();
  const protocolConfig = deriveProtocolConfig(programId);
  const sourceAta = getAssociatedTokenAddressSync(
    usdcMint,
    signer.publicKey,
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
  const minimumAtomic = parseUiAmount(
    appConfig.redemptionVaultMinimumBalanceUi,
    mint.decimals,
  );
  const targetAtomic = parseUiAmount(
    appConfig.redemptionVaultTargetBalanceUi,
    mint.decimals,
  );

  const [vaultBefore, sourceBefore] = await Promise.all([
    readVaultState(connection, redemptionVault),
    readVaultState(connection, sourceAta),
  ]);

  if (targetAtomic <= minimumAtomic) {
    return {
      processed: false,
      reason: 'INVALID_TARGET',
      redemptionVault: redemptionVault.toBase58(),
      currentBalanceUi: vaultBefore.balanceUi,
    };
  }

  if (vaultBefore.balanceAtomic >= minimumAtomic) {
    return {
      processed: false,
      reason: 'AT_OR_ABOVE_MINIMUM',
      redemptionVault: redemptionVault.toBase58(),
      currentBalanceUi: vaultBefore.balanceUi,
      targetBalanceUi: formatAtomicAmount(targetAtomic, mint.decimals),
    };
  }

  const topUpAmount = targetAtomic - vaultBefore.balanceAtomic;
  if (sourceBefore.balanceAtomic < topUpAmount) {
    return {
      processed: false,
      reason: 'SOURCE_FUNDS_INSUFFICIENT',
      redemptionVault: redemptionVault.toBase58(),
      currentBalanceUi: vaultBefore.balanceUi,
      sourceBalanceUi: sourceBefore.balanceUi,
      requiredTopUpUi: formatAtomicAmount(topUpAmount, mint.decimals),
    };
  }

  const instructions = [];
  if (!vaultBefore.exists) {
    instructions.push(
      createAssociatedTokenAccountInstruction(
        signer.publicKey,
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
      signer.publicKey,
      Number(topUpAmount),
      mint.decimals,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  const transaction = new Transaction().add(...instructions);
  const signature = await sendAndConfirmTransaction(connection, transaction, [signer], {
    commitment: 'confirmed',
  });

  const vaultAfter = await readVaultState(connection, redemptionVault);

  return {
    processed: true,
    reason: 'TOPPED_UP',
    signature,
    redemptionVault: redemptionVault.toBase58(),
    currentBalanceUi: vaultAfter.balanceUi,
    previousBalanceUi: vaultBefore.balanceUi,
    targetBalanceUi: formatAtomicAmount(targetAtomic, mint.decimals),
    fundedAmountUi: formatAtomicAmount(topUpAmount, mint.decimals),
    sourceBalanceUi: sourceBefore.balanceUi,
  };
}
