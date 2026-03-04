import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useCourseStore } from '@/stores/courseStore';

export function IchorShopScreen() {
  const navigation = useNavigation();

  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);

  const activeState = activeCourseId ? courseStates[activeCourseId] : null;
  const ichor = activeState?.ichorBalance ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <View className="flex-1 px-6 pt-4">
        <Pressable onPress={() => navigation.goBack()}>
          <Text className="text-neutral-400">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="mt-4 text-2xl font-bold text-white">Ichor Shop</Text>
        <Text className="mt-1 text-sm text-neutral-500">
          Exchange Ichor for USDC
        </Text>

        {/* Balance */}
        <View className="mt-6 items-center rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <Text className="text-xs uppercase tracking-wide text-neutral-500">
            Available Ichor
          </Text>
          <Text className="mt-2 text-4xl font-bold text-amber-400">
            {Math.floor(ichor).toLocaleString()}
          </Text>
        </View>

        {/* Placeholder exchange */}
        <View className="mt-6 rounded-xl border border-neutral-700 bg-neutral-900 p-5">
          <Text className="text-sm font-semibold text-neutral-400">
            Exchange Rate
          </Text>
          <Text className="mt-2 text-lg text-white">
            1,000 Ichor = $1.00 USDC
          </Text>
          <Text className="mt-1 text-xs text-neutral-600">
            Placeholder rate for dev mode
          </Text>
        </View>

        <Pressable
          className="mt-6 rounded-xl bg-purple-700 py-4 active:opacity-80"
          onPress={() => console.log('[Dev] Shop exchange tapped')}
        >
          <Text className="text-center text-base font-bold text-white">
            EXCHANGE ICHOR
          </Text>
          <Text className="mt-1 text-center text-xs text-purple-300">
            Coming soon
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
