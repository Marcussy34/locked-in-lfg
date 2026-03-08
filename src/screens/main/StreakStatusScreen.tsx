import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ApiError,
  getCourseRuntimeHistory,
  type RuntimeAuditEvent,
  type RuntimeHistoryResponse,
} from '@/services/api';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { useUserStore } from '@/stores';
import { useCourseStore } from '@/stores/courseStore';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  StatBox,
  T,
  ts,
} from '@/theme';

function renderEventTitle(event: RuntimeAuditEvent) {
  if (event.eventType === 'FUEL_BURN') {
    if (event.reason === 'BURNED') return 'Fuel Burned';
    if (event.reason === 'NO_FUEL') return 'Burn Skipped';
    if (event.reason === 'GAUNTLET_LOCKED') return 'Burn Locked';
    return 'Fuel Event';
  }

  if (event.reason === 'FULL_CONSEQUENCE') return 'Full Consequence';
  if (event.reason === 'SAVER_CONSUMED') return 'Saver Consumed';
  if (event.reason === 'GAUNTLET_LOCKED') return 'Miss Locked';
  return 'Miss Event';
}

function renderRelayStatus(status: RuntimeAuditEvent['lockVaultStatus']) {
  if (status === 'published') return 'Published';
  if (status === 'publishing') return 'Publishing';
  if (status === 'failed') return 'Failed';
  return 'Pending';
}

function renderEventRelayStatus(event: RuntimeAuditEvent) {
  const isLegacyManualEvent =
    event.lockVaultStatus === 'pending' &&
    !event.eventId.startsWith('auto-burn:') &&
    !event.eventId.startsWith('auto-miss:');
  if (isLegacyManualEvent) {
    return 'Legacy';
  }
  return renderRelayStatus(event.lockVaultStatus);
}

