'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResurfaceStore, useUserStore, useCourseStore } from '@/stores';
import { getUnlockReceipts } from '@/services/api';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { ApiError } from '@/services/api';
import {
  T,
  ScreenBackground,
  BackButton,
  ParchmentCard,
  CornerMarks,
  SecondaryButton,
} from '@/components/theme';

export default function ResurfaceHistoryPage() {
  const router = useRouter();

  const walletAddress = useUserStore((s) => s.walletAddress);
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const courses = useCourseStore((s) => s.courses);
  const hydrateReceipts = useResurfaceStore((s) => s.hydrateReceipts);
  const allReceipts = useResurfaceStore((s) => s.receipts);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter receipts to current wallet
  const receipts = useMemo(
    () =>
      walletAddress
        ? allReceipts.filter((entry) => entry.walletAddress === walletAddress)
        : [],
    [allReceipts, walletAddress],
  );

  const refreshBackendAccessToken = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('Connect your wallet again to read resurface receipts.');
    }
    const refreshed = await refreshAuthSession({ refreshToken });
    setAuthSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  }, [refreshToken, setAuthSession]);

  // Load receipts from backend on mount
  useEffect(() => {
    let active = true;

    const loadReceipts = async () => {
      setLoading(true);
      let backendAccessToken = authToken;

      if (!backendAccessToken && refreshToken) {
        try {
          backendAccessToken = await refreshBackendAccessToken();
        } catch (error) {
          if (!active) return;
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Connect your wallet again to read resurface receipts.',
          );
          setLoading(false);
          return;
        }
      }

      if (!backendAccessToken) {
        if (!active) return;
        setErrorMessage('Connect your wallet again to read resurface receipts.');
        setLoading(false);
        return;
      }

      try {
        const response = await getUnlockReceipts(backendAccessToken);
        if (!active) return;
        hydrateReceipts(
          response.receipts.map((receipt) => ({
            id: receipt.unlockTxSignature,
            walletAddress: receipt.walletAddress,
            courseId: receipt.courseId,
            courseTitle:
              courses.find((c) => c.id === receipt.courseId)?.title ?? receipt.courseId,
            lockAccountAddress: receipt.lockAccountAddress,
            principalAmountUi: receipt.principalAmountUi,
            skrLockedAmountUi: receipt.skrLockedAmountUi,
            unlockedAt: receipt.unlockedAt,
            unlockTxSignature: receipt.unlockTxSignature,
            lockEndDate: receipt.lockEndAt,
            verifiedBlockTime: receipt.verifiedBlockTime,
            source: 'backend',
          })),
        );
        setErrorMessage(null);
        setLoading(false);
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.code === 'TOKEN_EXPIRED' || error.status === 401) &&
          refreshToken
        ) {
          try {
            const refreshedToken = await refreshBackendAccessToken();
            const retried = await getUnlockReceipts(refreshedToken);
            if (!active) return;
            hydrateReceipts(
              retried.receipts.map((receipt) => ({
                id: receipt.unlockTxSignature,
                walletAddress: receipt.walletAddress,
                courseId: receipt.courseId,
                courseTitle:
                  courses.find((c) => c.id === receipt.courseId)?.title ??
                  receipt.courseId,
                lockAccountAddress: receipt.lockAccountAddress,
                principalAmountUi: receipt.principalAmountUi,
                skrLockedAmountUi: receipt.skrLockedAmountUi,
                unlockedAt: receipt.unlockedAt,
                unlockTxSignature: receipt.unlockTxSignature,
                lockEndDate: receipt.lockEndAt,
                verifiedBlockTime: receipt.verifiedBlockTime,
                source: 'backend',
              })),
            );
            setErrorMessage(null);
            setLoading(false);
            return;
          } catch {
            // Fall through to generic error
          }
        }

        if (!active) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to read resurface receipts.',
        );
        setLoading(false);
      }
    };

    void loadReceipts();
    return () => {
      active = false;
    };
  }, [authToken, courses, hydrateReceipts, refreshBackendAccessToken, refreshToken]);

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      {/* Title */}
      <h1
        className="text-2xl font-bold tracking-wide mb-1"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Resurface Receipts
      </h1>
      <p className="text-xs leading-[18px] mb-4" style={{ color: T.textSecondary }}>
        Unlock confirmations and returned-funds history
      </p>

      {/* Loading */}
      {loading && (
        <ParchmentCard className="mt-4">
          <p className="text-[13px]" style={{ color: T.textSecondary }}>
            Loading resurface receipts...
          </p>
        </ParchmentCard>
      )}

      {/* Error */}
      {!loading && errorMessage && (
        <ParchmentCard className="mt-4" style={{ borderColor: `${T.amber}30` }}>
          <p className="text-[13px]" style={{ color: T.amber }}>
            {errorMessage}
          </p>
        </ParchmentCard>
      )}

      {/* Empty state */}
      {!loading && !errorMessage && receipts.length === 0 && (
        <ParchmentCard className="mt-4">
          <p className="text-[13px]" style={{ color: T.textSecondary }}>
            No resurface receipts yet.
          </p>
        </ParchmentCard>
      )}

      {/* Receipt list */}
      {!loading &&
        receipts.map((receipt) => (
          <ParchmentCard
            key={receipt.id}
            className="mt-4"
            style={{ borderColor: T.borderDormant }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold" style={{ color: T.textPrimary }}>
                {receipt.courseTitle}
              </h3>
              <span
                className="font-mono text-[10px] uppercase tracking-[1px]"
                style={{ color: T.textMuted }}
              >
                Receipt
              </span>
            </div>

            {/* Details */}
            <p className="text-[13px] mt-1" style={{ color: T.textSecondary }}>
              Principal returned: {receipt.principalAmountUi} USDC
            </p>
            <p className="text-[13px] mt-1" style={{ color: T.textSecondary }}>
              SKR returned: {receipt.skrLockedAmountUi}
            </p>
            <p className="text-[13px] mt-1" style={{ color: T.textSecondary }}>
              Unlock target: {new Date(receipt.lockEndDate).toLocaleString()}
            </p>
            <p className="text-[13px] mt-1" style={{ color: T.textSecondary }}>
              Unlocked at: {new Date(receipt.unlockedAt).toLocaleString()}
            </p>
            {receipt.verifiedBlockTime && (
              <p className="text-[13px] mt-1" style={{ color: T.textSecondary }}>
                Verified at: {new Date(receipt.verifiedBlockTime).toLocaleString()}
              </p>
            )}

            {/* Meta (monospace) */}
            <p
              className="font-mono text-[10px] mt-1 break-all"
              style={{ color: T.textMuted }}
            >
              Lock account: {receipt.lockAccountAddress}
            </p>
            <p
              className="font-mono text-[10px] mt-1 break-all"
              style={{ color: T.textMuted }}
            >
              Tx: {receipt.unlockTxSignature}
            </p>
            <p className="font-mono text-[10px] mt-1" style={{ color: T.textMuted }}>
              Source:{' '}
              {receipt.source === 'backend'
                ? 'Backend verified'
                : 'Local pending sync'}
            </p>
          </ParchmentCard>
        ))}

      {/* Browse courses link */}
      <div className="mt-6 mb-8">
        <SecondaryButton onClick={() => router.push('/courses')}>
          Browse Courses
        </SecondaryButton>
      </div>
    </ScreenBackground>
  );
}
