import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView className="flex-1 bg-neutral-950">
      <ScrollView className="flex-1 px-6 pt-4">
        <Pressable onPress={() => navigation.goBack()}>
          <Text className="text-neutral-400">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="mt-4 text-2xl font-bold text-white">Community Pot</Text>
        <Text className="mt-1 text-sm text-neutral-500">
          USDC redirected from saver penalties and monthly streaker payouts
        </Text>

        <View className="mt-6 items-center rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6">
          <Text className="text-xs font-semibold uppercase tracking-wider text-purple-400">
            Current Window
          </Text>
          {potLoading ? (
            <Text className="mt-4 text-sm text-neutral-400">Reading live pot state...</Text>
          ) : (
            <>
              <Text className="mt-2 text-4xl font-bold text-purple-300">
                {potSnapshot?.totalRedirectedAmountUi ?? '0'}
              </Text>
              <Text className="mt-1 text-sm text-neutral-500">USDC</Text>
              <Text className="mt-2 text-xs text-neutral-500">
                {potSnapshot?.windowLabel ?? 'Current month'}
                {' \u00B7 '}
                {potSnapshot?.redirectCount ?? 0} redirect
                {(potSnapshot?.redirectCount ?? 0) === 1 ? '' : 's'}
              </Text>
            </>
          )}
          {!potLoading && potSnapshot?.lastRecordedAtDate ? (
            <Text className="mt-1 text-xs text-neutral-500">
              Last update: {new Date(potSnapshot.lastRecordedAtDate).toLocaleString()}
            </Text>
          ) : null}
          {!potLoading && showCurrentMonthTestNote ? (
            <Text className="mt-2 text-center text-xs text-amber-300">
              This current-month window was manually closed in dev testing. It stays visible below
              for audit history, but it is hidden from Your Payouts.
            </Text>
          ) : null}
          {potError ? (
            <Text className="mt-2 text-center text-xs text-amber-300">{potError}</Text>
          ) : null}
        </View>

        <View className="mt-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Your Payouts
          </Text>
          {historyLoading ? (
            <Text className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-500">
              Loading payout history...
            </Text>
          ) : historyError ? (
            <Text className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
              {historyError}
            </Text>
          ) : payoutHistory.length === 0 ? (
            <Text className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-500">
              No Community Pot payout history yet.
            </Text>
          ) : (
            payoutHistory.map((window) => (
              <Pressable
                key={`payout-${window.windowId}`}
                className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
                onPress={() =>
                  navigation.navigate('CommunityPotWindow', {
                    windowId: window.windowId,
                    windowLabel: window.windowLabel,
                  })
                }
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-white">
                    {window.windowLabel}
                  </Text>
                  <Text className="text-xs uppercase text-emerald-300">
                    {renderRecipientStatus(window.userStatus)}
                  </Text>
                </View>
                <Text className="mt-2 text-2xl font-bold text-emerald-300">
                  {window.userPayoutAmountUi ?? '0'} USDC
                </Text>
                <Text className="mt-1 text-xs text-neutral-500">
                  Window status: {renderWindowStatus(window.status)}
                </Text>
                {window.userDistributedAt ? (
                  <Text className="mt-1 text-xs text-neutral-500">
                    Paid at: {new Date(window.userDistributedAt).toLocaleString()}
                  </Text>
                ) : null}
                {window.userTransactionSignature ? (
                  <Text className="mt-1 text-xs text-neutral-500">
                    Tx: {window.userTransactionSignature.slice(0, 12)}...
                  </Text>
                ) : null}
                {window.userLastError ? (
                  <Text className="mt-2 text-xs text-amber-300">{window.userLastError}</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>

        <View className="mt-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Closed Windows
          </Text>
          {historyLoading ? (
            <Text className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-500">
              Loading closed windows...
            </Text>
          ) : history.length === 0 && !historyError ? (
            <Text className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-500">
              No closed windows yet.
            </Text>
          ) : (
            history.map((window) => (
              <Pressable
                key={`window-${window.windowId}`}
                className="mb-3 rounded-xl border border-neutral-700 bg-neutral-900 p-4"
                onPress={() =>
                  navigation.navigate('CommunityPotWindow', {
                    windowId: window.windowId,
                    windowLabel: window.windowLabel,
                  })
                }
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-white">
                    {window.windowLabel}
                  </Text>
                  <View className="items-end">
                    <Text className="text-xs uppercase text-purple-300">
                      {renderWindowStatus(window.status)}
                    </Text>
                    {potSnapshot?.windowId === window.windowId ? (
                      <Text className="mt-1 text-[10px] uppercase text-amber-300">
                        Current Month
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View className="mt-3 flex-row justify-between">
                  <View>
                    <Text className="text-xs uppercase text-neutral-500">Total</Text>
                    <Text className="mt-1 text-lg font-semibold text-white">
                      {window.totalRedirectedAmountUi} USDC
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs uppercase text-neutral-500">Distributed</Text>
                    <Text className="mt-1 text-lg font-semibold text-white">
                      {window.distributedAmountUi} USDC
                    </Text>
                  </View>
                  <View>
                    <Text className="text-xs uppercase text-neutral-500">Remaining</Text>
                    <Text className="mt-1 text-lg font-semibold text-white">
                      {window.remainingAmountUi} USDC
                    </Text>
                  </View>
                </View>
                <Text className="mt-3 text-xs text-neutral-500">
                  Eligible: {window.eligibleRecipientCount}
                  {' \u00B7 '}
                  Paid recipients: {window.distributionCount}
                  {' \u00B7 '}
                  Redirects: {window.redirectCount}
                </Text>
                {window.closedAt ? (
                  <Text className="mt-1 text-xs text-neutral-500">
                    Closed at: {new Date(window.closedAt).toLocaleString()}
                  </Text>
                ) : null}
                {potSnapshot?.windowId === window.windowId && window.status !== 'OPEN' ? (
                  <Text className="mt-2 text-xs text-amber-300">
                    Closed early in dev testing for payout verification.
                  </Text>
                ) : null}
              </Pressable>
            ))
          )}
        </View>

        {activeCourseIds.length > 0 && (
          <View className="mt-6">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
              Per Course
            </Text>
            {activeCourseIds.map((courseId) => {
              const state = courseStates[courseId];
              const course = courses.find((c) => c.id === courseId);
              if (!state || !course) return null;
              const isActive = courseId === activeCourseId;
              const saversRemaining = Math.max(0, 3 - state.saverCount);

              return (
                <View
                  key={courseId}
                  className={`mb-3 rounded-xl border p-4 ${
                    isActive
                      ? 'border-purple-500/50 bg-purple-500/5'
                      : 'border-neutral-700 bg-neutral-900'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-white">
                      {course.title.length > 20
                        ? `${course.title.slice(0, 20)}\u2026`
                        : course.title}
                    </Text>
                    {isActive ? (
                      <View className="rounded-full bg-purple-500/20 px-2 py-0.5">
                        <Text className="text-xs text-purple-400">Active</Text>
                      </View>
                    ) : null}
                  </View>
                  <View className="mt-2 flex-row gap-4">
                    <Text className="text-sm text-purple-400">
                      Redirect active: {Math.round((state.currentYieldRedirectBps ?? 0) / 100)}%
                    </Text>
                    <Text className="text-sm text-neutral-500">
                      Savers remaining: {saversRemaining}/3
                    </Text>
                  </View>
                  <Text className="mt-2 text-xs text-neutral-500">
                    Recovery: {state.saverRecoveryMode ? 'Active' : 'Idle'}
                    {' \u00B7 '}
                    Extension: {state.extensionDays ?? 0} day
                    {(state.extensionDays ?? 0) === 1 ? '' : 's'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View className="mt-6 mb-8 rounded-xl border border-neutral-700 bg-neutral-900 p-4">
          <Text className="text-sm font-semibold text-neutral-400">How Distribution Works</Text>
          <Text className="mt-2 text-xs leading-5 text-neutral-500">
            {'\u2022'} Redirected yield accumulates in a monthly Community Pot{'\n'}
            {'\u2022'} Closed windows snapshot eligible active streakers{'\n'}
            {'\u2022'} Weight = current streak \u00d7 locked principal{'\n'}
            {'\u2022'} Paid windows keep an on-chain receipt and backend status row
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
