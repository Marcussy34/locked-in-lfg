'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { useCourseStore, useUserStore } from '@/stores';
import { defaultCourseLockPolicyForDifficulty } from '@/types';
import type { CourseLockPolicy, CourseDifficulty } from '@/types';
import {
  buildLockFundsTransaction,
  hasLockVaultConfig,
  fetchWalletDepositBalances,
  type LockDurationDays as SolanaLockDuration,
} from '@/services/solana';
import { connection } from '@/services/solana/connection';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  SectionLabel,
  PrimaryButton,
  T,
} from '@/components/theme';

const DIFFICULTY_COLORS: Record<CourseDifficulty, string> = {
  beginner: T.green,
  intermediate: T.teal,
  advanced: T.crimson,
};

const CATEGORY_COLORS: Record<string, string> = {
  solana: T.violet,
  web3: T.teal,
  defi: T.teal,
  security: T.crimson,
  rust: T.rust,
};

// Lock duration presets supported by the on-chain program
type LockDurationDays = 14 | 30 | 45 | 60 | 90 | 180 | 365;
const LOCK_DURATIONS: LockDurationDays[] = [14, 30, 45, 60, 90, 180, 365];
const PRINCIPAL_PRESETS = [1, 5, 10, 25, 50, 100, 250, 500];

// Wrap in Suspense — useSearchParams requires it in Next.js 16
export default function OnboardingDepositPage() {
  return (
    <Suspense
      fallback={
        <ScreenBackground>
          <div className="flex items-center justify-center min-h-[60vh]">
            <p style={{ color: T.textSecondary }} className="text-sm font-mono">
              Loading...
            </p>
          </div>
        </ScreenBackground>
      }
    >
      <DepositContent />
    </Suspense>
  );
}

function DepositContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId') ?? '';
  const walletAddress = useUserStore((s) => s.walletAddress);
  const activateCourse = useCourseStore((s) => s.activateCourse);
  const courses = useCourseStore((s) => s.courses);
  const { wallets: solanaWallets } = useWallets();
  const { signTransaction: privySignTransaction } = useSignTransaction();

  // Wallet balances
  const [balances, setBalances] = useState<{ stableBalanceUi: string; skrBalanceUi: string; solBalanceUi: string } | null>(null);

  // Fetch wallet balances on mount
  useEffect(() => {
    if (!walletAddress || !hasLockVaultConfig()) return;
    fetchWalletDepositBalances(walletAddress)
      .then(setBalances)
      .catch(() => setBalances(null));
  }, [walletAddress]);

  const course = useMemo(
    () => courses.find((c) => c.id === courseId) ?? null,
    [courses, courseId],
  );

  // Resolve lock policy from course or defaults
  const courseLockPolicy: CourseLockPolicy = useMemo(
    () =>
      course?.lockPolicy ??
      defaultCourseLockPolicyForDifficulty(course?.difficulty ?? 'beginner'),
    [course],
  );

  // Filter durations to what the policy allows
  const availableLockDurations = useMemo(
    () =>
      LOCK_DURATIONS.filter(
        (d) =>
          d >= courseLockPolicy.minLockDurationDays &&
          d <= courseLockPolicy.maxLockDurationDays,
      ),
    [courseLockPolicy],
  );

  // Build principal presets including policy-specific values
  const principalPresets = useMemo(() => {
    const max = courseLockPolicy.maxPrincipalAmountUi
      ? Number(courseLockPolicy.maxPrincipalAmountUi)
      : null;
    const values = new Set<number>(PRINCIPAL_PRESETS);
    values.add(Number(courseLockPolicy.minPrincipalAmountUi));
    if (courseLockPolicy.demoPrincipalAmountUi) {
      values.add(Number(courseLockPolicy.demoPrincipalAmountUi));
    }
    if (max != null) values.add(max);

    return Array.from(values)
      .filter((v) => Number.isFinite(v) && v > 0)
      .filter((v) => max == null || v <= max)
      .sort((a, b) => a - b);
  }, [courseLockPolicy]);

  const [lockDuration, setLockDuration] = useState<LockDurationDays>(30);
  const [principalAmount, setPrincipalAmount] = useState('1');
  const [skrAmount, setSkrAmount] = useState('0');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clamp lock duration to what the policy allows
  useEffect(() => {
    setLockDuration((current) => {
      if (availableLockDurations.includes(current)) return current;
      return availableLockDurations[0] ?? 30;
    });
  }, [availableLockDurations]);

  // Build on-chain lock transaction, sign with wallet, send to network
  const handleDeposit = async () => {
    if (!walletAddress) {
      setStatusMessage('Connect your wallet before creating a lock.');
      return;
    }

    const amount = Number(principalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatusMessage('Enter a valid USDC amount.');
      return;
    }

    const min = Number(courseLockPolicy.minPrincipalAmountUi);
    const demo = courseLockPolicy.demoPrincipalAmountUi
      ? Number(courseLockPolicy.demoPrincipalAmountUi)
      : null;
    if (amount < min && amount !== demo) {
      setStatusMessage(
        `This course requires at least ${courseLockPolicy.minPrincipalAmountUi} USDC.`,
      );
      return;
    }

    if (!hasLockVaultConfig()) {
      setStatusMessage('LockVault program not configured. Check env vars.');
      return;
    }

    // Re-validate wallet balance before building transaction
    try {
      const freshBalances = await fetchWalletDepositBalances(walletAddress);
      setBalances(freshBalances);
      const usdcBalance = Number(freshBalances.stableBalanceUi);
      if (usdcBalance < amount) {
        setStatusMessage(`Insufficient USDC. You have ${freshBalances.stableBalanceUi} USDC.`);
        return;
      }
    } catch {
      // If balance fetch fails, proceed with stale balance — the on-chain tx will fail if insufficient
      console.warn('[deposit] Could not re-fetch balance before tx');
    }

    setIsSubmitting(true);
    setStatusMessage('Building transaction...');

    try {
      // 1. Build the lock transaction (derives PDAs, encodes instruction data)
      const buildResult = await buildLockFundsTransaction({
        ownerAddress: walletAddress,
        courseId,
        stableAmountUi: principalAmount,
        skrAmountUi: skrAmount || '0',
        lockDurationDays: lockDuration as SolanaLockDuration,
      });

      setStatusMessage('Waiting for wallet approval...');

      // 2. Sign via Privy wallet (works for both embedded + external wallets)
      const wallet = solanaWallets[0];
      if (!wallet) {
        throw new Error('No Solana wallet available. Please reconnect.');
      }
      const txBytes = buildResult.transaction.serialize({ requireAllSignatures: false });
      const { signedTransaction } = await privySignTransaction({
        transaction: txBytes,
        wallet,
      });

      setStatusMessage('Sending transaction...');

      // 3. Send signed transaction to the network
      const signature = await connection.sendRawTransaction(
        signedTransaction as Buffer,
        { skipPreflight: false, preflightCommitment: 'confirmed' },
      );

      setStatusMessage('Confirming transaction...');

      // 4. Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // 5. Activate course in store with on-chain lock data
      activateCourse(courseId, {
        amount,
        duration: lockDuration,
        lockAccountAddress: buildResult.lockAccountAddress,
        stableMintAddress: buildResult.stableMintAddress,
        skrAmount: Number(skrAmount || '0'),
      });

      setStatusMessage('Lock created successfully!');
      useUserStore.getState().setOnboardingPhase('main');
      router.push('/dungeon');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transaction failed';
      console.error('[deposit] Lock transaction failed:', error);
      setStatusMessage(message);
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting;

  // --- MOCKUP PICKER (remove after choosing) ---
  const diffColor = DIFFICULTY_COLORS[course?.difficulty ?? 'beginner'];
  const catColor = CATEGORY_COLORS[course?.category ?? 'solana'] ?? T.teal;
  const courseTitle = course?.title ?? 'Selected Course';
  const lessonCount = course?.totalLessons ?? 0;

  return (
    <ScreenBackground>
      <div className="pt-10" />

      {/* Header — Minimal with glowing underline */}
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-bold tracking-wide mb-3" style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}>
          Lock Your <span style={{ color: T.amber }}>Funds</span>
        </h1>
        <p className="text-[17px] font-semibold" style={{ color: T.textPrimary }}>{courseTitle}</p>
        <div className="h-[2px] w-[60px] rounded-full mt-1.5 mb-2" style={{ background: `linear-gradient(90deg, ${catColor}, transparent)`, boxShadow: `0 0 8px ${catColor}40` }} />
        <div className="flex items-center gap-2 mb-2">
          {course?.difficulty && (
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-[1px] px-1.5 py-[2px] rounded"
              style={{ color: diffColor, backgroundColor: `${diffColor}15`, border: `1px solid ${diffColor}25` }}
            >
              {course.difficulty}
            </span>
          )}
          {course?.category && (
            <span
              className="text-[9px] font-mono font-bold uppercase tracking-[1px] px-1.5 py-[2px] rounded"
              style={{ color: catColor, backgroundColor: `${catColor}15`, border: `1px solid ${catColor}25` }}
            >
              {course.category}
            </span>
          )}
          <span className="text-[10px] font-mono" style={{ color: T.textMuted }}>
            {lessonCount} lessons
          </span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Create the on-chain lock to start learning.</p>
      </div>

      {/* Two-column layout: form left, info right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        {/* Left column — Form */}
        <div>
          <ParchmentCard>
            {/* Principal Amount */}
            <SectionLabel>Amount</SectionLabel>
            <input
              type="number"
              inputMode="decimal"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
              placeholder={courseLockPolicy.minPrincipalAmountUi}
              className="w-full px-3.5 py-3.5 rounded-lg border text-2xl font-bold bg-transparent outline-none mt-1.5 transition-colors focus:border-[rgba(212,160,74,0.3)]"
              style={{
                color: T.textPrimary,
                borderColor: T.borderDormant,
                backgroundColor: 'rgba(0,0,0,0.3)',
              }}
            />

            {/* Preset pills */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {principalPresets.map((value) => {
                const selected = Number(principalAmount) === value;
                return (
                  <button
                    key={value}
                    onClick={() => setPrincipalAmount(String(value))}
                    className="px-3 py-2 rounded-full border text-[13px] font-semibold transition-colors"
                    style={{
                      borderColor: selected ? T.amber : T.borderDormant,
                      backgroundColor: selected
                        ? `${T.amber}15`
                        : 'rgba(0,0,0,0.2)',
                      color: selected ? T.amber : T.textSecondary,
                    }}
                  >
                    {value} USDC
                  </button>
                );
              })}
            </div>

            {/* Hint text */}
            <p className="text-[11px] mt-1.5" style={{ color: T.textMuted }}>
              {courseLockPolicy.demoPrincipalAmountUi
                ? `Demo preset: ${courseLockPolicy.demoPrincipalAmountUi} USDC`
                : 'Course minimums apply to all lock amounts.'}
            </p>

            {/* SKR Boost */}
            <div className="mt-5">
              <SectionLabel>SKR Boost (optional)</SectionLabel>
              <input
                type="number"
                inputMode="decimal"
                value={skrAmount}
                onChange={(e) => setSkrAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-3.5 rounded-lg border text-[17px] bg-transparent outline-none mt-1.5 transition-colors focus:border-[rgba(212,160,74,0.3)]"
                style={{
                  color: T.textPrimary,
                  borderColor: T.borderDormant,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                }}
              />
            </div>

            {/* Lock Duration */}
            <div className="mt-5">
              <SectionLabel>Lock Duration</SectionLabel>
              <div className="flex gap-2.5 mt-1.5">
                {availableLockDurations.map((duration) => {
                  const selected = lockDuration === duration;
                  return (
                    <button
                      key={duration}
                      onClick={() => setLockDuration(duration)}
                      className="flex-1 py-2.5 rounded-lg border text-sm font-semibold text-center transition-colors"
                      style={{
                        borderColor: selected ? T.teal : T.borderDormant,
                        backgroundColor: selected
                          ? `${T.teal}12`
                          : 'rgba(0,0,0,0.2)',
                        color: selected ? T.teal : T.textPrimary,
                      }}
                    >
                      {duration}d
                    </button>
                  );
                })}
              </div>
            </div>
          </ParchmentCard>

          {/* Status message */}
          {statusMessage && (
            <ParchmentCard className="mt-4">
              <p className="text-[13px]" style={{ color: T.textSecondary }}>
                {statusMessage}
              </p>
            </ParchmentCard>
          )}

          {/* Deposit button */}
          <div className="mt-4">
            <PrimaryButton onClick={handleDeposit} disabled={isDisabled}>
              {isSubmitting ? 'Creating Lock...' : 'Deposit & Start Learning'}
            </PrimaryButton>
          </div>
        </div>

        {/* Right column — Info */}
        <div>
          <ParchmentCard>
            {/* Course Policy */}
            <SectionLabel>Course Policy</SectionLabel>
            <div
              className="rounded-lg border px-3.5 py-3"
              style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderColor: T.borderDormant,
              }}
            >
              <p className="text-[13px]" style={{ color: T.textSecondary }}>
                Min deposit: {courseLockPolicy.minPrincipalAmountUi} USDC
              </p>
              <p className="text-[13px] mt-1" style={{ color: T.textSecondary }}>
                Max deposit:{' '}
                {courseLockPolicy.maxPrincipalAmountUi
                  ? `${courseLockPolicy.maxPrincipalAmountUi} USDC`
                  : 'No course max'}
              </p>
              <p className="text-[13px] mt-1" style={{ color: T.textSecondary }}>
                Duration: {courseLockPolicy.minLockDurationDays}-
                {courseLockPolicy.maxLockDurationDays} days
              </p>
              <p className="text-[13px] mt-1" style={{ color: T.textMuted }}>
                Presets:{' '}
                {availableLockDurations.length > 0
                  ? availableLockDurations.map((d) => `${d}d`).join(' / ')
                  : 'None yet'}
              </p>
            </div>

            {/* Stablecoin */}
            <div className="mt-5">
              <SectionLabel>Stablecoin</SectionLabel>
              <div
                className="rounded-lg border py-2.5 text-center"
                style={{
                  backgroundColor: `${T.green}12`,
                  borderColor: `${T.green}30`,
                }}
              >
                <span className="text-sm font-semibold" style={{ color: T.green }}>
                  USDC only
                </span>
              </div>
            </div>

            {/* Wallet Balances */}
            <div className="mt-5">
              <SectionLabel>Wallet</SectionLabel>
              <div
                className="rounded-lg border px-3.5 py-3"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderColor: T.borderDormant,
                }}
              >
                <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${T.borderDormant}` }}>
                  <span className="text-[13px]" style={{ color: T.textSecondary }}>USDC</span>
                  <span className="text-[13px] font-semibold" style={{ color: T.textPrimary }}>{balances?.stableBalanceUi ?? '...'}</span>
                </div>
                <div className="flex justify-between py-1.5" style={{ borderBottom: `1px solid ${T.borderDormant}` }}>
                  <span className="text-[13px]" style={{ color: T.textSecondary }}>SKR</span>
                  <span className="text-[13px] font-semibold" style={{ color: T.textPrimary }}>{balances?.skrBalanceUi ?? '...'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[13px]" style={{ color: T.textSecondary }}>SOL</span>
                  <span className="text-[13px] font-semibold" style={{ color: T.textPrimary }}>{balances?.solBalanceUi ?? '...'}</span>
                </div>
              </div>
            </div>
          </ParchmentCard>
        </div>
      </div>

      <div className="mb-8" />
    </ScreenBackground>
  );
}
