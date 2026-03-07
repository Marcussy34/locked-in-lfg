import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ApiError, getCommunityPotWindowDetail, type CommunityPotWindowDetailResponse } from '@/services/api';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { useUserStore } from '@/stores';
import type { MainStackParamList } from '@/navigation/types';

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
    <SafeAreaView className="flex-1 bg-neutral-950">
      <ScrollView className="flex-1 px-6 pt-4">
        <Pressable onPress={() => navigation.goBack()}>
          <Text className="text-neutral-400">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="mt-4 text-2xl font-bold text-white">
          {route.params.windowLabel}
        </Text>
        <Text className="mt-1 text-sm text-neutral-500">
          Community Pot window details and payout receipts
        </Text>

        {loading ? (
          <Text className="mt-6 rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-500">
            Loading window details...
          </Text>
        ) : errorMessage ? (
          <Text className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
            {errorMessage}
          </Text>
        ) : detail ? (
          <>
            <View className="mt-6 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                  Window Summary
                </Text>
                <Text className="text-xs uppercase text-purple-200">
                  {renderWindowStatus(detail.status)}
                </Text>
              </View>
              <View className="mt-4 flex-row justify-between">
                <View>
                  <Text className="text-xs uppercase text-neutral-500">Total</Text>
                  <Text className="mt-1 text-xl font-bold text-white">
                    {detail.totalRedirectedAmountUi} USDC
                  </Text>
                </View>
                <View>
                  <Text className="text-xs uppercase text-neutral-500">Distributed</Text>
                  <Text className="mt-1 text-xl font-bold text-white">
                    {detail.distributedAmountUi} USDC
                  </Text>
                </View>
                <View>
                  <Text className="text-xs uppercase text-neutral-500">Remaining</Text>
                  <Text className="mt-1 text-xl font-bold text-white">
                    {detail.remainingAmountUi} USDC
                  </Text>
                </View>
              </View>
              <Text className="mt-4 text-xs text-neutral-500">
                Eligible: {detail.eligibleRecipientCount}
                {' \u00B7 '}
                Paid recipients: {detail.distributionCount}
                {' \u00B7 '}
                Redirects: {detail.redirectCount}
              </Text>
              {detail.closedAt ? (
                <Text className="mt-1 text-xs text-neutral-500">
                  Closed at: {new Date(detail.closedAt).toLocaleString()}
                </Text>
              ) : null}
            </View>

            {detail.userEntry ? (
              <View className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <Text className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Your Receipt
                </Text>
                <Text className="mt-3 text-2xl font-bold text-emerald-300">
                  {detail.userEntry.payoutAmountUi} USDC
                </Text>
                <Text className="mt-1 text-xs text-neutral-500">
                  Status: {renderRecipientStatus(detail.userEntry.status)}
                </Text>
                <Text className="mt-1 text-xs text-neutral-500">
                  Streak: {detail.userEntry.currentStreak}
                  {' \u00B7 '}
                  Principal: {detail.userEntry.principalAmountUi} USDC
                </Text>
                {detail.userEntry.distributedAt ? (
                  <Text className="mt-1 text-xs text-neutral-500">
                    Paid at: {new Date(detail.userEntry.distributedAt).toLocaleString()}
                  </Text>
                ) : null}
                {detail.userEntry.transactionSignature ? (
                  <Text className="mt-1 text-xs text-neutral-500">
                    Tx: {detail.userEntry.transactionSignature}
                  </Text>
                ) : null}
                {detail.userEntry.lastError ? (
                  <Text className="mt-2 text-xs text-amber-300">{detail.userEntry.lastError}</Text>
                ) : null}
              </View>
            ) : null}

            <View className="mt-6 mb-8">
              <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                Recipient Rows
              </Text>
              {detail.recipients.length === 0 ? (
                <Text className="rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-sm text-neutral-500">
                  No recipient rows for this window.
                </Text>
              ) : (
                detail.recipients.map((recipient) => (
                  <View
                    key={`${recipient.walletAddress}:${recipient.courseId}`}
                    className={`mb-3 rounded-xl border p-4 ${
                      recipient.isCurrentUser
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-neutral-700 bg-neutral-900'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-semibold text-white">
                        {recipient.displayIdentity}
                      </Text>
                      <Text className="text-xs uppercase text-purple-300">
                        {renderRecipientStatus(recipient.status)}
                      </Text>
                    </View>
                    <Text className="mt-2 text-lg font-semibold text-white">
                      {recipient.payoutAmountUi} USDC
                    </Text>
                    <Text className="mt-1 text-xs text-neutral-500">
                      Course: {recipient.courseId}
                      {' \u00B7 '}
                      Streak: {recipient.currentStreak}
                      {' \u00B7 '}
                      Principal: {recipient.principalAmountUi} USDC
                    </Text>
                    {recipient.distributedAt ? (
                      <Text className="mt-1 text-xs text-neutral-500">
                        Paid at: {new Date(recipient.distributedAt).toLocaleString()}
                      </Text>
                    ) : null}
                    {recipient.transactionSignature ? (
                      <Text className="mt-1 text-xs text-neutral-500">
                        Tx: {recipient.transactionSignature.slice(0, 18)}...
                      </Text>
                    ) : null}
                    {recipient.lastError ? (
                      <Text className="mt-2 text-xs text-amber-300">{recipient.lastError}</Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
