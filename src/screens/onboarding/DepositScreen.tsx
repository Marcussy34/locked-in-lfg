import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PublicKey } from '@solana/web3.js';
import type { MainStackParamList, OnboardingStackParamList } from '@/navigation/types';
import {
  connection,
  buildLockFundsTransaction,
  fetchLockAccountSnapshot,
  fetchWalletDepositBalances,
  hasLockVaultConfig,
  signTransaction,
  type LockDurationDays,
} from '@/services/solana';
import { SendTransactionError } from '@solana/web3.js';
import { useCourseStore, useUserStore } from '@/stores';
import { defaultCourseLockPolicyForDifficulty } from '@/types';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  T,
  ts,
} from '@/theme';

type SharedDepositParamList = OnboardingStackParamList & MainStackParamList;
type Nav = NativeStackNavigationProp<SharedDepositParamList, 'Deposit'>;
type DepositRoute = RouteProp<SharedDepositParamList, 'Deposit'>;

const LOCK_DURATIONS: LockDurationDays[] = [14, 30, 45, 60, 90, 180, 365];
const PRINCIPAL_PRESETS = [1, 5, 10, 25, 50, 100, 250, 500];
const MIN_RENT_SOL_BUFFER = 0.01;
const LAMPORTS_PER_SOL = 1_000_000_000;

function inferLockDurationDays(params: {
  lockStartDate: string;
  lockEndDate: string;
  extensionDays: number;
}): LockDurationDays {
  const startMs = new Date(params.lockStartDate).getTime();
  const endMs = new Date(params.lockEndDate).getTime();
  const totalDays = Math.max(
    14,
    Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) - params.extensionDays,
  );

  const exactMatch = LOCK_DURATIONS.find((duration) => duration === totalDays);
  if (exactMatch) {
    return exactMatch;
  }

  const closestLowerMatch = [...LOCK_DURATIONS]
    .reverse()
    .find((duration) => duration <= totalDays);

  return closestLowerMatch ?? 14;
}

