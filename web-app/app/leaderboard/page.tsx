'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores';
import { getLeaderboard } from '@/services/api/progress/progressApi';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { ApiError } from '@/services/api/errors';
import type { LeaderboardResponse, LeaderboardEntry } from '@/services/api/types';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  CornerMarks,
  SectionLabel,
  SecondaryButton,
  T,
} from '@/components/theme';

const PAGE_SIZE = 10;

function rankColor(rank: number): string {
  if (rank === 1) return T.amber;
  if (rank === 2) return T.textSecondary;
  if (rank === 3) return T.rust;
  return T.textPrimary;
}

function rankBorderColor(rank: number): string {
  if (rank === 1) return 'rgba(212,160,74,0.4)';
  if (rank === 2) return 'rgba(255,255,255,0.15)';
  if (rank === 3) return 'rgba(232,132,90,0.35)';
  return T.borderDormant;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);

  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

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
        try { token = await refreshBackendToken(); } catch {
          if (active) { setError('Connect wallet to view leaderboard.'); setLoading(false); }
          return;
        }
      }
      if (!token) {
        if (active) { setError('Connect wallet to view leaderboard.'); setLoading(false); }
        return;
      }

      try {
        const resp = await getLeaderboard(token, { page, pageSize: PAGE_SIZE });
        if (active) { setLeaderboard(resp); setError(null); setLoading(false); }
      } catch (err) {
        if (err instanceof ApiError && (err.code === 'TOKEN_EXPIRED' || err.status === 401) && refreshToken) {
          try {
            const newToken = await refreshBackendToken();
            const retried = await getLeaderboard(newToken, { page, pageSize: PAGE_SIZE });
            if (active) { setLeaderboard(retried); setError(null); setLoading(false); }
            return;
          } catch { /* fall through */ }
        }
        if (active) { setError(err instanceof Error ? err.message : 'Failed to load.'); setLoading(false); }
      }
    };

    void load();
    return () => { active = false; };
  }, [authToken, page, refreshBackendToken, refreshToken]);

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      {/* Title */}
      <h1
        className="text-2xl font-bold tracking-wide mt-2"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Leaderboard
      </h1>
      <p className="text-xs leading-[18px] mb-4" style={{ color: T.textSecondary }}>
        Ranked by active streak, then locked principal, with Community Pot projection
      </p>

      {/* Snapshot timestamp */}
      {leaderboard && (
        <p className="font-mono text-[10px] mt-0.5" style={{ color: T.textMuted }}>
          {leaderboard.source === 'materialized' && leaderboard.snapshotAt
            ? `Snapshot updated ${new Date(leaderboard.snapshotAt).toLocaleString()}`
            : 'Live fallback view'}
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <ParchmentCard className="mt-5">
          <p className="text-[13px]" style={{ color: T.textSecondary }}>
            Loading leaderboard...
          </p>
        </ParchmentCard>
      ) : error ? (
        <ParchmentCard className="mt-5" style={{ borderColor: 'rgba(212,160,74,0.25)' }}>
          <p className="text-xs" style={{ color: T.amber }}>{error}</p>
        </ParchmentCard>
      ) : leaderboard ? (
        <>
          {/* Summary cards */}
          <div className="flex gap-3 mt-5">
            <ParchmentCard className="flex-1" style={{ borderColor: `${T.violet}30` }}>
              <p
                className="font-mono text-[10px] uppercase tracking-[1px]"
                style={{ color: T.violet }}
              >
                Current Pot
              </p>
              <p
                className="text-xl font-bold mt-1.5"
                style={{ color: T.textPrimary }}
              >
                {leaderboard.currentPotSizeUi} USDC
              </p>
            </ParchmentCard>
            <ParchmentCard className="flex-1">
              <p
                className="font-mono text-[10px] uppercase tracking-[1px]"
                style={{ color: T.textSecondary }}
              >
                Next Window
              </p>
              <p
                className="text-base font-bold mt-1.5"
                style={{ color: T.textPrimary }}
              >
                {leaderboard.nextDistributionWindowLabel ?? 'TBD'}
              </p>
            </ParchmentCard>
          </div>

          {/* Current user highlight */}
          {leaderboard.currentUser && (
            <ParchmentCard className="mt-5" style={{ borderColor: `${T.violet}40` }}>
              <CornerMarks />
              <p
                className="font-mono text-[10px] uppercase tracking-[1px]"
                style={{ color: T.violet }}
              >
                Your Rank
              </p>
              <div className="flex items-center justify-between mt-2.5">
                <span
                  className="text-[28px] font-bold"
                  style={{ color: T.textPrimary }}
                >
                  #{leaderboard.currentUser.rank}
                </span>
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: T.violet }}
                >
                  {leaderboard.currentUser.projectedCommunityPotShareUi} USDC projected
                </span>
              </div>
              <p className="text-[13px] mt-1.5" style={{ color: T.textSecondary }}>
                {leaderboard.currentUser.displayIdentity}
              </p>
              <p
                className="font-mono text-[10px] tracking-[0.3px] mt-1"
                style={{ color: T.textMuted }}
              >
                Streak: {leaderboard.currentUser.streakLength}
                {' \u00B7 '}
                Principal: {leaderboard.currentUser.lockedPrincipalAmountUi} USDC
                {' \u00B7 '}
                Courses: {leaderboard.currentUser.activeCourseCount}
              </p>
            </ParchmentCard>
          )}

          {/* Rankings section */}
          <div className="mt-5 mb-8">
            <div className="flex items-center justify-between mb-1.5">
              <SectionLabel>Rankings</SectionLabel>
              <span className="font-mono text-[10px]" style={{ color: T.textMuted }}>
                Page {leaderboard.page} / {leaderboard.totalPages}
                {' \u00B7 '}
                {leaderboard.totalEntries} total
              </span>
            </div>

            {leaderboard.entries.map((entry) => {
              const isTop3 = entry.rank <= 3;
              const isCurrentUser = entry.isCurrentUser;

              return (
                <ParchmentCard
                  key={entry.walletAddress}
                  className="mb-2.5"
                  style={{
                    borderColor: isTop3
                      ? rankBorderColor(entry.rank)
                      : isCurrentUser
                        ? `${T.violet}55`
                        : T.borderDormant,
                    ...(isCurrentUser ? { borderWidth: 1.5 } : {}),
                  }}
                >
                  {isTop3 && <CornerMarks />}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="text-base font-bold"
                        style={{ color: rankColor(entry.rank) }}
                      >
                        #{entry.rank}
                      </span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                          {entry.displayIdentity}
                        </p>
                        <p className="font-mono text-[10px] mt-px" style={{ color: T.textMuted }}>
                          {entry.streakStatus === 'active' ? 'Active' : 'Broken'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: T.violet }}>
                      {entry.projectedCommunityPotShareUi} USDC
                    </span>
                  </div>
                  <p
                    className="font-mono text-[10px] tracking-[0.3px] mt-2.5"
                    style={{ color: T.textMuted }}
                  >
                    Streak: {entry.streakLength}
                    {' \u00B7 '}
                    Courses: {entry.activeCourseCount}
                    {' \u00B7 '}
                    Principal: {entry.lockedPrincipalAmountUi} USDC
                  </p>
                  {entry.recentActivityDate && (
                    <p
                      className="font-mono text-[10px] tracking-[0.3px] mt-[3px]"
                      style={{ color: T.textMuted }}
                    >
                      Last active: {entry.recentActivityDate}
                    </p>
                  )}
                </ParchmentCard>
              );
            })}

            {/* Pagination */}
            <div className="flex gap-3 mt-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex-1 py-3 rounded-lg border text-center font-mono text-xs font-semibold tracking-[1px]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: T.borderDormant,
                  color: page <= 1 ? T.textMuted : T.textSecondary,
                  opacity: page <= 1 ? 0.35 : 1,
                }}
              >
                Previous
              </button>
              <button
                disabled={leaderboard.page >= leaderboard.totalPages}
                onClick={() => setPage((p) => Math.min(leaderboard.totalPages, p + 1))}
                className="flex-1 py-3 rounded-lg border text-center font-mono text-xs font-semibold tracking-[1px]"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: T.borderDormant,
                  color: leaderboard.page >= leaderboard.totalPages ? T.textMuted : T.textSecondary,
                  opacity: leaderboard.page >= leaderboard.totalPages ? 0.35 : 1,
                }}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </ScreenBackground>
  );
}
