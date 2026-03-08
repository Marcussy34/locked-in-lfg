import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ApiError, getCommunityPotWindowDetail, type CommunityPotWindowDetailResponse } from '@/services/api';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { useUserStore } from '@/stores';
import type { MainStackParamList } from '@/navigation/types';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  CornerMarks,
  T,
  ts,
} from '@/theme';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type WindowRoute = RouteProp<MainStackParamList, 'CommunityPotWindow'>;

function renderWindowStatus(status: CommunityPotWindowDetailResponse['status']) {
  if (status === 'DISTRIBUTED') return 'Distributed';
  if (status === 'CLOSED') return 'Closed';
  return 'Open';
}

function renderRecipientStatus(status: CommunityPotWindowDetailResponse['recipients'][number]['status']) {
  if (status === 'DISTRIBUTED') return 'Paid';
  if (status === 'FAILED') return 'Failed';
  if (status === 'PUBLISHING') return 'Publishing';
  if (status === 'PENDING') return 'Pending';
  return 'Unknown';
}

export function CommunityPotWindowScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<WindowRoute>();
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const [detail, setDetail] = useState<CommunityPotWindowDetailResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBackendAccessToken = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('Connect your wallet again to read window details.');
    }

    const refreshed = await refreshAuthSession({ refreshToken });
    setAuthSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  }, [refreshToken, setAuthSession]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadDetail = async () => {
        setLoading(true);
        let backendAccessToken = authToken;

        if (!backendAccessToken && refreshToken) {
          backendAccessToken = await refreshBackendAccessToken();
        }

        if (!backendAccessToken) {
          if (!active) return;
          setDetail(null);
          setErrorMessage('Connect your wallet again to read window details.');
          setLoading(false);
          return;
        }

        try {
          const response = await getCommunityPotWindowDetail(route.params.windowId, backendAccessToken);
          if (!active) return;
          setDetail(response);
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
              const retried = await getCommunityPotWindowDetail(route.params.windowId, refreshedToken);
              if (!active) return;
              setDetail(retried);
              setErrorMessage(null);
              setLoading(false);
              return;
            } catch (refreshError) {
              if (!active) return;
              setDetail(null);
              setErrorMessage(
                refreshError instanceof Error
                  ? refreshError.message
                  : 'Unable to read Community Pot window details.',
              );
              setLoading(false);
              return;
            }
          }

          if (!active) return;
          setDetail(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to read Community Pot window details.',
          );
          setLoading(false);
        }
      };

      void loadDetail();
      return () => {
        active = false;
      };
    }, [authToken, refreshBackendAccessToken, refreshToken, route.params.windowId]),
  );

  return (
    <ScreenBackground>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={ts.scrollContent}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={ts.pageTitle}>{route.params.windowLabel}</Text>
        <Text style={ts.pageSub}>
          Community Pot window details and payout receipts
        </Text>

        {loading ? (
          <ParchmentCard style={{ marginTop: 16 }}>
            <Text style={s.infoText}>Loading window details...</Text>
          </ParchmentCard>
        ) : errorMessage ? (
          <ParchmentCard style={{ marginTop: 16, borderColor: `${T.amber}30` }}>
            <Text style={[s.infoText, { color: T.amber }]}>{errorMessage}</Text>
          </ParchmentCard>
        ) : detail ? (
          <>
            {/* Window Summary */}
            <ParchmentCard style={s.summaryCard} opacity={0.35}>
              <View style={s.summaryHeader}>
                <Text style={[ts.sectionLabel, { marginBottom: 0, marginTop: 0 }]}>
                  Window Summary
                </Text>
                <Text style={[s.statusBadge, { color: T.violet }]}>
                  {renderWindowStatus(detail.status)}
                </Text>
              </View>

              <View style={s.statRow}>
                <View style={s.statCol}>
                  <Text style={ts.cardLabel}>Total</Text>
                  <Text style={[ts.cardValue, { color: T.textPrimary }]}>
                    {detail.totalRedirectedAmountUi} USDC
                  </Text>
                </View>
                <View style={s.statCol}>
                  <Text style={ts.cardLabel}>Distributed</Text>
                  <Text style={[ts.cardValue, { color: T.green }]}>
                    {detail.distributedAmountUi} USDC
                  </Text>
                </View>
                <View style={s.statCol}>
                  <Text style={ts.cardLabel}>Remaining</Text>
                  <Text style={[ts.cardValue, { color: T.amber }]}>
                    {detail.remainingAmountUi} USDC
                  </Text>
                </View>
              </View>

              <Text style={s.metaText}>
                Eligible: {detail.eligibleRecipientCount}
                {' \u00B7 '}
                Paid recipients: {detail.distributionCount}
                {' \u00B7 '}
                Redirects: {detail.redirectCount}
              </Text>
              {detail.closedAt ? (
                <Text style={s.metaText}>
                  Closed at: {new Date(detail.closedAt).toLocaleString()}
                </Text>
              ) : null}
            </ParchmentCard>

            {/* User Receipt */}
            {detail.userEntry ? (
              <ParchmentCard style={s.userReceiptCard} opacity={0.4}>
                <CornerMarks />
                <Text style={[ts.sectionLabel, { marginBottom: 0, marginTop: 0 }]}>
                  Your Receipt
                </Text>
                <Text style={s.userPayoutAmount}>
                  {detail.userEntry.payoutAmountUi} USDC
                </Text>
                <Text style={s.metaText}>
                  Status: {renderRecipientStatus(detail.userEntry.status)}
                </Text>
                <Text style={s.metaText}>
                  Streak: {detail.userEntry.currentStreak}
                  {' \u00B7 '}
                  Principal: {detail.userEntry.principalAmountUi} USDC
                </Text>
                {detail.userEntry.distributedAt ? (
                  <Text style={s.metaText}>
                    Paid at: {new Date(detail.userEntry.distributedAt).toLocaleString()}
                  </Text>
                ) : null}
                {detail.userEntry.transactionSignature ? (
                  <Text style={s.txText}>
                    Tx: {detail.userEntry.transactionSignature}
                  </Text>
                ) : null}
                {detail.userEntry.lastError ? (
                  <Text style={[s.metaText, { color: T.amber, marginTop: 8 }]}>
                    {detail.userEntry.lastError}
                  </Text>
                ) : null}
              </ParchmentCard>
            ) : null}

            {/* Recipient Rows */}
            <View style={{ marginTop: 24, marginBottom: 32 }}>
              <Text style={ts.sectionLabel}>Recipient Rows</Text>
              {detail.recipients.length === 0 ? (
                <ParchmentCard>
                  <Text style={s.infoText}>No recipient rows for this window.</Text>
                </ParchmentCard>
              ) : (
                detail.recipients.map((recipient) => (
                  <ParchmentCard
                    key={`${recipient.walletAddress}:${recipient.courseId}`}
                    style={[
                      s.recipientCard,
                      recipient.isCurrentUser ? { borderColor: `${T.green}40` } : {},
                    ]}
                    opacity={recipient.isCurrentUser ? 0.4 : 0.3}
                  >
                    <View style={s.recipientHeader}>
                      <Text style={s.recipientName}>
                        {recipient.displayIdentity}
                      </Text>
                      <Text style={[s.statusBadge, { color: T.violet }]}>
                        {renderRecipientStatus(recipient.status)}
                      </Text>
                    </View>
                    <Text style={s.recipientPayout}>
                      {recipient.payoutAmountUi} USDC
                    </Text>
                    <Text style={s.metaText}>
                      Course: {recipient.courseId}
                      {' \u00B7 '}
                      Streak: {recipient.currentStreak}
                      {' \u00B7 '}
                      Principal: {recipient.principalAmountUi} USDC
                    </Text>
                    {recipient.distributedAt ? (
                      <Text style={s.metaText}>
                        Paid at: {new Date(recipient.distributedAt).toLocaleString()}
                      </Text>
                    ) : null}
                    {recipient.transactionSignature ? (
                      <Text style={s.txText}>
                        Tx: {recipient.transactionSignature.slice(0, 18)}...
                      </Text>
                    ) : null}
                    {recipient.lastError ? (
                      <Text style={[s.metaText, { color: T.amber, marginTop: 8 }]}>
                        {recipient.lastError}
                      </Text>
                    ) : null}
                  </ParchmentCard>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  infoText: {
    fontSize: 13,
    color: T.textSecondary,
  },
  summaryCard: {
    marginTop: 16,
    borderColor: `${T.violet}30`,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusBadge: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCol: {
    flex: 1,
  },
  metaText: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 4,
  },
  txText: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
    marginTop: 4,
  },
  userReceiptCard: {
    marginTop: 16,
    borderColor: `${T.green}30`,
  },
  userPayoutAmount: {
    fontFamily: 'Georgia',
    fontSize: 24,
    fontWeight: '700',
    color: T.green,
    marginTop: 12,
  },
  recipientCard: {
    marginTop: 10,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
  },
  recipientPayout: {
    fontSize: 17,
    fontWeight: '600',
    color: T.textPrimary,
    marginTop: 4,
  },
});
