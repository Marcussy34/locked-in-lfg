import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, View, Text, Pressable, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ApiError,
  getYieldHistory,
  type YieldHistoryEntry,
  type YieldHistoryResponse,
} from '@/services/api';
import {
  buildRedeemIchorTransaction,
  connection,
  fetchLockAccountSnapshot,
  fetchRedemptionVaultBalance,
  getIchorRedemptionQuote,
  hasLockVaultConfig,
  signTransaction,
  type LockAccountSnapshot,
} from '@/services/solana';
import { useCourseStore } from '@/stores/courseStore';
import { useUserStore } from '@/stores';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  T,
  ts,
} from '@/theme';

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
  if (isLegacyManualHarvest) {
    return 'Legacy';
  }
  return renderHarvestStatus(entry.yieldSplitterStatus);
}

function renderHarvestReason(reason: string | null) {
  if (reason === 'HARVEST_APPLIED') return 'Applied';
  if (reason === 'HARVEST_SKIPPED') return 'Skipped';
  return reason ?? 'Pending';
}

export function IchorShopScreen() {
  const navigation = useNavigation();

  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const syncLockSnapshot = useCourseStore((s) => s.syncLockSnapshot);
  const walletAddress = useUserStore((s) => s.walletAddress);
  const walletAuthToken = useUserStore((s) => s.walletAuthToken);
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const activeLockAccountAddress = activeCourseId
    ? courseStates[activeCourseId]?.lockAccountAddress ?? null
    : null;

  const [lockSnapshot, setLockSnapshot] = useState<LockAccountSnapshot | null>(null);
  const [redemptionVaultBalanceUi, setRedemptionVaultBalanceUi] = useState('0');
  const [isLoadingLock, setIsLoadingLock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ichorAmount, setIchorAmount] = useState('1000');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [yieldHistory, setYieldHistory] = useState<YieldHistoryResponse | null>(null);
  const [yieldHistoryLoading, setYieldHistoryLoading] = useState(true);
  const [yieldHistoryError, setYieldHistoryError] = useState<string | null>(null);

  const refreshBackendAccessToken = useCallback(async () => {
    if (!refreshToken) {
      throw new Error('Connect your wallet again to read harvest history.');
    }

    const refreshed = await refreshAuthSession({ refreshToken });
    setAuthSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  }, [refreshToken, setAuthSession]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadYieldHistory = async () => {
        if (!activeCourseId) {
          if (!active) return;
          setYieldHistory(null);
          setYieldHistoryError(null);
          setYieldHistoryLoading(false);
          return;
        }

        if (active) {
          setYieldHistoryLoading(true);
        }

        let backendAccessToken = authToken;
        if (!backendAccessToken && refreshToken) {
          try {
            backendAccessToken = await refreshBackendAccessToken();
          } catch (error) {
            if (!active) return;
            setYieldHistory(null);
            setYieldHistoryError(
              error instanceof Error
                ? error.message
                : 'Connect your wallet again to read harvest history.',
            );
            setYieldHistoryLoading(false);
            return;
          }
        }

        if (!backendAccessToken) {
          if (!active) return;
          setYieldHistory(null);
          setYieldHistoryError('Connect your wallet again to read harvest history.');
          setYieldHistoryLoading(false);
          return;
        }

        try {
          const response = await getYieldHistory(activeCourseId, backendAccessToken);
          if (!active) return;
          setYieldHistory(response);
          setYieldHistoryError(null);
          setYieldHistoryLoading(false);
        } catch (error) {
          if (
            error instanceof ApiError &&
            (error.code === 'TOKEN_EXPIRED' || error.status === 401) &&
            refreshToken
          ) {
            try {
              const refreshedToken = await refreshBackendAccessToken();
              const retried = await getYieldHistory(activeCourseId, refreshedToken);
              if (!active) return;
              setYieldHistory(retried);
              setYieldHistoryError(null);
              setYieldHistoryLoading(false);
              return;
            } catch (refreshError) {
              if (!active) return;
              setYieldHistory(null);
              setYieldHistoryError(
                refreshError instanceof Error
                  ? refreshError.message
                  : 'Unable to read yield history.',
              );
              setYieldHistoryLoading(false);
              return;
            }
          }

          if (!active) return;
          setYieldHistory(null);
          setYieldHistoryError(
            error instanceof Error ? error.message : 'Unable to read yield history.',
          );
          setYieldHistoryLoading(false);
        }
      };

      void loadYieldHistory();

      if (
        !activeCourseId ||
        !walletAddress ||
        !activeLockAccountAddress ||
        !hasLockVaultConfig()
      ) {
        if (active) {
          setLockSnapshot(null);
          setIsLoadingLock(false);
        }
        return () => {
          active = false;
        };
      }

      setIsLoadingLock(true);
      void Promise.all([
        fetchLockAccountSnapshot({
          ownerAddress: walletAddress,
          courseId: activeCourseId,
        }),
        fetchRedemptionVaultBalance(),
      ])
        .then(([snapshot, redemptionVault]) => {
          if (!active) return;
          setStatusMessage(null);
          if (activeCourseId) {
            syncLockSnapshot(activeCourseId, snapshot);
          }
          setLockSnapshot(snapshot);
          setRedemptionVaultBalanceUi(redemptionVault.balanceUi);
        })
        .catch((error) => {
          if (!active) return;
          const message =
            error instanceof Error ? error.message : 'Unable to read live Ichor state.';
          setStatusMessage(message);
          setLockSnapshot(null);
          setRedemptionVaultBalanceUi('0');
        })
        .finally(() => {
          if (!active) return;
          setIsLoadingLock(false);
        });

      return () => {
        active = false;
      };
    }, [
      activeCourseId,
      activeLockAccountAddress,
      authToken,
      refreshBackendAccessToken,
      refreshToken,
      syncLockSnapshot,
      walletAddress,
    ]),
  );

  const quote = useMemo(() => {
    if (!lockSnapshot) return null;

    try {
      return getIchorRedemptionQuote(ichorAmount, lockSnapshot.ichorLifetimeTotal);
    } catch {
      return null;
    }
  }, [ichorAmount, lockSnapshot]);

  const availableIchor = lockSnapshot?.ichorCounter ?? 0;
  const redemptionVaultBalance = Number(redemptionVaultBalanceUi || '0');
  const recentHarvests = yieldHistory?.entries ?? [];
  const canRedeem =
    Boolean(lockSnapshot?.gauntletComplete) &&
    availableIchor > 0 &&
    redemptionVaultBalance > 0 &&
    !isSubmitting &&
    Boolean(quote) &&
    Number(ichorAmount) > 0 &&
    Number(ichorAmount) <= availableIchor;

  const handleRedeem = async () => {
    if (!activeCourseId || !walletAddress || !walletAuthToken) {
      setStatusMessage('Connect your wallet again before redeeming Ichor.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage('Building redemption transaction...');

      const buildResult = await buildRedeemIchorTransaction({
        ownerAddress: walletAddress,
        courseId: activeCourseId,
        ichorAmount,
      });

      setStatusMessage('Requesting wallet approval...');
      const signedTransaction = await signTransaction(
        walletAddress,
        buildResult.transaction,
        walletAuthToken,
      );

      setStatusMessage('Submitting transaction...');
      const rawTransaction = signedTransaction.serialize();
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        maxRetries: 3,
        preflightCommitment: 'confirmed',
      });

      setStatusMessage('Confirming redemption on-chain...');
      await connection.confirmTransaction(signature, 'confirmed');

      setStatusMessage(`Redeemed: ${signature.slice(0, 8)}...`);

      const refreshed = await fetchLockAccountSnapshot({
        ownerAddress: walletAddress,
        courseId: activeCourseId,
      });
      syncLockSnapshot(activeCourseId, refreshed);
      setLockSnapshot(refreshed);
      const redemptionVault = await fetchRedemptionVaultBalance();
      setRedemptionVaultBalanceUi(redemptionVault.balanceUi);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to redeem Ichor right now.';
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView style={s.scroll} contentContainerStyle={ts.scrollContent}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={ts.pageTitle}>Ichor Shop</Text>
        <Text style={ts.pageSub}>Exchange Ichor for USDC</Text>

        {isLoadingLock ? (
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color={T.textSecondary} />
            <Text style={s.loadingText}>Reading live Ichor state...</Text>
          </View>
        ) : (
          <>
            {/* ── Available Ichor hero ── */}
            <ParchmentCard style={s.heroCard}>
              <Text style={ts.cardLabel}>Available Ichor</Text>
              <Text style={s.heroValue}>{availableIchor.toLocaleString()}</Text>
              <Text style={s.heroSub}>
                Lifetime total: {lockSnapshot?.ichorLifetimeTotal ?? 0}
              </Text>
            </ParchmentCard>

            {/* ── Exchange Rate ── */}
            <ParchmentCard style={s.sectionCard}>
              <Text style={s.sectionTitle}>Exchange Rate</Text>
              <Text style={s.rateValue}>
                1,000 Ichor = {lockSnapshot?.conversionRateLabel ?? '0.90 USDC'}
              </Text>
              <Text style={s.footnote}>
                Current tier is based on lifetime Ichor earned on this lock.
              </Text>
              <Text style={s.footnote}>
                Redemption vault liquidity: {redemptionVaultBalanceUi} USDC
              </Text>
            </ParchmentCard>

            {/* ── Harvest Summary ── */}
            <ParchmentCard style={s.sectionCard}>
              <Text style={s.sectionTitle}>Harvest Summary</Text>
              {yieldHistoryLoading ? (
                <Text style={s.placeholderText}>Loading harvest history...</Text>
              ) : yieldHistoryError ? (
                <Text style={s.warningText}>{yieldHistoryError}</Text>
              ) : (
                <>
                  <View style={s.summaryRow}>
                    <View>
                      <Text style={ts.cardLabel}>Gross Yield</Text>
                      <Text style={s.summaryValue}>
                        {yieldHistory?.totalGrossYieldUi ?? '0'} USDC
                      </Text>
                    </View>
                    <View>
                      <Text style={ts.cardLabel}>Platform Fee</Text>
                      <Text style={s.summaryValue}>
                        {yieldHistory?.totalPlatformFeeUi ?? '0'} USDC
                      </Text>
                    </View>
                  </View>
                  <View style={s.summaryRowSecond}>
                    <View>
                      <Text style={ts.cardLabel}>Redirected</Text>
                      <Text style={s.summaryValue}>
                        {yieldHistory?.totalRedirectedUi ?? '0'} USDC
                      </Text>
                    </View>
                    <View>
                      <Text style={ts.cardLabel}>Ichor Awarded</Text>
                      <Text style={s.summaryValueAmber}>
                        {Number(yieldHistory?.totalIchorAwarded ?? '0').toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.footnote}>
                    Total harvests: {yieldHistory?.totalHarvests ?? 0}
                  </Text>
                </>
              )}
            </ParchmentCard>

            {/* ── Redeem Amount ── */}
            <ParchmentCard style={s.sectionCard}>
              <Text style={ts.sectionLabel}>Redeem Amount</Text>
              <TextInput
                style={s.textInput}
                keyboardType="number-pad"
                value={ichorAmount}
                onChangeText={setIchorAmount}
                placeholder="1000"
                placeholderTextColor={T.textMuted}
              />

              <Text style={[s.sectionTitle, { marginTop: 16 }]}>Quote</Text>
              <Text style={s.quoteValue}>
                {quote ? `${quote.usdcOutUi} USDC` : '--'}
              </Text>
              <Text style={s.footnote}>
                Redemption is available only after gauntlet completion.
              </Text>
            </ParchmentCard>

            {/* ── Status message ── */}
            {statusMessage ? (
              <ParchmentCard style={s.statusCard}>
                <Text style={s.statusText}>{statusMessage}</Text>
              </ParchmentCard>
            ) : null}

            {/* ── Recent Harvests ── */}
            <ParchmentCard style={s.sectionCard}>
              <Text style={s.sectionTitle}>Recent Harvests</Text>
              {yieldHistoryLoading ? (
                <Text style={s.placeholderText}>Loading harvest receipts...</Text>
              ) : yieldHistoryError ? (
                <Text style={s.warningText}>{yieldHistoryError}</Text>
              ) : recentHarvests.length === 0 ? (
                <Text style={s.placeholderText}>No harvest history yet.</Text>
              ) : (
                recentHarvests.map((entry) => (
                  <View key={entry.harvestId} style={s.harvestEntry}>
                    <View style={s.harvestHeader}>
                      <Text style={s.harvestKind}>{entry.kind}</Text>
                      <Text style={s.harvestStatus}>
                        {renderHarvestStatus(entry.lockVaultStatus)}
                      </Text>
                    </View>
                    <Text style={s.harvestReason}>
                      {renderHarvestReason(entry.reason)}
                    </Text>
                    <Text style={s.footnote}>
                      {new Date(entry.harvestedAt).toLocaleString()}
                    </Text>
                    <Text style={s.harvestDetails}>
                      Gross: {entry.grossYieldAmountUi} USDC
                      {' \u00B7 '}Fee: {entry.platformFeeAmountUi} USDC
                      {' \u00B7 '}Redirect: {entry.redirectedAmountUi} USDC
                    </Text>
                    <Text style={s.harvestIchor}>
                      Ichor awarded: {Number(entry.ichorAwarded).toLocaleString()}
                    </Text>
                    <Text style={s.footnote}>
                      Splitter: {renderSplitterStatus(entry)}
                      {' \u00B7 '}LockVault: {renderHarvestStatus(entry.lockVaultStatus)}
                      {' \u00B7 '}Pot: {renderHarvestStatus(entry.communityPotStatus)}
                    </Text>
                    {entry.lockVaultTransactionSignature ? (
                      <Text style={s.footnote}>
                        Lock tx: {entry.lockVaultTransactionSignature.slice(0, 12)}...
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </ParchmentCard>

            {/* ── Redeem button ── */}
            <Pressable
              style={({ pressed }) => [
                ts.primaryBtn,
                s.redeemBtn,
                !canRedeem && s.redeemBtnDisabled,
                pressed && canRedeem && { opacity: 0.8 },
              ]}
              disabled={!canRedeem}
              onPress={() => {
                void handleRedeem();
              }}
            >
              <Text style={ts.primaryBtnText}>
                {isSubmitting ? 'Redeeming...' : 'EXCHANGE ICHOR'}
              </Text>
              <Text style={s.redeemSubText}>
                {availableIchor <= 0
                  ? 'No Ichor available yet'
                  : redemptionVaultBalance <= 0
                    ? 'Protocol redemption vault has no USDC yet'
                    : 'Owner-signed on-chain redemption'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scroll: {
    flex: 1,
  },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  loadingText: {
    fontSize: 14,
    color: T.textSecondary,
  },

  // Hero card
  heroCard: {
    alignItems: 'center',
    padding: 24,
    marginTop: 8,
    borderColor: T.borderAlive,
  },
  heroValue: {
    fontSize: 36,
    fontWeight: '700',
    color: T.amber,
    marginTop: 8,
  },
  heroSub: {
    fontSize: 12,
    color: T.textSecondary,
    marginTop: 8,
  },

  // Section cards
  sectionCard: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textSecondary,
  },

  // Exchange rate
  rateValue: {
    fontSize: 18,
    color: T.textPrimary,
    marginTop: 8,
  },

  // Footnote
  footnote: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 4,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  summaryRowSecond: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
    marginTop: 4,
  },
  summaryValueAmber: {
    fontSize: 18,
    fontWeight: '700',
    color: T.amber,
    marginTop: 4,
  },

  // Placeholder / warning
  placeholderText: {
    fontSize: 14,
    color: T.textSecondary,
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    color: T.amber,
    marginTop: 12,
  },

  // Text input
  textInput: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.borderDormant,
    backgroundColor: T.bg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: T.textPrimary,
  },

  // Quote
  quoteValue: {
    fontSize: 18,
    color: T.textPrimary,
    marginTop: 8,
  },

  // Status
  statusCard: {
    marginTop: 20,
  },
  statusText: {
    fontSize: 14,
    color: T.textPrimary,
  },

  // Harvest entries
  harvestEntry: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.borderDormant,
    backgroundColor: T.bg,
    padding: 14,
  },
  harvestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  harvestKind: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '600',
    color: T.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  harvestStatus: {
    fontSize: 12,
    color: T.textSecondary,
  },
  harvestReason: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
    marginTop: 8,
  },
  harvestDetails: {
    fontSize: 14,
    color: T.textSecondary,
    marginTop: 12,
  },
  harvestIchor: {
    fontSize: 14,
    color: T.amber,
    marginTop: 4,
  },

  // Redeem button
  redeemBtn: {
    marginTop: 24,
    marginBottom: 32,
  },
  redeemBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: T.borderDormant,
  },
  redeemSubText: {
    fontSize: 12,
    color: T.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
