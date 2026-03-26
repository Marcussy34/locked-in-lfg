'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore, useUserStore } from '@/stores';
import { getYieldHistory } from '@/services/api/progress/progressApi';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { ApiError } from '@/services/api/errors';
import type { YieldHistoryResponse, YieldHistoryEntry } from '@/services/api/types';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  SectionLabel,
  PrimaryButton,
  T,
} from '@/components/theme';

/* Human-readable harvest statuses */
function renderHarvestStatus(status: YieldHistoryEntry['lockVaultStatus']) {
  if (status === 'published') return 'Published';
  if (status === 'publishing') return 'Publishing';
  if (status === 'failed') return 'Failed';
  return 'Pending';
}

function renderSplitterStatus(entry: YieldHistoryEntry) {
  const isLegacyManualHarvest =
    entry.kind === 'MANUAL' &&
    entry.yieldSplitterStatus === 'pending' &&
    entry.lockVaultStatus === 'published';
  if (isLegacyManualHarvest) return 'Legacy';
  return renderHarvestStatus(entry.yieldSplitterStatus);
}

function renderHarvestReason(reason: string | null) {
  if (reason === 'HARVEST_APPLIED') return 'Applied';
  if (reason === 'HARVEST_SKIPPED') return 'Skipped';
  return reason ?? 'Pending';
}

