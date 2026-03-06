import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/navigation/types';
import { connection, buildLockFundsTransaction, fetchWalletDepositBalances, hasLockVaultConfig, signTransaction, type LockDurationDays } from '@/services/solana';
import { useCourseStore, useUserStore } from '@/stores';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Deposit'>;
type DepositRoute = RouteProp<OnboardingStackParamList, 'Deposit'>;

const LOCK_DURATIONS: LockDurationDays[] = [30, 60, 90];

export function DepositScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DepositRoute>();
  const walletAddress = useUserStore((s) => s.walletAddress);
  const walletAuthToken = useUserStore((s) => s.walletAuthToken);
  const startGauntlet = useUserStore((s) => s.startGauntlet);
  const activateCourse = useCourseStore((s) => s.activateCourse);
  const courses = useCourseStore((s) => s.courses);
  const course = useMemo(
    () => courses.find((entry) => entry.id === route.params.courseId) ?? null,
    [courses, route.params.courseId],
  );

  const [lockDuration, setLockDuration] = useState<LockDurationDays>(30);
  const [principalAmount, setPrincipalAmount] = useState('100');
  const [skrAmount, setSkrAmount] = useState('0');
  const [balances, setBalances] = useState<{ stable: string; skr: string }>({
    stable: '0',
    skr: '0',
  });
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLockVaultConfig()) {
      setConfigMessage(
        'LockVault env config is missing. Add the program ID and mint addresses before using real deposits.',
      );
      return;
    }

    setConfigMessage(null);
  }, []);

  useEffect(() => {
    if (!walletAddress || !hasLockVaultConfig()) {
      return;
    }

    let cancelled = false;
    setIsRefreshingBalances(true);

    void fetchWalletDepositBalances(walletAddress)
      .then((nextBalances) => {
        if (cancelled) return;
        setBalances({
          stable: nextBalances.stableBalanceUi,
          skr: nextBalances.skrBalanceUi,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Unable to load wallet balances.';
        setStatusMessage(message);
      })
      .finally(() => {
        if (cancelled) return;
        setIsRefreshingBalances(false);
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const handleDeposit = async () => {
    if (!walletAddress || !walletAuthToken) {
      setStatusMessage('Connect your wallet again before creating a lock.');
      return;
    }

    if (!hasLockVaultConfig()) {
      setStatusMessage(
        'LockVault env config is missing. Add the program ID and mint addresses first.',
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage('Building lock transaction...');

      const buildResult = await buildLockFundsTransaction({
        ownerAddress: walletAddress,
        courseId: route.params.courseId,
        stableAmountUi: principalAmount,
        skrAmountUi: skrAmount,
        lockDurationDays: lockDuration,
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

      setStatusMessage('Confirming transaction on-chain...');
      await connection.confirmTransaction(signature, 'confirmed');

      activateCourse(route.params.courseId, {
        amount: Number(principalAmount),
        duration: lockDuration,
        lockAccountAddress: buildResult.lockAccountAddress,
        stableMintAddress: buildResult.stableMintAddress,
        skrAmount: Number(skrAmount),
      });
      startGauntlet();

      setStatusMessage(`Lock created: ${signature.slice(0, 8)}...`);
      navigation.navigate('GauntletRoom');

      void fetchWalletDepositBalances(walletAddress).then((nextBalances) => {
        setBalances({
          stable: nextBalances.stableBalanceUi,
          skr: nextBalances.skrBalanceUi,
        });
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create the lock transaction.';
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <View className="flex-1 px-6 py-8">
        <Text className="text-2xl font-bold text-white">Lock Your Funds</Text>
        <Text className="mt-2 text-neutral-400">
          {course?.title ?? 'Selected Course'}
        </Text>
        <Text className="mt-1 text-sm text-neutral-500">
          Create the on-chain lock that starts the gauntlet.
        </Text>

        <View className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <Text className="text-xs uppercase tracking-[2px] text-neutral-500">
            Stablecoin
          </Text>
          <View className="mt-3 rounded-xl border border-emerald-500 bg-emerald-500/10 px-4 py-3">
            <Text className="text-center font-semibold text-emerald-300">
              USDC only
            </Text>
          </View>

          <Text className="mt-5 text-xs uppercase tracking-[2px] text-neutral-500">
            Principal Amount
          </Text>
          <TextInput
            className="mt-3 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-4 text-lg text-white"
            keyboardType="decimal-pad"
            value={principalAmount}
            onChangeText={setPrincipalAmount}
            placeholder="100"
            placeholderTextColor="#737373"
          />

          <Text className="mt-5 text-xs uppercase tracking-[2px] text-neutral-500">
            Optional SKR Amount
          </Text>
          <TextInput
            className="mt-3 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-4 text-lg text-white"
            keyboardType="decimal-pad"
            value={skrAmount}
            onChangeText={setSkrAmount}
            placeholder="0"
            placeholderTextColor="#737373"
          />

          <Text className="mt-5 text-xs uppercase tracking-[2px] text-neutral-500">
            Lock Duration
          </Text>
          <View className="mt-3 flex-row gap-3">
            {LOCK_DURATIONS.map((duration) => {
              const selected = lockDuration === duration;
              return (
                <Pressable
                  key={duration}
                  className={`flex-1 rounded-xl border px-3 py-3 ${selected ? 'border-sky-500 bg-sky-500/10' : 'border-neutral-700 bg-neutral-950'}`}
                  onPress={() => setLockDuration(duration)}
                >
                  <Text
                    className={`text-center font-semibold ${selected ? 'text-sky-300' : 'text-white'}`}
                  >
                    {duration}d
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mt-6 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-4">
            <Text className="text-xs uppercase tracking-[2px] text-neutral-500">
              Wallet Balances
            </Text>
            <Text className="mt-3 text-sm text-neutral-300">
              USDC: {balances.stable}
            </Text>
            <Text className="mt-1 text-sm text-neutral-300">SKR: {balances.skr}</Text>
            {isRefreshingBalances ? (
              <View className="mt-3 flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#a3a3a3" />
                <Text className="text-xs text-neutral-500">Refreshing balances...</Text>
              </View>
            ) : null}
          </View>
        </View>

        {configMessage ? (
          <View className="mt-5 rounded-xl border border-amber-700 bg-amber-950/40 p-4">
            <Text className="text-sm text-amber-200">{configMessage}</Text>
          </View>
        ) : null}

        {statusMessage ? (
          <View className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-4">
            <Text className="text-sm text-neutral-300">{statusMessage}</Text>
          </View>
        ) : null}

        <Pressable
          className={`mt-6 rounded-xl px-6 py-4 ${isSubmitting || Boolean(configMessage) ? 'bg-neutral-700' : 'bg-emerald-600 active:bg-emerald-700'}`}
          disabled={isSubmitting || Boolean(configMessage)}
          onPress={() => {
            void handleDeposit();
          }}
        >
          <Text className="text-center text-lg font-semibold text-white">
            {isSubmitting ? 'Creating Lock...' : 'Deposit & Start Gauntlet'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
