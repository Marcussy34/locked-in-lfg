import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ApiError, getLeaderboard, type LeaderboardEntry, type LeaderboardResponse } from '@/services/api';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { useUserStore } from '@/stores';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  CornerMarks,
  T,
  ts,
} from '@/theme';

const PAGE_SIZE = 10;

function renderStatus(status: LeaderboardEntry['streakStatus']) {
  return status === 'active' ? 'Active' : 'Broken';
}

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

export function LeaderboardScreen() {
  const navigation = useNavigation();
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const refreshBackendAccessToken = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('Connect your wallet again to read the leaderboard.');
    }

    const refreshed = await refreshAuthSession({ refreshToken });
    setAuthSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  }, [refreshToken, setAuthSession]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadLeaderboard = async () => {
        setLoading(true);
        let backendAccessToken = authToken;

        if (!backendAccessToken && refreshToken) {
          backendAccessToken = await refreshBackendAccessToken();
        }

        if (!backendAccessToken) {
          if (!active) return;
          setLeaderboard(null);
          setErrorMessage('Connect your wallet again to read the leaderboard.');
          setLoading(false);
          return;
        }

        try {
          const response = await getLeaderboard(backendAccessToken, {
            page,
            pageSize: PAGE_SIZE,
          });
          if (!active) return;
          setLeaderboard(response);
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
              const retried = await getLeaderboard(refreshedToken, {
                page,
                pageSize: PAGE_SIZE,
              });
              if (!active) return;
              setLeaderboard(retried);
              setErrorMessage(null);
              setLoading(false);
              return;
            } catch (refreshError) {
              if (!active) return;
              setLeaderboard(null);
              setErrorMessage(
                refreshError instanceof Error
                  ? refreshError.message
                  : 'Unable to read the leaderboard.',
              );
              setLoading(false);
              return;
            }
          }

          if (!active) return;
          setLeaderboard(null);
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to read the leaderboard.',
          );
          setLoading(false);
        }
      };

      void loadLeaderboard();
      return () => {
        active = false;
      };
    }, [authToken, page, refreshBackendAccessToken, refreshToken]),
  );

  return (
    <ScreenBackground>
      <ScrollView style={s.scroll} contentContainerStyle={ts.scrollContent}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={[ts.pageTitle, s.titleSpacing]}>Leaderboard</Text>
        <Text style={ts.pageSub}>
          Ranked by active streak, then locked principal, with Community Pot projection
        </Text>
        {leaderboard ? (
          <Text style={s.snapshotText}>
            {leaderboard.source === 'materialized' && leaderboard.snapshotAt
              ? `Snapshot updated ${new Date(leaderboard.snapshotAt).toLocaleString()}`
              : 'Live fallback view'}
          </Text>
        ) : null}

        {loading ? (
          <ParchmentCard style={s.loadingCard}>
            <Text style={s.loadingText}>Loading leaderboard...</Text>
          </ParchmentCard>
        ) : errorMessage ? (
          <ParchmentCard style={s.errorCard}>
            <Text style={s.errorText}>{errorMessage}</Text>
          </ParchmentCard>
        ) : leaderboard ? (
          <>
            {/* Summary cards */}
            <View style={s.summaryRow}>
              <ParchmentCard style={s.potCard}>
                <Text style={[ts.cardLabel, { color: T.violet }]}>Current Pot</Text>
                <Text style={[ts.cardValue, s.potValue]}>
                  {leaderboard.currentPotSizeUi} USDC
                </Text>
              </ParchmentCard>
              <ParchmentCard style={s.windowCard}>
                <Text style={ts.cardLabel}>Next Window</Text>
                <Text style={[ts.cardValue, s.windowValue]}>
                  {leaderboard.nextDistributionWindowLabel ?? 'TBD'}
                </Text>
              </ParchmentCard>
            </View>

            {/* Current user highlight */}
            {leaderboard.currentUser ? (
              <ParchmentCard style={s.currentUserCard}>
                <CornerMarks />
                <Text style={[ts.cardLabel, { color: T.violet }]}>Your Rank</Text>
                <View style={s.currentUserRow}>
                  <Text style={s.currentUserRank}>
                    #{leaderboard.currentUser.rank}
                  </Text>
                  <Text style={s.currentUserProjected}>
                    {leaderboard.currentUser.projectedCommunityPotShareUi} USDC projected
                  </Text>
                </View>
                <Text style={s.currentUserIdentity}>
                  {leaderboard.currentUser.displayIdentity}
                </Text>
                <Text style={s.currentUserStats}>
                  Streak: {leaderboard.currentUser.streakLength}
                  {' \u00B7 '}
                  Principal: {leaderboard.currentUser.lockedPrincipalAmountUi} USDC
                  {' \u00B7 '}
                  Courses: {leaderboard.currentUser.activeCourseCount}
                </Text>
              </ParchmentCard>
            ) : null}

            {/* Rankings section */}
            <View style={s.rankingsSection}>
              <View style={s.rankingsHeader}>
                <Text style={ts.sectionLabel}>Rankings</Text>
                <Text style={s.pageIndicator}>
                  Page {leaderboard.page} / {leaderboard.totalPages}
                  {' \u00B7 '}
                  {leaderboard.totalEntries} total
                </Text>
              </View>

              {leaderboard.entries.map((entry) => {
                const isTop3 = entry.rank <= 3;
                const isCurrentUser = entry.isCurrentUser;

                return (
                  <ParchmentCard
                    key={entry.walletAddress}
                    style={[
                      s.entryCard,
                      isTop3 && { borderColor: rankBorderColor(entry.rank) },
                      isCurrentUser && s.entryCardCurrentUser,
                    ]}
                  >
                    {isTop3 && <CornerMarks />}
                    <View style={s.entryTopRow}>
                      <View style={s.entryIdentity}>
                        <Text style={[s.entryRank, { color: rankColor(entry.rank) }]}>
                          #{entry.rank}
                        </Text>
                        <View>
                          <Text style={s.entryName}>{entry.displayIdentity}</Text>
                          <Text style={s.entryStatus}>
                            {renderStatus(entry.streakStatus)}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.entryProjected}>
                        {entry.projectedCommunityPotShareUi} USDC
                      </Text>
                    </View>
                    <Text style={s.entryStats}>
                      Streak: {entry.streakLength}
                      {' \u00B7 '}
                      Courses: {entry.activeCourseCount}
                      {' \u00B7 '}
                      Principal: {entry.lockedPrincipalAmountUi} USDC
                    </Text>
                    {entry.recentActivityDate ? (
                      <Text style={s.entryLastActive}>
                        Last active: {entry.recentActivityDate}
                      </Text>
                    ) : null}
                  </ParchmentCard>
                );
              })}

              {/* Pagination */}
              <View style={s.paginationRow}>
                <Pressable
                  style={({ pressed }) => [
                    ts.secondaryBtn,
                    s.paginationBtn,
                    page <= 1 && s.paginationBtnDisabled,
                    pressed && page > 1 && { opacity: 0.7 },
                  ]}
                  disabled={page <= 1}
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <Text style={[ts.secondaryBtnText, page <= 1 && s.paginationBtnTextDisabled]}>
                    Previous
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    ts.secondaryBtn,
                    s.paginationBtn,
                    leaderboard.page >= leaderboard.totalPages && s.paginationBtnDisabled,
                    pressed && leaderboard.page < leaderboard.totalPages && { opacity: 0.7 },
                  ]}
                  disabled={leaderboard.page >= leaderboard.totalPages}
                  onPress={() =>
                    setPage((current) =>
                      Math.min(leaderboard.totalPages, current + 1),
                    )
                  }
                >
                  <Text
                    style={[
                      ts.secondaryBtnText,
                      leaderboard.page >= leaderboard.totalPages && s.paginationBtnTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  titleSpacing: {
    marginTop: 8,
  },

  // Snapshot line
  snapshotText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
    marginTop: 2,
  },

  // Loading / error cards
  loadingCard: {
    marginTop: 20,
  },
  loadingText: {
    fontSize: 13,
    color: T.textSecondary,
  },
  errorCard: {
    marginTop: 20,
    borderColor: 'rgba(212,160,74,0.25)',
  },
  errorText: {
    fontSize: 12,
    color: T.amber,
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  potCard: {
    flex: 1,
    borderColor: `${T.violet}30`,
  },
  potValue: {
    fontSize: 20,
    marginTop: 6,
  },
  windowCard: {
    flex: 1,
  },
  windowValue: {
    fontSize: 16,
    marginTop: 6,
  },

  // Current user card
  currentUserCard: {
    marginTop: 20,
    borderColor: `${T.violet}40`,
  },
  currentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  currentUserRank: {
    fontSize: 28,
    fontWeight: '700',
    color: T.textPrimary,
  },
  currentUserProjected: {
    fontSize: 13,
    fontWeight: '600',
    color: T.violet,
  },
  currentUserIdentity: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 6,
  },
  currentUserStats: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Rankings section
  rankingsSection: {
    marginTop: 20,
    marginBottom: 32,
  },
  rankingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pageIndicator: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
  },

  // Entry card
  entryCard: {
    marginBottom: 10,
  },
  entryCardCurrentUser: {
    borderColor: `${T.violet}55`,
    borderWidth: 1.5,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  entryRank: {
    fontSize: 16,
    fontWeight: '700',
  },
  entryName: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
  },
  entryStatus: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
    marginTop: 1,
  },
  entryProjected: {
    fontSize: 12,
    fontWeight: '600',
    color: T.violet,
  },
  entryStats: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
    marginTop: 10,
    letterSpacing: 0.3,
  },
  entryLastActive: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
    marginTop: 3,
    letterSpacing: 0.3,
  },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  paginationBtn: {
    flex: 1,
  },
  paginationBtnDisabled: {
    opacity: 0.35,
  },
  paginationBtnTextDisabled: {
    color: T.textMuted,
  },
});
