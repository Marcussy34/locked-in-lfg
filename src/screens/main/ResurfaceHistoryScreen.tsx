import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '@/navigation/types';
import { ApiError, getUnlockReceipts } from '@/services/api';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { useResurfaceStore, useUserStore } from '@/stores';
import { useCourseStore } from '@/stores/courseStore';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  CornerMarks,
  T,
  ts,
} from '@/theme';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type HistoryRoute = RouteProp<MainStackParamList, 'ResurfaceHistory'>;

export function ResurfaceHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<HistoryRoute>();
  const walletAddress = useUserStore((s) => s.walletAddress);
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);
  const courses = useCourseStore((s) => s.courses);
  const hydrateReceipts = useResurfaceStore((s) => s.hydrateReceipts);
  const allReceipts = useResurfaceStore((s) => s.receipts);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
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
                courses.find((course) => course.id === receipt.courseId)?.title ?? receipt.courseId,
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
                    courses.find((course) => course.id === receipt.courseId)?.title ??
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
            } catch (refreshError) {
              if (!active) return;
              setErrorMessage(
                refreshError instanceof Error
                  ? refreshError.message
                  : 'Unable to read resurface receipts.',
              );
              setLoading(false);
              return;
            }
          }

          if (!active) return;
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to read resurface receipts.',
          );
          setLoading(false);
        }
      };

      void loadReceipts();
      return () => {
        active = false;
      };
    }, [authToken, courses, hydrateReceipts, refreshBackendAccessToken, refreshToken]),
  );

  return (
    <ScreenBackground>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={ts.scrollContent}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={ts.pageTitle}>Resurface Receipts</Text>
        <Text style={ts.pageSub}>
          Unlock confirmations and returned-funds history
        </Text>

        {loading ? (
          <ParchmentCard style={{ marginTop: 16 }}>
            <Text style={s.infoText}>Loading resurface receipts...</Text>
          </ParchmentCard>
        ) : errorMessage ? (
          <ParchmentCard style={{ marginTop: 16, borderColor: `${T.amber}30` }}>
            <Text style={[s.infoText, { color: T.amber }]}>{errorMessage}</Text>
          </ParchmentCard>
        ) : receipts.length === 0 ? (
          <ParchmentCard style={{ marginTop: 16 }}>
            <Text style={s.infoText}>No resurface receipts yet.</Text>
          </ParchmentCard>
        ) : (
          receipts.map((receipt) => {
            const isLatest = route.params?.receiptId === receipt.id;
            return (
              <ParchmentCard
                key={receipt.id}
                style={[
                  { marginTop: 16 },
                  isLatest ? { borderColor: `${T.green}40` } : {},
                ]}
                opacity={isLatest ? 0.4 : 0.3}
              >
                {isLatest && <CornerMarks />}
                <View style={s.receiptHeader}>
                  <Text style={s.receiptTitle}>{receipt.courseTitle}</Text>
                  <Text style={[s.receiptBadge, isLatest ? { color: T.green } : {}]}>
                    {isLatest ? 'Latest' : 'Receipt'}
                  </Text>
                </View>
                <Text style={s.receiptRow}>
                  Principal returned: {receipt.principalAmountUi} USDC
                </Text>
                <Text style={s.receiptRow}>
                  SKR returned: {receipt.skrLockedAmountUi}
                </Text>
                <Text style={s.receiptRow}>
                  Unlock target: {new Date(receipt.lockEndDate).toLocaleString()}
                </Text>
                <Text style={s.receiptRow}>
                  Unlocked at: {new Date(receipt.unlockedAt).toLocaleString()}
                </Text>
                {receipt.verifiedBlockTime ? (
                  <Text style={s.receiptRow}>
                    Verified at: {new Date(receipt.verifiedBlockTime).toLocaleString()}
                  </Text>
                ) : null}
                <Text style={s.receiptMeta}>
                  Lock account: {receipt.lockAccountAddress}
                </Text>
                <Text style={s.receiptMeta}>
                  Tx: {receipt.unlockTxSignature}
                </Text>
                <Text style={s.receiptMeta}>
                  Source: {receipt.source === 'backend' ? 'Backend verified' : 'Local pending sync'}
                </Text>
              </ParchmentCard>
            );
          })
        )}

        <View style={{ marginTop: 24, marginBottom: 32 }}>
          <Pressable
            style={({ pressed }) => [ts.secondaryBtn, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate('CourseBrowser')}
          >
            <Text style={ts.secondaryBtnText}>Browse Courses</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  infoText: {
    fontSize: 13,
    color: T.textSecondary,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: T.textPrimary,
  },
  receiptBadge: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: T.textMuted,
  },
  receiptRow: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 4,
  },
  receiptMeta: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: T.textMuted,
    marginTop: 4,
  },
});
