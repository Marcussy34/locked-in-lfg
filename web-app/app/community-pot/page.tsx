'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore, useUserStore } from '@/stores';
import { getCommunityPotHistory } from '@/services/api/progress/progressApi';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { ApiError } from '@/services/api/errors';
import type { CommunityPotHistoryWindow } from '@/services/api/types';
import {
  T,
  ScreenBackground,
  BackButton,
  ParchmentCard,
  StatBox,
  SectionLabel,
} from '@/components/theme';

function renderWindowStatus(status: CommunityPotHistoryWindow['status']) {
  if (status === 'DISTRIBUTED') return 'Distributed';
  if (status === 'CLOSED') return 'Closed';
  return 'Open';
}

function renderRecipientStatus(status: CommunityPotHistoryWindow['userStatus']) {
  if (status === 'DISTRIBUTED') return 'Paid';
  if (status === 'FAILED') return 'Failed';
  if (status === 'PUBLISHING') return 'Publishing';
  if (status === 'PENDING') return 'Pending';
  return 'Not eligible';
}

export default function CommunityPotPage() {
  const router = useRouter();
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const activeCourseIds = useCourseStore((s) => s.activeCourseIds);
  const courseStates = useCourseStore((s) => s.courseStates);
  const courses = useCourseStore((s) => s.courses);
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);

  const [history, setHistory] = useState<CommunityPotHistoryWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBackendToken = useCallback(async () => {
    if (!refreshToken) throw new Error('No refresh token');
    const refreshed = await refreshAuthSession({ refreshToken });
    setAuthSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  }, [refreshToken, setAuthSession]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      let token = authToken;
      if (!token && refreshToken) {
        try {
          token = await refreshBackendToken();
        } catch {
          if (active) {
            setError('Connect wallet to view community pot.');
            setLoading(false);
          }
          return;
        }
      }
      if (!token) {
        if (active) {
          setError('Connect wallet to view community pot.');
          setLoading(false);
        }
        return;
      }

      try {
        const resp = await getCommunityPotHistory(token);
        if (active) {
          setHistory(resp.windows);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (
          err instanceof ApiError &&
          (err.code === 'TOKEN_EXPIRED' || err.status === 401) &&
          refreshToken
        ) {
          try {
            const newToken = await refreshBackendToken();
            const retried = await getCommunityPotHistory(newToken);
            if (active) {
              setHistory(retried.windows);
              setError(null);
              setLoading(false);
            }
            return;
          } catch {
            /* fall through */
          }
        }
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load.');
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [authToken, refreshToken, refreshBackendToken]);

  // Filter payouts where user has a result
  const payoutHistory = history.filter(
    (w) => w.userStatus !== 'NONE' && w.userStatus !== 'PENDING',
  );

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      {/* Title */}
      <h1
        className="text-2xl font-bold tracking-wide mb-1"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Community Pot
      </h1>
      <p className="text-xs leading-[18px] mb-4" style={{ color: T.textSecondary }}>
        USDC redirected from saver penalties and monthly streaker payouts
      </p>

      {/* Current Window hero card */}
      <ParchmentCard
        className="text-center"
        style={{ padding: 24, borderColor: `${T.violet}30`, marginTop: 4 }}
      >
        <p
          className="font-mono text-[10px] uppercase tracking-[1px]"
          style={{ color: T.textSecondary }}
        >
          Current Window
        </p>
        {loading ? (
          <p className="text-[13px] mt-2" style={{ color: T.textSecondary }}>
            Reading live pot state...
          </p>
        ) : (
          <>
            <p className="text-4xl font-bold mt-2" style={{ color: T.violet }}>
              0
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: T.textSecondary }}>
              USDC
            </p>
            <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
              Current month
            </p>
          </>
        )}
        {error && (
          <p className="text-[11px] text-center mt-2" style={{ color: T.amber }}>
            {error}
          </p>
        )}
      </ParchmentCard>

      {/* Your Payouts */}
      <div className="mt-6">
        <SectionLabel>Your Payouts</SectionLabel>
        {loading ? (
          <ParchmentCard>
            <p className="text-[13px]" style={{ color: T.textSecondary }}>
              Loading payout history...
            </p>
          </ParchmentCard>
        ) : error ? (
          <ParchmentCard>
            <p className="text-[11px]" style={{ color: T.amber }}>
              {error}
            </p>
          </ParchmentCard>
        ) : payoutHistory.length === 0 ? (
          <ParchmentCard>
            <p className="text-[13px]" style={{ color: T.textSecondary }}>
              No Community Pot payout history yet.
            </p>
          </ParchmentCard>
        ) : (
          payoutHistory.map((w) => (
            <ParchmentCard
              key={`payout-${w.windowId}`}
              className="mb-3"
              style={{ borderColor: `${T.green}30` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold" style={{ color: T.textPrimary }}>
                  {w.windowLabel}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-[1px]"
                  style={{ color: T.green }}
                >
                  {renderRecipientStatus(w.userStatus)}
                </span>
              </div>
              <p className="text-[22px] font-bold mt-2" style={{ color: T.green }}>
                {w.userPayoutAmountUi ?? '0'} USDC
              </p>
              <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
                Window status: {renderWindowStatus(w.status)}
              </p>
              {w.userDistributedAt && (
                <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
                  Paid at: {new Date(w.userDistributedAt).toLocaleString()}
                </p>
              )}
              {w.userTransactionSignature && (
                <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
                  Tx: {w.userTransactionSignature.slice(0, 12)}...
                </p>
              )}
              {w.userLastError && (
                <p className="text-[11px] text-center mt-2" style={{ color: T.amber }}>
                  {w.userLastError}
                </p>
              )}
            </ParchmentCard>
          ))
        )}
      </div>

      {/* Closed Windows */}
      <div className="mt-6">
        <SectionLabel>Closed Windows</SectionLabel>
        {loading ? (
          <ParchmentCard>
            <p className="text-[13px]" style={{ color: T.textSecondary }}>
              Loading closed windows...
            </p>
          </ParchmentCard>
        ) : history.length === 0 && !error ? (
          <ParchmentCard>
            <p className="text-[13px]" style={{ color: T.textSecondary }}>
              No closed windows yet.
            </p>
          </ParchmentCard>
        ) : (
          history.map((w) => (
            <ParchmentCard key={`window-${w.windowId}`} className="mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-semibold" style={{ color: T.textPrimary }}>
                  {w.windowLabel}
                </span>
                <span
                  className="font-mono text-[10px] uppercase tracking-[1px]"
                  style={{ color: T.violet }}
                >
                  {renderWindowStatus(w.status)}
                </span>
              </div>
              {/* Stats row */}
              <div className="flex gap-2 mt-3">
                <StatBox label="Total" value={`${w.totalRedirectedAmountUi}`} color={T.textPrimary} />
                <StatBox label="Distributed" value={`${w.distributedAmountUi}`} color={T.textPrimary} />
                <StatBox label="Remaining" value={`${w.remainingAmountUi}`} color={T.textPrimary} />
              </div>
              <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
                Eligible: {w.eligibleRecipientCount} {'\u00B7'} Paid recipients: {w.distributionCount} {'\u00B7'} Redirects: {w.redirectCount}
              </p>
              {w.closedAt && (
                <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
                  Closed at: {new Date(w.closedAt).toLocaleString()}
                </p>
              )}
            </ParchmentCard>
          ))
        )}
      </div>

      {/* Per Course */}
      {activeCourseIds.length > 0 && (
        <div className="mt-6">
          <SectionLabel>Per Course</SectionLabel>
          {activeCourseIds.map((courseId) => {
            const state = courseStates[courseId];
            const course = courses.find((c) => c.id === courseId);
            if (!state || !course) return null;
            const isActive = courseId === activeCourseId;
            const saversRemaining = Math.max(0, 3 - state.saverCount);

            return (
              <ParchmentCard
                key={courseId}
                className="mb-3"
                style={{
                  borderColor: isActive ? `${T.violet}50` : T.borderDormant,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-semibold" style={{ color: T.textPrimary }}>
                    {course.title.length > 20
                      ? `${course.title.slice(0, 20)}\u2026`
                      : course.title}
                  </span>
                  {isActive && (
                    <span
                      className="font-mono text-[10px] tracking-[1px] px-2 py-0.5 rounded-full"
                      style={{
                        color: T.violet,
                        backgroundColor: `${T.violet}20`,
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-2">
                  <p className="text-[13px]" style={{ color: T.violet }}>
                    Redirect active: {Math.round((state.currentYieldRedirectBps ?? 0) / 100)}%
                  </p>
                  <p className="text-[13px]" style={{ color: T.textSecondary }}>
                    Savers remaining: {saversRemaining}/3
                  </p>
                </div>
                <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
                  Recovery: {state.saverRecoveryMode ? 'Active' : 'Idle'} {'\u00B7'} Extension: {state.extensionDays ?? 0} day{(state.extensionDays ?? 0) === 1 ? '' : 's'}
                </p>
              </ParchmentCard>
            );
          })}
        </div>
      )}

      {/* How Distribution Works */}
      <ParchmentCard className="mt-6 mb-8">
        <p className="text-sm font-semibold mb-2" style={{ color: T.textSecondary }}>
          How Distribution Works
        </p>
        <p className="text-xs leading-5" style={{ color: T.textMuted }}>
          {'\u2022'} Redirected yield accumulates in a monthly Community Pot{'\n'}
          {'\u2022'} Closed windows snapshot eligible active streakers{'\n'}
          {'\u2022'} Weight = current streak {'\u00d7'} locked principal{'\n'}
          {'\u2022'} Paid windows keep an on-chain receipt and backend status row
        </p>
      </ParchmentCard>
    </ScreenBackground>
  );
}
