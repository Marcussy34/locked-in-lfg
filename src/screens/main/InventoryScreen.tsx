import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTokenStore } from '@/stores';
import { useCourseStore } from '@/stores/courseStore';

export function InventoryScreen() {
  const navigation = useNavigation();

  const fullTokens = useTokenStore((s) => s.fullTokens);
  const fragments = useTokenStore((s) => s.fragments);

  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);

  const activeState = activeCourseId ? courseStates[activeCourseId] : null;
  const dungeonIchor = activeState?.ichorBalance ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <View className="flex-1 px-6 pt-4">
        <Pressable onPress={() => navigation.goBack()}>
          <Text className="text-neutral-400">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="mt-4 text-2xl font-bold text-white">Inventory</Text>
        <Text className="mt-1 text-sm text-neutral-500">
          Your dungeon resources
        </Text>

        {/* Dungeon Ichor */}
        <View className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs uppercase tracking-wide text-neutral-500">
                Dungeon Ichor
              </Text>
              <Text className="mt-1 text-3xl font-bold text-amber-400">
                {Math.floor(dungeonIchor).toLocaleString()}
              </Text>
            </View>
            <Text className="text-3xl">{'\u2697'}</Text>
          </View>
          <Text className="mt-2 text-xs text-neutral-600">
            Locked until course complete + lock period ends
          </Text>
        </View>

        {/* M Tokens */}
        <View className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs uppercase tracking-wide text-neutral-500">
                M Tokens
              </Text>
              <Text className="mt-1 text-3xl font-bold text-emerald-400">
                {fullTokens}
              </Text>
              {fragments > 0 && (
                <Text className="mt-0.5 text-xs text-neutral-600">
                  +{fragments.toFixed(2)} fragments
                </Text>
              )}
            </View>
            <Text className="text-3xl">{'\u2B50'}</Text>
          </View>
          <Text className="mt-2 text-xs text-neutral-600">
            Earned from lessons, used to brew Ichor
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
