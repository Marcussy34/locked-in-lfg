import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ApiError,
  getCommunityPotHistory,
  type CommunityPotHistoryWindow,
} from '@/services/api';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import {
  fetchCurrentCommunityPotSnapshot,
  hasCommunityPotConfig,
  type CommunityPotSnapshot,
} from '@/services/solana';
import { useUserStore } from '@/stores';
import { useCourseStore } from '@/stores/courseStore';
import type { MainStackParamList } from '@/navigation/types';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  StatBox,
  T,
  ts,
} from '@/theme';

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

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function CommunityPotScreen() {
  const navigation = useNavigation<Nav>();
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const activeCourseIds = useCourseStore((s) => s.activeCourseIds);
  const courseStates = useCourseStore((s) => s.courseStates);
  const courses = useCourseStore((s) => s.courses);
  const refreshCourseRuntime = useCourseStore((s) => s.refreshCourseRuntime);
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const [potSnapshot, setPotSnapshot] = useState<CommunityPotSnapshot | null>(null);
  const [history, setHistory] = useState<CommunityPotHistoryWindow[]>([]);
  const [potError, setPotError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [potLoading, setPotLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  const refreshBackendAccessToken = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('Connect your wallet again to read payout history.');
    }

    const refreshed = await refreshAuthSession({ refreshToken });
    setAuthSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  }, [refreshToken, setAuthSession]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadHistory = async () => {
        if (active) {
          setHistoryLoading(true);
        }
        let backendAccessToken = authToken;

        if (!backendAccessToken && refreshToken) {
          try {
            backendAccessToken = await refreshBackendAccessToken();
          } catch (error) {
            if (!active) {
              return;
            }
            setHistory([]);
            setHistoryError(
              error instanceof Error
                ? error.message
                : 'Connect your wallet again to read payout history.',
            );
            setHistoryLoading(false);
            return;
          }
        }

        if (backendAccessToken) {
          for (const courseId of activeCourseIds) {
            void refreshCourseRuntime(courseId, backendAccessToken).catch(() => {
              // Keep last synced runtime visible if refresh fails.
            });
          }
        }

        if (!backendAccessToken) {
          if (!active) {
            return;
          }
          setHistory([]);
          setHistoryError('Connect your wallet again to read payout history.');
          setHistoryLoading(false);
          return;
        }

        try {
          const response = await getCommunityPotHistory(backendAccessToken);
          if (!active) {
            return;
          }
          setHistory(response.windows);
          setHistoryError(null);
          setHistoryLoading(false);
        } catch (error) {
          if (
            error instanceof ApiError &&
            (error.code === 'TOKEN_EXPIRED' || error.status === 401) &&
            refreshToken
          ) {
            try {
              const refreshedToken = await refreshBackendAccessToken();
              const retried = await getCommunityPotHistory(refreshedToken);
              if (!active) {
                return;
              }
              setHistory(retried.windows);
              setHistoryError(null);
              setHistoryLoading(false);
              return;
            } catch (refreshError) {
              if (!active) {
                return;
              }
              setHistory([]);
              setHistoryError(
                refreshError instanceof Error
                  ? refreshError.message
                  : 'Connect your wallet again to read payout history.',
              );
              setHistoryLoading(false);
              return;
            }
          }

          if (!active) {
            return;
          }
          setHistory([]);
          setHistoryError(
            error instanceof Error
              ? error.message
              : 'Unable to read Community Pot history.',
          );
          setHistoryLoading(false);
        }
      };

      void loadHistory();

      if (hasCommunityPotConfig()) {
        setPotLoading(true);
        void fetchCurrentCommunityPotSnapshot()
          .then((snapshot) => {
            if (!active) {
              return;
            }
            setPotSnapshot(snapshot);
            setPotError(null);
            setPotLoading(false);
          })
          .catch((error) => {
            if (!active) {
              return;
            }
            setPotSnapshot(null);
            setPotError(
              error instanceof Error
                ? error.message
                : 'Unable to read live Community Pot state.',
            );
            setPotLoading(false);
          });
      } else {
        setPotSnapshot(null);
        setPotError('Missing EXPO_PUBLIC_COMMUNITY_POT_PROGRAM_ID.');
        setPotLoading(false);
      }

      return () => {
        active = false;
      };
    }, [
      activeCourseIds,
      authToken,
      refreshBackendAccessToken,
      refreshCourseRuntime,
      refreshToken,
    ]),
  );

  const payoutHistory = history.filter(
    (window) => window.userStatus !== 'NONE' && window.userStatus !== 'PENDING',
  );
  const currentMonthWindow =
    potSnapshot != null
      ? history.find((window) => window.windowId === potSnapshot.windowId)
      : null;
  const showCurrentMonthTestNote =
    currentMonthWindow != null &&
    currentMonthWindow.status !== 'OPEN' &&
    currentMonthWindow.distributionCount === 0;

  return (
    <ScreenBackground>
      <ScrollView style={s.scrollView} contentContainerStyle={ts.scrollContent}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={ts.pageTitle}>Community Pot</Text>
        <Text style={ts.pageSub}>
          USDC redirected from saver penalties and monthly streaker payouts
        </Text>

        {/* ── Current Window ── */}
        <ParchmentCard style={s.currentWindowCard}>
          <Text style={[ts.cardLabel, { textAlign: 'center' }]}>Current Window</Text>
          {potLoading ? (
            <Text style={s.loadingText}>Reading live pot state...</Text>
          ) : (
            <>
              <Text style={s.potAmount}>
                {potSnapshot?.totalRedirectedAmountUi ?? '0'}
              </Text>
              <Text style={s.usdcLabel}>USDC</Text>
              <Text style={s.potMeta}>
                {potSnapshot?.windowLabel ?? 'Current month'}
                {' \u00B7 '}
                {potSnapshot?.redirectCount ?? 0} redirect
                {(potSnapshot?.redirectCount ?? 0) === 1 ? '' : 's'}
              </Text>
            </>
          )}
          {!potLoading && potSnapshot?.lastRecordedAtDate ? (
            <Text style={s.potMeta}>
              Last update: {new Date(potSnapshot.lastRecordedAtDate).toLocaleString()}
            </Text>
          ) : null}
          {!potLoading && showCurrentMonthTestNote ? (
            <Text style={s.warningText}>
              This current-month window was manually closed in dev testing. It stays visible below
              for audit history, but it is hidden from Your Payouts.
            </Text>
          ) : null}
          {potError ? (
            <Text style={s.warningText}>{potError}</Text>
          ) : null}
        </ParchmentCard>

        {/* ── Your Payouts ── */}
        <View style={s.section}>
          <Text style={ts.sectionLabel}>Your Payouts</Text>
          {historyLoading ? (
            <ParchmentCard>
              <Text style={s.loadingText}>Loading payout history...</Text>
            </ParchmentCard>
          ) : historyError ? (
            <ParchmentCard>
              <Text style={s.warningText}>{historyError}</Text>
            </ParchmentCard>
          ) : payoutHistory.length === 0 ? (
            <ParchmentCard>
              <Text style={s.emptyText}>No Community Pot payout history yet.</Text>
            </ParchmentCard>
          ) : (
            payoutHistory.map((window) => (
              <Pressable
                key={`payout-${window.windowId}`}
                onPress={() =>
                  navigation.navigate('CommunityPotWindow', {
                    windowId: window.windowId,
                    windowLabel: window.windowLabel,
                  })
                }
              >
                <ParchmentCard style={s.payoutCard}>
                  <View style={s.row}>
                    <Text style={s.windowLabel}>{window.windowLabel}</Text>
                    <Text style={[ts.cardLabel, { color: T.green }]}>
                      {renderRecipientStatus(window.userStatus)}
                    </Text>
                  </View>
                  <Text style={s.payoutAmount}>
                    {window.userPayoutAmountUi ?? '0'} USDC
                  </Text>
                  <Text style={s.metaText}>
                    Window status: {renderWindowStatus(window.status)}
                  </Text>
                  {window.userDistributedAt ? (
                    <Text style={s.metaText}>
                      Paid at: {new Date(window.userDistributedAt).toLocaleString()}
                    </Text>
                  ) : null}
                  {window.userTransactionSignature ? (
                    <Text style={s.metaText}>
                      Tx: {window.userTransactionSignature.slice(0, 12)}...
                    </Text>
                  ) : null}
                  {window.userLastError ? (
                    <Text style={s.warningText}>{window.userLastError}</Text>
                  ) : null}
                </ParchmentCard>
              </Pressable>
            ))
          )}
        </View>

        {/* ── Closed Windows ── */}
        <View style={s.section}>
          <Text style={ts.sectionLabel}>Closed Windows</Text>
          {historyLoading ? (
            <ParchmentCard>
              <Text style={s.loadingText}>Loading closed windows...</Text>
            </ParchmentCard>
          ) : history.length === 0 && !historyError ? (
            <ParchmentCard>
              <Text style={s.emptyText}>No closed windows yet.</Text>
            </ParchmentCard>
          ) : (
            history.map((window) => (
              <Pressable
                key={`window-${window.windowId}`}
                onPress={() =>
                  navigation.navigate('CommunityPotWindow', {
                    windowId: window.windowId,
                    windowLabel: window.windowLabel,
                  })
                }
              >
                <ParchmentCard style={s.closedWindowCard}>
                  <View style={s.row}>
                    <Text style={s.windowLabel}>{window.windowLabel}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[ts.cardLabel, { color: T.violet }]}>
                        {renderWindowStatus(window.status)}
                      </Text>
                      {potSnapshot?.windowId === window.windowId ? (
                        <Text style={s.currentMonthBadge}>Current Month</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={s.statsRow}>
                    <StatBox
                      label="Total"
                      value={`${window.totalRedirectedAmountUi}`}
                      color={T.textPrimary}
                    />
                    <StatBox
                      label="Distributed"
                      value={`${window.distributedAmountUi}`}
                      color={T.textPrimary}
                    />
                    <StatBox
                      label="Remaining"
                      value={`${window.remainingAmountUi}`}
                      color={T.textPrimary}
                    />
                  </View>
                  <Text style={s.metaText}>
                    Eligible: {window.eligibleRecipientCount}
                    {' \u00B7 '}
                    Paid recipients: {window.distributionCount}
                    {' \u00B7 '}
                    Redirects: {window.redirectCount}
                  </Text>
                  {window.closedAt ? (
                    <Text style={s.metaText}>
                      Closed at: {new Date(window.closedAt).toLocaleString()}
                    </Text>
                  ) : null}
                  {potSnapshot?.windowId === window.windowId && window.status !== 'OPEN' ? (
                    <Text style={s.warningText}>
                      Closed early in dev testing for payout verification.
                    </Text>
                  ) : null}
                </ParchmentCard>
              </Pressable>
            ))
          )}
        </View>

        {/* ── Per Course ── */}
        {activeCourseIds.length > 0 && (
          <View style={s.section}>
            <Text style={ts.sectionLabel}>Per Course</Text>
            {activeCourseIds.map((courseId) => {
              const state = courseStates[courseId];
              const course = courses.find((c) => c.id === courseId);
              if (!state || !course) return null;
              const isActive = courseId === activeCourseId;
              const saversRemaining = Math.max(0, 3 - state.saverCount);

              return (
                <ParchmentCard
                  key={courseId}
                  style={[
                    s.courseCard,
                    isActive && s.courseCardActive,
                  ]}
                >
                  <View style={s.row}>
                    <Text style={s.windowLabel}>
                      {course.title.length > 20
                        ? `${course.title.slice(0, 20)}\u2026`
                        : course.title}
                    </Text>
                    {isActive ? (
                      <View style={s.activeBadge}>
                        <Text style={s.activeBadgeText}>Active</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={s.courseStatsRow}>
                    <Text style={[s.courseStatText, { color: T.violet }]}>
                      Redirect active: {Math.round((state.currentYieldRedirectBps ?? 0) / 100)}%
                    </Text>
                    <Text style={s.courseStatText}>
                      Savers remaining: {saversRemaining}/3
                    </Text>
                  </View>
                  <Text style={s.metaText}>
                    Recovery: {state.saverRecoveryMode ? 'Active' : 'Idle'}
                    {' \u00B7 '}
                    Extension: {state.extensionDays ?? 0} day
                    {(state.extensionDays ?? 0) === 1 ? '' : 's'}
                  </Text>
                </ParchmentCard>
              );
            })}
          </View>
        )}

        {/* ── How Distribution Works ── */}
        <ParchmentCard style={s.infoCard}>
          <Text style={s.infoTitle}>How Distribution Works</Text>
          <Text style={s.infoBody}>
            {'\u2022'} Redirected yield accumulates in a monthly Community Pot{'\n'}
            {'\u2022'} Closed windows snapshot eligible active streakers{'\n'}
            {'\u2022'} Weight = current streak {'\u00d7'} locked principal{'\n'}
            {'\u2022'} Paid windows keep an on-chain receipt and backend status row
          </Text>
        </ParchmentCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scrollView: {
    flex: 1,
  },

  /* ── Current window hero card ── */
  currentWindowCard: {
    alignItems: 'center',
    padding: 24,
    borderColor: `${T.violet}30`,
    marginTop: 4,
  },
  potAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: T.violet,
    marginTop: 8,
  },
  usdcLabel: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 2,
  },
  potMeta: {
    fontSize: 11,
    color: T.textSecondary,
    marginTop: 4,
  },

  /* ── Section ── */
  section: {
    marginTop: 24,
  },

  /* ── Shared row layout ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  /* ── Payout card ── */
  payoutCard: {
    marginBottom: 12,
    borderColor: `${T.green}30`,
  },
  payoutAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: T.green,
    marginTop: 8,
  },

  /* ── Closed window card ── */
  closedWindowCard: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  currentMonthBadge: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.amber,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },

  /* ── Course card ── */
  courseCard: {
    marginBottom: 12,
  },
  courseCardActive: {
    borderColor: `${T.violet}50`,
  },
  courseStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  courseStatText: {
    fontSize: 13,
    color: T.textSecondary,
  },
  activeBadge: {
    backgroundColor: `${T.violet}20`,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.violet,
    letterSpacing: 1,
  },

  /* ── Info card ── */
  infoCard: {
    marginTop: 24,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textSecondary,
    marginBottom: 8,
  },
  infoBody: {
    fontSize: 12,
    lineHeight: 20,
    color: T.textMuted,
  },

  /* ── Shared text styles ── */
  windowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textPrimary,
  },
  metaText: {
    fontSize: 11,
    color: T.textSecondary,
    marginTop: 4,
  },
  loadingText: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: T.textSecondary,
  },
  warningText: {
    fontSize: 11,
    color: T.amber,
    marginTop: 8,
    textAlign: 'center',
  },
});
