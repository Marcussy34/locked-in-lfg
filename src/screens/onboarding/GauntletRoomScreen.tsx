import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useUserStore } from '@/stores';
import { ScreenBackground, ParchmentCard, CornerMarks, T, ts } from '@/theme';

export function GauntletRoomScreen() {
  const completeGauntlet = useUserStore((s) => s.completeGauntlet);

  return (
    <ScreenBackground>
      <View style={s.centered}>
        <ParchmentCard style={s.card} opacity={0.35}>
          <CornerMarks />
          <Text style={s.title}>Week 1 Gauntlet</Text>
          <Text style={s.description}>
            No savers. No yield. Maximum stakes. Complete 7 days to unlock the
            dungeon.
          </Text>

          <Pressable
            style={({ pressed }) => [ts.primaryBtn, s.skipBtn, pressed && { opacity: 0.8 }]}
            onPress={completeGauntlet}
          >
            <Text style={ts.primaryBtnText}>Skip Gauntlet (Dev)</Text>
          </Pressable>
        </ParchmentCard>
      </View>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    alignItems: 'center',
    padding: 28,
  },
  title: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '700',
    color: T.amber,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    color: T.textSecondary,
    lineHeight: 22,
  },
  skipBtn: {
    marginTop: 28,
    width: '100%',
  },
});