export function StreakStatusScreen() {
  const navigation = useNavigation();

  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const courses = useCourseStore((s) => s.courses);
  const refreshCourseRuntime = useCourseStore((s) => s.refreshCourseRuntime);
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const [history, setHistory] = useState<RuntimeHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const activeState = activeCourseId ? courseStates[activeCourseId] : null;
  const activeCourse = activeCourseId
    ? courses.find((c) => c.id === activeCourseId)
    : null;

  const streak = activeState?.currentStreak ?? 0;
  const longestStreak = activeState?.longestStreak ?? 0;
  const saverCount = activeState?.saverCount ?? 0;
  const saversRemaining = Math.max(0, 3 - saverCount);
  const gauntletActive = activeState?.gauntletActive ?? false;
  const gauntletDay = activeState?.gauntletDay ?? 1;
  const saverRecoveryMode = activeState?.saverRecoveryMode ?? false;
  const redirectPercent = Math.round((activeState?.currentYieldRedirectBps ?? 0) / 100);
  const extensionDays = activeState?.extensionDays ?? 0;

  const refreshBackendAccessToken = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('Connect your wallet again to read runtime history.');
    }

    const refreshed = await refreshAuthSession({ refreshToken });
    setAuthSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  }, [refreshToken, setAuthSession]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadRuntimeHistory = async () => {
        if (!activeCourseId) {
          if (!active) return;
          setHistory(null);
          setHistoryError(null);
          setHistoryLoading(false);
          return;
        }

        if (active) {
          setHistoryLoading(true);
        }

        let backendAccessToken = authToken;
        if (!backendAccessToken && refreshToken) {
          try {
            backendAccessToken = await refreshBackendAccessToken();
          } catch (error) {
            if (!active) return;
            setHistory(null);
            setHistoryError(
              error instanceof Error
                ? error.message
                : 'Connect your wallet again to read runtime history.',
            );
            setHistoryLoading(false);
            return;
          }
        }

        if (!backendAccessToken) {
          if (!active) return;
          setHistory(null);
          setHistoryError('Connect your wallet again to read runtime history.');
          setHistoryLoading(false);
          return;
        }

        void refreshCourseRuntime(activeCourseId, backendAccessToken).catch(() => {
          // Keep last synced runtime visible if refresh fails.
        });

        try {
          const response = await getCourseRuntimeHistory(activeCourseId, backendAccessToken);
          if (!active) return;
          setHistory(response);
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
              const retried = await getCourseRuntimeHistory(activeCourseId, refreshedToken);
              if (!active) return;
              setHistory(retried);
              setHistoryError(null);
              setHistoryLoading(false);
              return;
            } catch (refreshError) {
              if (!active) return;
              setHistory(null);
              setHistoryError(
                refreshError instanceof Error
                  ? refreshError.message
                  : 'Unable to read runtime history.',
              );
              setHistoryLoading(false);
              return;
            }
          }

          if (!active) return;
          setHistory(null);
          setHistoryError(
            error instanceof Error ? error.message : 'Unable to read runtime history.',
          );
          setHistoryLoading(false);
        }
      };

      void loadRuntimeHistory();
      return () => {
        active = false;
      };
    }, [activeCourseId, authToken, refreshBackendAccessToken, refreshCourseRuntime, refreshToken]),
  );

  // Flame state derived from streak
  const flameState = streak >= 3 ? 'BURNING' : streak >= 1 ? 'LIT' : 'COLD';
  const flameColor =
    flameState === 'BURNING'
      ? T.amber
      : flameState === 'LIT'
        ? T.rust
        : T.textMuted;

  const lampsLit = saversRemaining;

  return (
    <ScreenBackground>
      <ScrollView style={s.scrollView} contentContainerStyle={ts.scrollContent}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={ts.pageTitle}>Streak Status</Text>
        {activeCourse && (
          <Text style={s.courseSubtitle}>{activeCourse.title}</Text>
        )}

        {/* Flame state */}
        <ParchmentCard style={s.flameCard}>
          <Text style={[s.flameStateText, { color: flameColor }]}>
            {flameState}
          </Text>
          <Text style={s.flameDescription}>
            {flameState === 'BURNING'
              ? 'Your flame burns bright'
              : flameState === 'LIT'
                ? 'Your flame is lit'
                : 'Your flame is cold'}
          </Text>
        </ParchmentCard>

        {/* Streak info */}
        <View style={s.streakRow}>
          <StatBox label="Current Streak" value={`${streak}`} color={T.amber} />
          <StatBox label="Longest Streak" value={`${longestStreak}`} color={T.amber} />
        </View>

        {/* Saver Lamps */}
        <ParchmentCard style={s.sectionCard}>
          <Text style={ts.sectionLabel}>Saver Lamps</Text>
          <View style={s.lampsRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={s.lampItem}>
                <Text style={s.lampIcon}>
                  {i < lampsLit ? '\u{1F525}' : '\u{1F4A8}'}
                </Text>
                <Text style={[s.lampLabel, { color: i < lampsLit ? T.violet : T.textMuted }]}>
                  {i < lampsLit ? 'Active' : 'Used'}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.saverSummary}>
            {saversRemaining}/3 savers remaining
            {gauntletActive
              ? ` \u00B7 Locked during gauntlet (Day ${gauntletDay}/7)`
              : ''}
          </Text>
        </ParchmentCard>

        {/* Consequence State */}
        <ParchmentCard style={s.sectionCard}>
          <Text style={ts.sectionLabel}>Consequence State</Text>
          <View style={s.consequenceRow}>
            <Text style={ts.cardLabel}>Yield redirect</Text>
            <Text style={[s.consequenceValue, redirectPercent > 0 ? { color: T.crimson } : null]}>
              {redirectPercent}%
            </Text>
          </View>
          <View style={ts.divider} />
          <View style={s.consequenceRow}>
            <Text style={ts.cardLabel}>Saver recovery</Text>
            <Text style={[s.consequenceValue, saverRecoveryMode ? { color: T.green } : null]}>
              {saverRecoveryMode ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={ts.divider} />
          <View style={s.consequenceRow}>
            <Text style={ts.cardLabel}>Extension total</Text>
            <Text style={[s.consequenceValue, extensionDays > 0 ? { color: T.crimson } : null]}>
              {extensionDays} day{extensionDays !== 1 ? 's' : ''}
            </Text>
          </View>
        </ParchmentCard>

        {/* Gauntlet status */}
        {gauntletActive && (
          <ParchmentCard style={s.gauntletCard}>
            <Text style={s.gauntletTitle}>Gauntlet Active</Text>
            <Text style={s.gauntletSub}>
              Day {gauntletDay} of 7 — no savers allowed
            </Text>
          </ParchmentCard>
        )}

        {/* Runtime Audit */}
        <ParchmentCard style={s.sectionCard}>
          <Text style={ts.sectionLabel}>Runtime Audit</Text>
          {historyLoading ? (
            <Text style={s.loadingText}>Loading runtime history...</Text>
          ) : historyError ? (
            <Text style={s.errorText}>{historyError}</Text>
          ) : (
            <>
              <Text style={s.auditSummary}>
                Burns: {history?.burnCount ?? 0}
                {' \u00B7 '}Misses: {history?.missCount ?? 0}
                {' \u00B7 '}Extensions added: {history?.extensionDaysAdded ?? 0} day
                {(history?.extensionDaysAdded ?? 0) === 1 ? '' : 's'}
              </Text>
              {history?.events.length ? (
                history.events.map((event) => {
                  const saversBefore =
                    event.saverCountBefore == null ? null : Math.max(0, 3 - event.saverCountBefore);
                  const saversAfter =
                    event.saverCountAfter == null ? null : Math.max(0, 3 - event.saverCountAfter);
                  const extensionDelta =
                    event.extensionDaysBefore != null && event.extensionDaysAfter != null
                      ? Math.max(0, event.extensionDaysAfter - event.extensionDaysBefore)
                      : 0;

                  return (
                    <ParchmentCard key={event.eventId} style={s.eventCard} opacity={0.2}>
                      <View style={s.eventHeader}>
                        <Text style={s.eventTitle}>
                          {renderEventTitle(event)}
                        </Text>
                        <Text style={s.eventRelayStatus}>
                          {renderEventRelayStatus(event)}
                        </Text>
                      </View>
                      <Text style={s.eventTimestamp}>
                        {new Date(event.occurredAt).toLocaleString()}
                        {event.eventDay ? ` \u00B7 Day ${event.eventDay}` : ''}
                      </Text>
                      {event.eventType === 'FUEL_BURN' ? (
                        <Text style={s.eventDetail}>
                          Fuel: {event.fuelBefore ?? '--'} {'\u2192'} {event.fuelAfter ?? '--'}
                        </Text>
                      ) : (
                        <>
                          <Text style={s.eventDetail}>
                            Savers remaining: {saversBefore ?? '--'} {'\u2192'} {saversAfter ?? '--'}
                          </Text>
                          <Text style={s.eventDetailSub}>
                            Redirect: {Math.round((event.redirectBpsBefore ?? 0) / 100)}%
                            {' \u2192 '}
                            {Math.round((event.redirectBpsAfter ?? 0) / 100)}%
                          </Text>
                          <Text style={s.eventDetailSub}>
                            Extension: +{extensionDelta} day{extensionDelta === 1 ? '' : 's'}
                          </Text>
                        </>
                      )}
                      {event.lockVaultTransactionSignature ? (
                        <Text style={s.txHash}>
                          Tx: {event.lockVaultTransactionSignature.slice(0, 12)}...
                        </Text>
                      ) : null}
                      {event.lockVaultLastError ? (
                        <Text style={s.errorText}>{event.lockVaultLastError}</Text>
                      ) : null}
                    </ParchmentCard>
                  );
                })
              ) : (
                <Text style={s.emptyText}>
                  No runtime events recorded yet.
                </Text>
              )}
            </>
          )}
        </ParchmentCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  courseSubtitle: {
    fontSize: 12,
    color: T.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },

  // Flame card
  flameCard: {
    alignItems: 'center' as const,
    paddingVertical: 24,
    marginTop: 16,
  },
  flameStateText: {
    fontFamily: 'Georgia',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  flameDescription: {
    fontSize: 12,
    color: T.textSecondary,
    marginTop: 8,
  },

  // Streak row
  streakRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginTop: 12,
  },

  // Section cards
  sectionCard: {
    marginTop: 12,
  },

  // Lamps
  lampsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 28,
    marginTop: 8,
  },
  lampItem: {
    alignItems: 'center' as const,
  },
  lampIcon: {
    fontSize: 28,
  },
  lampLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  saverSummary: {
    fontSize: 11,
    color: T.textSecondary,
    textAlign: 'center' as const,
    marginTop: 12,
  },

  // Consequence
  consequenceRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  consequenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
  },

  // Gauntlet
  gauntletCard: {
    marginTop: 12,
    borderColor: `${T.violet}30`,
  },
  gauntletTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.violet,
  },
  gauntletSub: {
    fontSize: 11,
    color: T.textSecondary,
    marginTop: 4,
  },

  // Audit
  loadingText: {
    fontSize: 12,
    color: T.textSecondary,
    marginTop: 8,
  },
  errorText: {
    fontSize: 11,
    color: T.amber,
    marginTop: 6,
  },
  auditSummary: {
    fontSize: 13,
    color: T.textPrimary,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
    color: T.textSecondary,
    marginTop: 8,
  },

  // Event cards
  eventCard: {
    marginTop: 10,
    padding: 12,
  },
  eventHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: T.textPrimary,
  },
  eventRelayStatus: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  eventTimestamp: {
    fontSize: 10,
    color: T.textMuted,
    marginTop: 4,
  },
  eventDetail: {
    fontSize: 12,
    color: T.textPrimary,
    marginTop: 10,
  },
  eventDetailSub: {
    fontSize: 12,
    color: T.textPrimary,
    marginTop: 4,
  },
  txHash: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
    marginTop: 8,
  },
});
