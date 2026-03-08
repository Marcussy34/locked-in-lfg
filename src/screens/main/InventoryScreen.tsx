import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { useCourseStore } from '@/stores/courseStore';
import { useUserStore } from '@/stores';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  T,
  ts,
} from '@/theme';

function formatFuelEarnStatus(status: string): string {
  switch (status) {
    case 'PAUSED_RECOVERY':
      return 'Paused during saver recovery';
    case 'AT_CAP':
      return 'Fuel cap reached';
    case 'EARNED_TODAY':
      return 'Daily Fuel already earned';
    default:
      return 'Fuel available';
  }
}

function formatBurnTime(timestamp: string | null): string {
  if (!timestamp) {
    return 'No burn scheduled';
  }

  return new Date(timestamp).toLocaleString();
}

export function InventoryScreen() {
  const navigation = useNavigation();

  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const refreshCourseRuntime = useCourseStore((s) => s.refreshCourseRuntime);
  const authToken = useUserStore((s) => s.authToken);

  const activeState = activeCourseId ? courseStates[activeCourseId] : null;
  const dungeonIchor = activeState?.ichorBalance ?? 0;
  const fuelBalance = activeState?.fuelCounter ?? 0;
  const fuelCap = activeState?.fuelCap ?? 7;
  const gauntletActive = activeState?.gauntletActive ?? true;
  const fuelEarnStatus = useCourseStore((s) => s.getFuelEarnStatus());
  const nextFuelBurnAt = useCourseStore((s) => s.getNextFuelBurnAt());
  const brewerStatus = gauntletActive
    ? 'Locked until gauntlet complete'
    : fuelBalance <= 0
      ? 'Stopped (Fuel is zero)'
      : 'Fuel available';

  useFocusEffect(
    useCallback(() => {
      if (activeCourseId && authToken) {
        void refreshCourseRuntime(activeCourseId, authToken).catch(() => {
          // Keep last synced runtime visible if refresh fails.
        });
      }
    }, [activeCourseId, authToken, refreshCourseRuntime]),
  );

  return (
    <ScreenBackground>
      <View style={s.container}>
        <BackButton onPress={() => navigation.goBack()} />

        <Text style={[ts.pageTitle, s.title]}>Inventory</Text>
        <Text style={ts.pageSub}>Your dungeon resources</Text>

        {/* Fuel */}
        <ParchmentCard style={[s.fuelCard, { borderColor: T.rust + '25' }]}>
          <View style={s.cardRow}>
            <View>
              <Text style={ts.cardLabel}>Fuel</Text>
              <Text style={[ts.cardValue, s.bigValue, { color: T.rust }]}>
                {fuelBalance}
                <Text style={s.capText}>/{fuelCap}</Text>
              </Text>
            </View>
            <Text style={s.emoji}>{'\u26FD'}</Text>
          </View>
          <Text style={s.detailText}>
            {formatFuelEarnStatus(fuelEarnStatus)}
          </Text>
          <Text style={s.mutedText}>
            Next burn: {formatBurnTime(nextFuelBurnAt)}
          </Text>
          <Text style={s.mutedText}>
            Brewer: {brewerStatus}
          </Text>
        </ParchmentCard>

        {/* Dungeon Ichor */}
        <ParchmentCard style={[s.ichorCard, { borderColor: T.amber + '25' }]}>
          <View style={s.cardRow}>
            <View>
              <Text style={ts.cardLabel}>Dungeon Ichor</Text>
              <Text style={[ts.cardValue, s.bigValue, { color: T.amber }]}>
                {Math.floor(dungeonIchor).toLocaleString()}
              </Text>
            </View>
            <Text style={s.emoji}>{'\u2697'}</Text>
          </View>
          <Text style={s.mutedText}>
            Locked until course complete + lock period ends
          </Text>
        </ParchmentCard>
      </View>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  title: {
    marginTop: 8,
  },
  fuelCard: {
    marginTop: 16,
    padding: 20,
  },
  ichorCard: {
    marginTop: 12,
    padding: 20,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bigValue: {
    fontSize: 30,
    fontWeight: '700',
    marginTop: 4,
  },
  capText: {
    fontSize: 14,
    fontWeight: '400',
    color: T.textSecondary,
  },
  emoji: {
    fontSize: 30,
  },
  detailText: {
    fontSize: 11,
    color: T.textSecondary,
    marginTop: 8,
  },
  mutedText: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 4,
  },
});
