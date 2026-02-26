import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '@/navigation/types';
import { useCourseStore } from '@/stores/courseStore';
import type { Course } from '@/types';

type Nav = NativeStackNavigationProp<MainStackParamList, 'CourseBrowser'>;

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-900 text-green-400',
  intermediate: 'bg-amber-900 text-amber-400',
  advanced: 'bg-red-900 text-red-400',
} as const;

const CATEGORY_COLORS = {
  solana: 'bg-purple-900 text-purple-400',
  web3: 'bg-blue-900 text-blue-400',
  defi: 'bg-emerald-900 text-emerald-400',
  security: 'bg-red-900 text-red-400',
} as const;

export function CourseBrowserScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Initialize mock data (synchronous, idempotent)
  useCourseStore.getState().initializeMockData();

  const courses = useCourseStore((s) => s.courses);
  const lessons = useCourseStore((s) => s.lessons);
  const lessonProgress = useCourseStore((s) => s.lessonProgress);

  const selectedCourse = selectedCourseId
    ? courses.find((c) => c.id === selectedCourseId) ?? null
    : null;
  const selectedLessons = selectedCourseId
    ? (lessons[selectedCourseId] ?? [])
    : [];

  if (selectedCourse) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-950">
        <ScrollView className="flex-1 px-6 pt-4">
          {/* Header */}
          <Pressable onPress={() => setSelectedCourseId(null)}>
            <Text className="text-neutral-400">{'\u2190'} Back to Courses</Text>
          </Pressable>

          <Text className="mt-4 text-2xl font-bold text-white">
            {selectedCourse.title}
          </Text>

          {/* Progress summary */}
          <View className="mt-3 rounded-xl border border-neutral-700 bg-neutral-900 p-4">
            <Text className="text-sm text-neutral-400">Progress</Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
              <View
                className="h-full rounded-full bg-amber-500"
                style={{
                  width: `${selectedCourse.totalLessons > 0 ? (selectedCourse.completedLessons / selectedCourse.totalLessons) * 100 : 0}%`,
                }}
              />
            </View>
            <Text className="mt-1 text-xs text-neutral-500">
              {selectedCourse.completedLessons}/{selectedCourse.totalLessons}{' '}
              lessons completed
            </Text>
          </View>

          {/* Lesson list */}
          <View className="mt-6 gap-3 pb-8">
            {selectedLessons
              .sort((a, b) => a.order - b.order)
              .map((lesson) => {
                const progress = lessonProgress[lesson.id];
                const isCompleted = progress?.completed;

                return (
                  <Pressable
                    key={lesson.id}
                    className="flex-row items-center rounded-xl border border-neutral-700 bg-neutral-900 p-4 active:bg-neutral-800"
                    onPress={() =>
                      navigation.navigate('Lesson', {
                        lessonId: lesson.id,
                        courseId: selectedCourse.id,
                      })
                    }
                  >
                    {/* Order number circle */}
                    <View
                      className={`h-10 w-10 items-center justify-center rounded-full ${
                        isCompleted
                          ? 'bg-green-900'
                          : 'bg-neutral-800'
                      }`}
                    >
                      {isCompleted ? (
                        <Text className="text-lg text-green-400">{'\u2713'}</Text>
                      ) : (
                        <Text className="text-lg font-bold text-neutral-400">
                          {lesson.order}
                        </Text>
                      )}
                    </View>

                    {/* Lesson info */}
                    <View className="ml-4 flex-1">
                      <Text className="text-base font-semibold text-white">
                        {lesson.title}
                      </Text>
                      {isCompleted && progress?.score != null && (
                        <Text className="mt-0.5 text-sm text-neutral-500">
                          Score: {progress.score}%
                        </Text>
                      )}
                    </View>

                    {/* Chevron */}
                    {!isCompleted && (
                      <Text className="text-neutral-600">{'\u203A'}</Text>
                    )}
                  </Pressable>
                );
              })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // State A: Course List
  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <ScrollView className="flex-1 px-6 pt-4">
        <Pressable onPress={() => navigation.goBack()}>
          <Text className="text-neutral-400">{'\u2190'} Back</Text>
        </Pressable>

        <Text className="mt-4 text-2xl font-bold text-white">Courses</Text>

        <View className="mt-6 gap-4 pb-8">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onPress={() => setSelectedCourseId(course.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseCard({
  course,
  onPress,
}: {
  course: Course;
  onPress: () => void;
}) {
  const progressPercent =
    course.totalLessons > 0
      ? (course.completedLessons / course.totalLessons) * 100
      : 0;

  const difficultyStyle = DIFFICULTY_COLORS[course.difficulty];
  const categoryStyle = CATEGORY_COLORS[course.category];

  return (
    <Pressable
      className="rounded-xl border border-neutral-700 bg-neutral-900 p-6 active:bg-neutral-800"
      onPress={onPress}
    >
      {/* Pills row */}
      <View className="flex-row gap-2">
        <View className={`rounded-full px-3 py-1 ${categoryStyle.split(' ')[0]}`}>
          <Text className={`text-xs font-medium ${categoryStyle.split(' ')[1]}`}>
            {course.category}
          </Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${difficultyStyle.split(' ')[0]}`}>
          <Text className={`text-xs font-medium ${difficultyStyle.split(' ')[1]}`}>
            {course.difficulty}
          </Text>
        </View>
      </View>

      {/* Title & description */}
      <Text className="mt-3 text-lg font-bold text-white">{course.title}</Text>
      <Text className="mt-1 text-sm text-neutral-400" numberOfLines={2}>
        {course.description}
      </Text>

      {/* Progress bar */}
      <View className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-800">
        <View
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${progressPercent}%` }}
        />
      </View>
      <Text className="mt-1 text-xs text-neutral-500">
        {course.completedLessons}/{course.totalLessons} lessons
      </Text>
    </Pressable>
  );
}
