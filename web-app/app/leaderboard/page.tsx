'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLeaderboard } from '@/services/api/progress/progressApi';
import { fetchWithAuth } from '@/services/api/httpClient';
import type { LeaderboardResponse } from '@/services/api/types';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const resp = await fetchWithAuth((token) => getLeaderboard(token, { page, pageSize: PAGE_SIZE }));
        if (!active) return;
        if (!resp) { setError('Connect wallet to view leaderboard.'); setLoading(false); return; }
        setLeaderboard(resp);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (active) { setError(err instanceof Error ? err.message : 'Failed to load.'); setLoading(false); }
      }
    };

    void load();
    return () => { active = false; };
  }, [page]);

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      <h1
        className="text-2xl font-bold tracking-wide mt-2"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Leaderboard
      </h1>
      <p className="text-xs leading-[18px] mb-5" style={{ color: T.textSecondary }}>
        See how you rank against other adventurers
      </p>

      {loading ? (
        <ParchmentCard className="mt-3">
          <p className="text-[13px]" style={{ color: T.textSecondary }}>Loading leaderboard...</p>
        </ParchmentCard>
      ) : error ? (
        <ParchmentCard className="mt-3" style={{ borderColor: 'rgba(212,160,74,0.25)' }}>
          <p className="text-xs" style={{ color: T.amber }}>{error}</p>
        </ParchmentCard>
      ) : leaderboard ? (
        <>
          {/* Summary cards — 2 col */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-4 rounded-[10px] text-center" style={{ border: `1px solid ${T.borderDormant}`, background: 'rgba(14,14,28,0.88)' }}>
              <p className="font-mono text-[9px] uppercase tracking-[1.5px]" style={{ color: T.textMuted }}>Current Pot</p>
              <p className="text-xl font-bold mt-1" style={{ color: T.green }}>{leaderboard.currentPotSizeUi} USDC</p>
            </div>
            <div className="p-4 rounded-[10px] text-center" style={{ border: `1px solid ${T.borderDormant}`, background: 'rgba(14,14,28,0.88)' }}>
              <p className="font-mono text-[9px] uppercase tracking-[1.5px]" style={{ color: T.textMuted }}>Next Distribution</p>
              <p className="text-xl font-bold mt-1" style={{ color: T.amber }}>{leaderboard.nextDistributionWindowLabel ?? 'TBD'}</p>
            </div>
          </div>

          {/* Your rank highlight */}
          {leaderboard.currentUser && (
            <ParchmentCard className="mb-4" style={{ padding: 18, borderColor: `${T.violet}35` }}>
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: T.textMuted }}>Your Rank</p>
                  <p className="text-[28px] font-bold" style={{ color: T.violet }}>#{leaderboard.currentUser.rank}</p>
                </div>
                <div className="w-px h-10 flex-shrink-0" style={{ background: T.borderDormant }} />
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: T.textMuted }}>Projected Share</p>
                    <p className="text-[16px] font-bold mt-0.5" style={{ color: T.green }}>{leaderboard.currentUser.projectedCommunityPotShareUi} USDC</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: T.textMuted }}>Streak</p>
                    <p className="text-[16px] font-bold mt-0.5" style={{ color: T.amber }}>{leaderboard.currentUser.streakLength} days</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[1px]" style={{ color: T.textMuted }}>Locked</p>
                    <p className="text-[16px] font-bold mt-0.5" style={{ color: T.teal }}>{leaderboard.currentUser.lockedPrincipalAmountUi} USDC</p>
                  </div>
                </div>
              </div>
            </ParchmentCard>
          )}

          {/* Rankings — single card with rows */}
          <ParchmentCard style={{ padding: 0, overflow: 'hidden' }}>
            {leaderboard.entries.map((entry, idx) => {
              const isCurrentUser = entry.isCurrentUser;
              const isActive = entry.streakStatus === 'active';
              const isLast = idx === leaderboard.entries.length - 1;

              return (
                <div
                  key={entry.walletAddress}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{
                    borderBottom: isLast ? 'none' : `1px solid ${T.borderDormant}`,
                    background: isCurrentUser
                      ? 'rgba(153,69,255,0.02)'
                      : entry.rank <= 3
                        ? 'rgba(212,160,74,0.02)'
                        : 'transparent',
                  }}
                >
                  {/* Rank */}
                  <span
                    className="text-lg font-bold w-8 text-center font-mono flex-shrink-0"
                    style={{ color: isCurrentUser ? T.violet : rankColor(entry.rank) }}
                  >
                    {entry.rank}
                  </span>

                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] flex-shrink-0"
                    style={{
                      background: isCurrentUser ? 'rgba(153,69,255,0.06)' : entry.rank <= 3 ? 'rgba(212,160,74,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isCurrentUser ? `${T.violet}30` : entry.rank <= 3 ? 'rgba(212,160,74,0.2)' : T.borderDormant}`,
                    }}
                  >
                    👤
                  </div>

                  {/* Name + wallet */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-bold truncate"
                      style={{ color: isCurrentUser ? T.violet : T.textPrimary }}
                    >
                      {entry.displayIdentity}{isCurrentUser ? ' (you)' : ''}
                    </p>
                    <p className="font-mono text-[10px]" style={{ color: T.textMuted }}>
                      {entry.walletAddress.slice(0, 4)}...{entry.walletAddress.slice(-4)}
                    </p>
                  </div>

                  {/* Status pill */}
                  <span
                    className="font-mono text-[10px] uppercase tracking-[1px] px-2.5 py-1 rounded-xl flex-shrink-0"
                    style={{
                      color: isActive ? T.green : T.crimson,
                      background: isActive ? 'rgba(62,230,138,0.08)' : 'rgba(255,68,102,0.08)',
                      border: `1px solid ${isActive ? 'rgba(62,230,138,0.15)' : 'rgba(255,68,102,0.15)'}`,
                    }}
                  >
                    {isActive ? 'Active' : 'Broken'}
                  </span>

                  {/* Streak + locked */}
                  <div className="text-right flex-shrink-0" style={{ minWidth: 80 }}>
                    <p className="text-[14px] font-bold" style={{ color: T.amber }}>{entry.streakLength} days</p>
                    <p className="font-mono text-[9px]" style={{ color: T.textMuted }}>{entry.lockedPrincipalAmountUi} USDC locked</p>
                  </div>

                  {/* Share */}
                  <div className="text-right flex-shrink-0" style={{ minWidth: 70 }}>
                    <p className="text-[12px] font-bold" style={{ color: T.green }}>{entry.projectedCommunityPotShareUi} USDC</p>
                    <p className="font-mono text-[9px]" style={{ color: T.textMuted }}>share</p>
                  </div>
                </div>
              );
            })}
          </ParchmentCard>

          {/* Pagination — centered */}
          <div className="flex justify-center items-center gap-4 mt-4 mb-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border font-mono text-[11px] font-bold"
              style={{
                borderColor: T.borderDormant,
                background: 'rgba(255,255,255,0.03)',
                color: page <= 1 ? T.textMuted : T.textSecondary,
                opacity: page <= 1 ? 0.4 : 1,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ← Previous
            </button>
            <span className="font-mono text-[11px]" style={{ color: T.textMuted }}>
              Page {leaderboard.page} / {leaderboard.totalPages} · {leaderboard.totalEntries} entries
            </span>
            <button
              disabled={leaderboard.page >= leaderboard.totalPages}
              onClick={() => setPage((p) => Math.min(leaderboard.totalPages, p + 1))}
              className="px-4 py-2 rounded-lg border font-mono text-[11px] font-bold"
              style={{
                borderColor: T.borderDormant,
                background: 'rgba(255,255,255,0.03)',
                color: leaderboard.page >= leaderboard.totalPages ? T.textMuted : T.textSecondary,
                opacity: leaderboard.page >= leaderboard.totalPages ? 0.4 : 1,
                cursor: leaderboard.page >= leaderboard.totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next →
            </button>
          </div>
        </>
      ) : null}
    </ScreenBackground>
  );
}
