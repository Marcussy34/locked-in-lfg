import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/navigation/types';
import { useCourseStore } from '@/stores';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'CourseSelection'>;

export function CourseSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const courses = useCourseStore((s) => s.courses);
  const availableCourses = courses.slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-2xl font-bold text-white">Choose Your Path</Text>
        <Text className="mt-2 text-center text-neutral-400">
          Select a course to begin the gauntlet
        </Text>

        {availableCourses.map((course, index) => (
          <Pressable
            key={course.id}
            className={`w-full rounded-xl border border-neutral-700 bg-neutral-900 p-4 active:bg-neutral-800 ${index === 0 ? 'mt-8' : 'mt-4'}`}
            onPress={() => navigation.navigate('Deposit', { courseId: course.id })}
          >
            <Text className="text-lg font-semibold text-white">
              {course.title}
            </Text>
            <Text className="mt-1 text-sm text-neutral-400">
              {course.description}
            </Text>
          </Pressable>
        ))}

        {availableCourses.length === 0 ? (
          <Text className="mt-8 text-center text-sm text-neutral-500">
            Course catalog is still loading.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