export default function ShopPage() {
  const router = useRouter();
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);

  const activeState = activeCourseId ? courseStates[activeCourseId] ?? null : null;
  const ichorBalance = activeState?.ichorBalance ?? 0;

  const [yieldHistory, setYieldHistory] = useState<YieldHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ichorAmount, setIchorAmount] = useState('1000');

  const refreshBackendToken = useCallback(async () => {
    if (!refreshToken) throw new Error('No refresh token');
    const refreshed = await refreshAuthSession({ refreshToken });
    setAuthSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  }, [refreshToken, setAuthSession]);

  /* Load yield/harvest history */
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!activeCourseId) {
        setYieldHistory(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      let token = authToken;
      if (!token && refreshToken) {
        try { token = await refreshBackendToken(); } catch {
          if (active) { setError('Connect wallet to view shop.'); setLoading(false); }
          return;
        }
      }
      if (!token) {
        if (active) { setError('Connect wallet to view shop.'); setLoading(false); }
        return;
      }
      try {
        const resp = await getYieldHistory(activeCourseId, token);
        if (active) { setYieldHistory(resp); setError(null); setLoading(false); }
      } catch (err) {
        if (err instanceof ApiError && (err.code === 'TOKEN_EXPIRED' || err.status === 401) && refreshToken) {
          try {
            const newToken = await refreshBackendToken();
            const retried = await getYieldHistory(activeCourseId, newToken);
            if (active) { setYieldHistory(retried); setError(null); setLoading(false); }
            return;
          } catch { /* fall through */ }
        }
        if (active) { setError(err instanceof Error ? err.message : 'Failed to load.'); setLoading(false); }
      }
    };
    void load();
    return () => { active = false; };
  }, [activeCourseId, authToken, refreshToken, refreshBackendToken]);

  const recentHarvests = yieldHistory?.entries ?? [];

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      {/* Title */}
      <h1
        className="text-2xl font-bold tracking-wide"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Ichor Shop
      </h1>
      <p className="text-xs leading-[18px] mb-4" style={{ color: T.textSecondary }}>
        Exchange Ichor for USDC
      </p>

      {/* Available Ichor hero */}
      <ParchmentCard
        className="flex flex-col items-center p-6 mt-2"
        style={{ borderColor: T.borderAlive }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[1px]"
          style={{ color: T.textSecondary }}
        >
          Available Ichor
        </span>
        <span className="text-4xl font-bold mt-2" style={{ color: T.amber }}>
          {ichorBalance.toLocaleString()}
        </span>
        <span className="text-xs mt-2" style={{ color: T.textSecondary }}>
          Lifetime total: {activeState?.totalIchorProduced ?? 0}
        </span>
      </ParchmentCard>

      {/* Exchange Rate */}
      <ParchmentCard className="mt-4">
        <p className="text-sm font-semibold" style={{ color: T.textSecondary }}>
          Exchange Rate
        </p>
        <p className="text-lg mt-2" style={{ color: T.textPrimary }}>
          1,000 Ichor = 0.90 USDC
        </p>
        <p className="text-xs mt-1" style={{ color: T.textMuted }}>
          Current tier is based on lifetime Ichor earned on this lock.
        </p>
      </ParchmentCard>

      {/* Harvest Summary */}
      <ParchmentCard className="mt-4">
        <p className="text-sm font-semibold" style={{ color: T.textSecondary }}>
          Harvest Summary
        </p>
        {loading ? (
          <p className="text-sm mt-3" style={{ color: T.textSecondary }}>
            Loading harvest history...
          </p>
        ) : error ? (
          <p className="text-xs mt-3" style={{ color: T.amber }}>{error}</p>
        ) : (
          <>
            <div className="flex justify-between mt-3">
              <div>
                <span
                  className="font-mono text-[10px] uppercase tracking-[1px]"
                  style={{ color: T.textSecondary }}
                >
                  Gross Yield
                </span>
                <p className="text-lg font-bold mt-1" style={{ color: T.textPrimary }}>
                  {yieldHistory?.totalGrossYieldUi ?? '0'} USDC
                </p>
              </div>
              <div>
                <span
                  className="font-mono text-[10px] uppercase tracking-[1px]"
                  style={{ color: T.textSecondary }}
                >
                  Platform Fee
                </span>
                <p className="text-lg font-bold mt-1" style={{ color: T.textPrimary }}>
                  {yieldHistory?.totalPlatformFeeUi ?? '0'} USDC
                </p>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <div>
                <span
                  className="font-mono text-[10px] uppercase tracking-[1px]"
                  style={{ color: T.textSecondary }}
                >
                  Redirected
                </span>
                <p className="text-lg font-bold mt-1" style={{ color: T.textPrimary }}>
                  {yieldHistory?.totalRedirectedUi ?? '0'} USDC
                </p>
              </div>
              <div>
                <span
                  className="font-mono text-[10px] uppercase tracking-[1px]"
                  style={{ color: T.textSecondary }}
                >
                  Ichor Awarded
                </span>
                <p className="text-lg font-bold mt-1" style={{ color: T.amber }}>
                  {Number(yieldHistory?.totalIchorAwarded ?? '0').toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-xs mt-1" style={{ color: T.textMuted }}>
              Total harvests: {yieldHistory?.totalHarvests ?? 0}
            </p>
          </>
        )}
      </ParchmentCard>

      {/* Redeem Amount */}
      <ParchmentCard className="mt-4">
        <SectionLabel>Redeem Amount</SectionLabel>
        <input
          type="number"
          value={ichorAmount}
          onChange={(e) => setIchorAmount(e.target.value)}
          placeholder="1000"
          className="w-full mt-3 rounded-[10px] border px-4 py-3.5 text-lg focus:outline-none"
          style={{
            borderColor: T.borderDormant,
            backgroundColor: T.bg,
            color: T.textPrimary,
          }}
        />

        <p className="text-sm font-semibold mt-4" style={{ color: T.textSecondary }}>
          Quote
        </p>
        <p className="text-lg mt-2" style={{ color: T.textPrimary }}>
          --
        </p>
        <p className="text-xs mt-1" style={{ color: T.textMuted }}>
          Redemption is available only after gauntlet completion.
        </p>
      </ParchmentCard>

      {/* Recent Harvests */}
      <ParchmentCard className="mt-4">
        <p className="text-sm font-semibold" style={{ color: T.textSecondary }}>
          Recent Harvests
        </p>
        {loading ? (
          <p className="text-sm mt-3" style={{ color: T.textSecondary }}>
            Loading harvest receipts...
          </p>
        ) : error ? (
          <p className="text-xs mt-3" style={{ color: T.amber }}>{error}</p>
        ) : recentHarvests.length === 0 ? (
          <p className="text-sm mt-3" style={{ color: T.textSecondary }}>
            No harvest history yet.
          </p>
        ) : (
          recentHarvests.map((entry) => (
            <div
              key={entry.harvestId}
              className="mt-4 rounded-[10px] border p-3.5"
              style={{
                borderColor: T.borderDormant,
                backgroundColor: T.bg,
              }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[10px] font-semibold uppercase tracking-[1px]"
                  style={{ color: T.textSecondary }}
                >
                  {entry.kind}
                </span>
                <span className="text-xs" style={{ color: T.textSecondary }}>
                  {renderHarvestStatus(entry.lockVaultStatus)}
                </span>
              </div>
              {/* Reason */}
              <p className="text-sm font-semibold mt-2" style={{ color: T.textPrimary }}>
                {renderHarvestReason(entry.reason)}
              </p>
              {/* Date */}
              <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                {new Date(entry.harvestedAt).toLocaleString()}
              </p>
              {/* Details */}
              <p className="text-sm mt-3" style={{ color: T.textSecondary }}>
                Gross: {entry.grossYieldAmountUi} USDC
                {' \u00B7 '}Fee: {entry.platformFeeAmountUi} USDC
                {' \u00B7 '}Redirect: {entry.redirectedAmountUi} USDC
              </p>
              <p className="text-sm mt-1" style={{ color: T.amber }}>
                Ichor awarded: {Number(entry.ichorAwarded).toLocaleString()}
              </p>
              {/* Pipeline statuses */}
              <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                Splitter: {renderSplitterStatus(entry)}
                {' \u00B7 '}LockVault: {renderHarvestStatus(entry.lockVaultStatus)}
                {' \u00B7 '}Pot: {renderHarvestStatus(entry.communityPotStatus)}
              </p>
              {entry.lockVaultTransactionSignature && (
                <p className="text-xs mt-1" style={{ color: T.textMuted }}>
                  Lock tx: {entry.lockVaultTransactionSignature.slice(0, 12)}...
                </p>
              )}
            </div>
          ))
        )}
      </ParchmentCard>

      {/* Redeem button */}
      <div className="mt-6 mb-8">
        <PrimaryButton onClick={() => {}} disabled>
          EXCHANGE ICHOR
        </PrimaryButton>
        <p className="text-xs text-center mt-1" style={{ color: T.textSecondary }}>
          On-chain redemption requires wallet connection and gauntlet completion.
        </p>
      </div>
    </ScreenBackground>
  );
}