export function DepositScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<DepositRoute>();
  const walletAddress = useUserStore((s) => s.walletAddress);
  const walletAuthToken = useUserStore((s) => s.walletAuthToken);
  const completeGauntlet = useUserStore((s) => s.completeGauntlet);
  const activateCourse = useCourseStore((s) => s.activateCourse);
  const deactivateCourse = useCourseStore((s) => s.deactivateCourse);
  const syncLockSnapshot = useCourseStore((s) => s.syncLockSnapshot);
  const courseStates = useCourseStore((s) => s.courseStates);
  const courses = useCourseStore((s) => s.courses);
  const course = useMemo(
    () => courses.find((entry) => entry.id === route.params.courseId) ?? null,
    [courses, route.params.courseId],
  );
  const courseLockPolicy = useMemo(
    () =>
      course?.lockPolicy ??
      defaultCourseLockPolicyForDifficulty(course?.difficulty ?? 'beginner'),
    [course],
  );
  const availableLockDurations = useMemo(
    () =>
      LOCK_DURATIONS.filter(
        (duration) =>
          duration >= courseLockPolicy.minLockDurationDays &&
          duration <= courseLockPolicy.maxLockDurationDays,
      ),
    [courseLockPolicy],
  );
  const policyConfigMessage = useMemo(() => {
    if (availableLockDurations.length > 0) {
      return null;
    }

    return 'This course policy does not overlap with the current on-chain lock presets yet.';
  }, [availableLockDurations]);
  const principalPresets = useMemo(() => {
    const maximumPrincipal = courseLockPolicy.maxPrincipalAmountUi
      ? Number(courseLockPolicy.maxPrincipalAmountUi)
      : null;
    const nextValues = new Set<number>(PRINCIPAL_PRESETS);
    nextValues.add(Number(courseLockPolicy.minPrincipalAmountUi));
    if (courseLockPolicy.demoPrincipalAmountUi) {
      nextValues.add(Number(courseLockPolicy.demoPrincipalAmountUi));
    }
    if (maximumPrincipal != null) {
      nextValues.add(maximumPrincipal);
    }

    return Array.from(nextValues)
      .filter((value) => Number.isFinite(value) && value > 0)
      .filter((value) => maximumPrincipal == null || value <= maximumPrincipal)
      .sort((a, b) => a - b);
  }, [
    courseLockPolicy.demoPrincipalAmountUi,
    courseLockPolicy.maxPrincipalAmountUi,
    courseLockPolicy.minPrincipalAmountUi,
  ]);

  const [lockDuration, setLockDuration] = useState<LockDurationDays>(30);
  const [principalAmount, setPrincipalAmount] = useState('1');
  const [skrAmount, setSkrAmount] = useState('0');
  const [balances, setBalances] = useState<{ stable: string; skr: string; sol: string }>({
    stable: '0',
    skr: '0',
    sol: '0',
  });
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [isRestoringExistingLock, setIsRestoringExistingLock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);

  const navigateToCourseEntry = () => {
    const routeNames = navigation.getState().routeNames;
    if (routeNames.includes('DungeonHome')) {
      navigation.navigate('DungeonHome');
    }
  };

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
    setLockDuration((current) => {
      if (availableLockDurations.includes(current)) {
        return current;
      }

      return availableLockDurations[0] ?? 30;
    });
  }, [availableLockDurations]);

  useEffect(() => {
    setPrincipalAmount((current) => {
      const nextMin = Number(courseLockPolicy.minPrincipalAmountUi);
      const nextMax = courseLockPolicy.maxPrincipalAmountUi
        ? Number(courseLockPolicy.maxPrincipalAmountUi)
        : null;
      const currentValue = Number(current);

      if (!current || !Number.isFinite(currentValue)) {
        return courseLockPolicy.minPrincipalAmountUi;
      }

      if (currentValue < nextMin) {
        return courseLockPolicy.minPrincipalAmountUi;
      }

      if (nextMax != null && currentValue > nextMax) {
        return courseLockPolicy.maxPrincipalAmountUi ?? current;
      }

      return current;
    });
  }, [
    courseLockPolicy.maxPrincipalAmountUi,
    courseLockPolicy.minPrincipalAmountUi,
  ]);

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
          sol: nextBalances.solBalanceUi,
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

  useEffect(() => {
    if (!walletAddress || !hasLockVaultConfig()) {
      return;
    }

    let cancelled = false;
    setIsRestoringExistingLock(true);
    setStatusMessage('Checking for an existing on-chain lock...');

    void fetchLockAccountSnapshot({
      ownerAddress: walletAddress,
      courseId: route.params.courseId,
    })
      .then((snapshot) => {
        if (cancelled) return;

        const inferredDuration = inferLockDurationDays({
          lockStartDate: snapshot.lockStartDate,
          lockEndDate: snapshot.lockEndDate,
          extensionDays: snapshot.extensionDays,
        });

        activateCourse(route.params.courseId, {
          amount: Number(snapshot.principalAmountUi),
          duration: inferredDuration,
          lockAccountAddress: snapshot.lockAccountAddress,
          skrAmount: Number(snapshot.skrLockedAmountUi),
        });
        syncLockSnapshot(route.params.courseId, snapshot);

        if (snapshot.gauntletComplete) {
          completeGauntlet();
          setStatusMessage('Existing lock found on-chain. Resuming your course...');
          navigateToCourseEntry();
          return;
        }
        completeGauntlet();
        setStatusMessage('Existing lock found on-chain. Entering the dungeon...');
        navigateToCourseEntry();
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : 'Unable to read the lock account.';

        if (message.includes('No LockVault account was found')) {
          if (courseStates[route.params.courseId]?.lockAccountAddress) {
            deactivateCourse(route.params.courseId);
          }
          setStatusMessage(null);
          return;
        }

        setStatusMessage(message);
      })
      .finally(() => {
        if (cancelled) return;
        setIsRestoringExistingLock(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    activateCourse,
    courseStates,
    completeGauntlet,
    deactivateCourse,
    navigation,
    route.params.courseId,
    syncLockSnapshot,
    walletAddress,
  ]);

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

    if (availableLockDurations.length === 0) {
      setStatusMessage(
        'This course policy is not compatible with the current on-chain lock presets yet.',
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const requestedStable = Number(principalAmount);
      if (!Number.isFinite(requestedStable) || requestedStable <= 0) {
        throw new Error('Enter a valid USDC amount before creating the lock.');
      }

      const minimumPrincipal = Number(courseLockPolicy.minPrincipalAmountUi);
      const demoPrincipalOverride = courseLockPolicy.demoPrincipalAmountUi
        ? Number(courseLockPolicy.demoPrincipalAmountUi)
        : null;
      const isDemoPrincipalOverride =
        demoPrincipalOverride != null && requestedStable === demoPrincipalOverride;
      if (requestedStable < minimumPrincipal && !isDemoPrincipalOverride) {
        throw new Error(
          `This course requires at least ${courseLockPolicy.minPrincipalAmountUi} USDC to start.`,
        );
      }

      const maximumPrincipal = courseLockPolicy.maxPrincipalAmountUi
        ? Number(courseLockPolicy.maxPrincipalAmountUi)
        : null;
      if (maximumPrincipal != null && requestedStable > maximumPrincipal) {
        throw new Error(
          `This course allows up to ${courseLockPolicy.maxPrincipalAmountUi} USDC for a single lock.`,
        );
      }

      if (!availableLockDurations.includes(lockDuration)) {
        throw new Error(
          `This course currently supports ${availableLockDurations.map((duration) => `${duration}d`).join(', ')} lock presets.`,
        );
      }

      const availableStable = Number(balances.stable);
      if (Number.isFinite(requestedStable) && requestedStable > availableStable) {
        throw new Error(
          `Wallet has ${balances.stable} USDC available, which is below the requested deposit of ${principalAmount} USDC.`,
        );
      }

      const requestedSkr = Number(skrAmount || '0');
      const availableSkr = Number(balances.skr);
      if (Number.isFinite(requestedSkr) && requestedSkr > availableSkr) {
        throw new Error(
          `Wallet has ${balances.skr} SKR available, which is below the requested lock amount of ${skrAmount} SKR.`,
        );
      }

      const walletLamports = await connection.getBalance(
        new PublicKey(walletAddress),
        'confirmed',
      );
      if (walletLamports < MIN_RENT_SOL_BUFFER * LAMPORTS_PER_SOL) {
        throw new Error(
          `Wallet needs at least ~${MIN_RENT_SOL_BUFFER.toFixed(2)} SOL to pay rent for the lock accounts.`,
        );
      }

      setStatusMessage('Building lock transaction...');

      const buildResult = await buildLockFundsTransaction({
        ownerAddress: walletAddress,
        courseId: route.params.courseId,
        stableAmountUi: principalAmount,
        skrAmountUi: skrAmount,
        lockDurationDays: lockDuration,
      });

      setStatusMessage('Simulating transaction...');
      try {
        await connection.simulateTransaction(buildResult.transaction);
      } catch (error) {
        if (error instanceof SendTransactionError) {
          const simulationLogs = error.logs?.slice(-6).join(' | ');
          throw new Error(
            simulationLogs
              ? `Deposit simulation failed: ${simulationLogs}`
              : 'Deposit simulation failed before wallet approval. Check the wallet balances and token accounts.',
          );
        }
        throw error;
      }

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
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(
          `Deposit transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`,
        );
      }

      const confirmedLockSnapshot = await fetchLockAccountSnapshot({
        ownerAddress: walletAddress,
        courseId: route.params.courseId,
      });
      const confirmedDuration = inferLockDurationDays({
        lockStartDate: confirmedLockSnapshot.lockStartDate,
        lockEndDate: confirmedLockSnapshot.lockEndDate,
        extensionDays: confirmedLockSnapshot.extensionDays,
      });

      activateCourse(route.params.courseId, {
        amount: Number(confirmedLockSnapshot.principalAmountUi),
        duration: confirmedDuration,
        lockAccountAddress: confirmedLockSnapshot.lockAccountAddress,
        stableMintAddress: buildResult.stableMintAddress,
        skrAmount: Number(confirmedLockSnapshot.skrLockedAmountUi),
      });
      syncLockSnapshot(route.params.courseId, confirmedLockSnapshot);
      completeGauntlet();
      navigateToCourseEntry();

      setStatusMessage(`Lock created: ${signature.slice(0, 8)}...`);

      void fetchWalletDepositBalances(walletAddress).then((nextBalances) => {
        setBalances({
          stable: nextBalances.stableBalanceUi,
          skr: nextBalances.skrBalanceUi,
          sol: nextBalances.solBalanceUi,
        });
      });
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : 'Unable to create the lock transaction.';
      const message = rawMessage.includes('Transaction simulation failed')
        ? `${rawMessage} Phantom showing "Unknown" is expected on devnet for this custom program.`
        : rawMessage;
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled =
    isSubmitting ||
    isRestoringExistingLock ||
    Boolean(configMessage) ||
    Boolean(policyConfigMessage);

  return (
    <ScreenBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={ts.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={ts.pageTitle}>Lock Your Funds</Text>
        <Text style={s.courseLabel}>{course?.title ?? 'Selected Course'}</Text>
        <Text style={ts.pageSub}>
          Create the on-chain lock that starts the gauntlet.
        </Text>

        {/* Course Lock Policy */}
        <ParchmentCard style={s.sectionCard}>
          <Text style={ts.sectionLabel}>Course Lock Policy</Text>

          <View style={s.policyBox}>
            <Text style={s.policyText}>
              Minimum deposit: {courseLockPolicy.minPrincipalAmountUi} USDC
            </Text>
            <Text style={s.policyText}>
              Maximum deposit:{' '}
              {courseLockPolicy.maxPrincipalAmountUi
                ? `${courseLockPolicy.maxPrincipalAmountUi} USDC`
                : 'No course max'}
            </Text>
            <Text style={s.policyText}>
              Demo preset:{' '}
              {courseLockPolicy.demoPrincipalAmountUi
                ? `${courseLockPolicy.demoPrincipalAmountUi} USDC`
                : 'None'}
            </Text>
            <Text style={s.policyText}>
              Policy duration: {courseLockPolicy.minLockDurationDays}-
              {courseLockPolicy.maxLockDurationDays} days
            </Text>
            <Text style={[s.policyText, { color: T.textMuted }]}>
              Current on-chain presets:{' '}
              {availableLockDurations.length > 0
                ? availableLockDurations.map((duration) => `${duration}d`).join(' / ')
                : 'None yet'}
            </Text>
          </View>

          {/* Stablecoin */}
          <Text style={ts.sectionLabel}>Stablecoin</Text>
          <View style={s.stablecoinBadge}>
            <Text style={s.stablecoinText}>USDC only</Text>
          </View>

          {/* Principal Amount */}
          <Text style={[ts.sectionLabel, { marginTop: 16 }]}>Principal Amount</Text>
          <TextInput
            style={s.textInput}
            keyboardType="decimal-pad"
            value={principalAmount}
            onChangeText={setPrincipalAmount}
            placeholder={courseLockPolicy.minPrincipalAmountUi}
            placeholderTextColor={T.textMuted}
          />
          <View style={s.pillRow}>
            {principalPresets.map((value) => {
              const selected = Number(principalAmount) === value;
              return (
                <Pressable
                  key={value}
                  style={[s.pill, selected ? s.pillSelected : {}]}
                  onPress={() => setPrincipalAmount(String(value))}
                >
                  <Text style={[s.pillText, selected ? s.pillTextSelected : {}]}>
                    {value} USDC
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={s.hintText}>
            {courseLockPolicy.demoPrincipalAmountUi
              ? `${courseLockPolicy.demoPrincipalAmountUi} USDC stays available as the demo preset for this course.`
              : 'Course minimums apply to all lock amounts.'}
          </Text>

          {/* Optional SKR */}
          <Text style={[ts.sectionLabel, { marginTop: 16 }]}>Optional SKR Amount</Text>
          <TextInput
            style={s.textInput}
            keyboardType="decimal-pad"
            value={skrAmount}
            onChangeText={setSkrAmount}
            placeholder="0"
            placeholderTextColor={T.textMuted}
          />

          {/* Lock Duration */}
          <Text style={[ts.sectionLabel, { marginTop: 16 }]}>Lock Duration</Text>
          <View style={s.durationRow}>
            {availableLockDurations.map((duration) => {
              const selected = lockDuration === duration;
              return (
                <Pressable
                  key={duration}
                  style={[s.durationPill, selected ? s.durationPillSelected : {}]}
                  onPress={() => setLockDuration(duration)}
                >
                  <Text style={[s.durationText, selected ? s.durationTextSelected : {}]}>
                    {duration}d
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Wallet Balances */}
          <View style={s.balancesBox}>
            <Text style={ts.sectionLabel}>Wallet Balances</Text>
            <Text style={s.balanceText}>USDC: {balances.stable}</Text>
            <Text style={s.balanceText}>SKR: {balances.skr}</Text>
            <Text style={s.balanceText}>SOL: {balances.sol}</Text>
            {isRefreshingBalances ? (
              <View style={s.refreshRow}>
                <ActivityIndicator size="small" color={T.textMuted} />
                <Text style={s.hintText}>Refreshing balances...</Text>
              </View>
            ) : null}
          </View>
        </ParchmentCard>

        {/* Config warnings */}
        {configMessage ? (
          <ParchmentCard style={s.warningCard}>
            <Text style={s.warningText}>{configMessage}</Text>
          </ParchmentCard>
        ) : null}

        {policyConfigMessage ? (
          <ParchmentCard style={s.warningCard}>
            <Text style={s.warningText}>{policyConfigMessage}</Text>
          </ParchmentCard>
        ) : null}

        {/* Status message */}
        {statusMessage ? (
          <ParchmentCard style={{ marginTop: 16 }}>
            <Text style={s.statusText}>{statusMessage}</Text>
          </ParchmentCard>
        ) : null}

        {/* Deposit button */}
        <View style={s.depositBtnWrap}>
          <Pressable
            style={[ts.primaryBtn, isDisabled ? s.depositBtnDisabled : {}]}
            disabled={isDisabled}
            onPress={() => {
              void handleDeposit();
            }}
          >
            <Text style={[ts.primaryBtnText, isDisabled ? { color: T.textSecondary } : {}]}>
              {isRestoringExistingLock
                ? 'Checking Existing Lock...'
                : isSubmitting
                  ? 'Creating Lock...'
                  : 'Deposit & Start Gauntlet'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  courseLabel: {
    fontSize: 14,
    color: T.textSecondary,
    marginTop: 4,
    marginBottom: 2,
  },
  sectionCard: {
    marginTop: 16,
  },
  policyBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.borderDormant,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  policyText: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 2,
  },
  stablecoinBadge: {
    backgroundColor: `${T.green}12`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${T.green}30`,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  stablecoinText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.green,
  },
  textInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.borderDormant,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    color: T.textPrimary,
    marginTop: 6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.borderDormant,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillSelected: {
    borderColor: T.amber,
    backgroundColor: `${T.amber}15`,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
  },
  pillTextSelected: {
    color: T.amber,
  },
  hintText: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 6,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  durationPill: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.borderDormant,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  durationPillSelected: {
    borderColor: T.teal,
    backgroundColor: `${T.teal}12`,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.textPrimary,
  },
  durationTextSelected: {
    color: T.teal,
  },
  balancesBox: {
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.borderDormant,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  balanceText: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 4,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  warningCard: {
    marginTop: 16,
    borderColor: `${T.amber}40`,
  },
  warningText: {
    fontSize: 13,
    color: T.amber,
  },
  statusText: {
    fontSize: 13,
    color: T.textSecondary,
  },
  depositBtnWrap: {
    marginTop: 20,
    marginBottom: 32,
  },
  depositBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: T.borderDormant,
  },
});
