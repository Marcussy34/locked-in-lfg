'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore } from '@/stores';
import type { Course, CourseDifficulty } from '@/types';
import {
  ScreenBackground,
  BackButton,
  PageHeader,
  ParchmentCard,
  SectionLabel,
  CornerMarks,
  ProgressBar,
  PrimaryButton,
  T,
} from '@/components/theme';

/* Difficulty color mapping */
const DIFFICULTY_COLORS: Record<CourseDifficulty, string> = {
  beginner: T.green,
  intermediate: T.teal,
  advanced: T.crimson,
};

const CATEGORY_COLORS: Record<string, string> = {
  solana: T.violet,
  web3: T.teal,
  defi: T.teal,
  security: T.crimson,
  rust: T.rust,
};

const DIFFICULTY_SIGILS: Record<CourseDifficulty, string> = {
  beginner: '\u2B21',
  intermediate: '\u25CE',
  advanced: '\u2B1F',
};

/* Tag badge */
function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="px-2 py-[3px] rounded text-[9px] font-bold uppercase tracking-[1px] font-mono"
      style={{
        color,
        backgroundColor: `${color}14`,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  );
}

/* Difficulty flask indicators */
function DifficultyFlasks({ level }: { level: number }) {
  const fills = [T.green, T.teal, T.crimson];
  return (
    <div className="flex gap-[3px] items-center">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="relative rounded-[3px]"
          style={{
            width: 8,
            height: 14,
            backgroundColor: i < level ? fills[i] : 'rgba(255,255,255,0.06)',
            opacity: i < level ? 1 : 0.3,
            border: `0.5px solid ${i < level ? `${fills[i]}40` : 'rgba(255,255,255,0.04)'}`,
          }}
        >
          {i < level && (
            <div
              className="absolute rounded-sm"
              style={{
                bottom: 2, left: 1, right: 1, height: 4,
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* Stats row under card */
function StatsRow({ course, accentColor }: { course: Course; accentColor: string }) {
  return (
    <div
      className="flex items-center gap-2 pt-3"
      style={{ borderTop: `1px solid ${T.borderDormant}` }}
    >
      <span className="font-mono text-[10px]" style={{ color: T.textMuted }}>
        {course.totalModules ?? 1} mod
      </span>
      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.08)' }}>&middot;</span>
      <span className="font-mono text-[10px]" style={{ color: T.textMuted }}>
        {course.totalLessons} lessons
      </span>
      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.08)' }}>&middot;</span>
      <span className="font-mono text-[10px]" style={{ color: T.textMuted }}>
        {course.difficulty}
      </span>
      <span className="flex-1" />
      <span className="font-mono text-[9px]" style={{ color: `${accentColor}70` }}>
        {course.category}
      </span>
    </div>
  );
}

/* Available course card */
function CourseCard({
  course,
  onPress,
  onEnroll,
}: {
  course: Course;
  onPress: () => void;
  onEnroll: () => void;
}) {
  const difficultyLevel =
    course.difficulty === 'beginner' ? 1 :
    course.difficulty === 'intermediate' ? 2 : 3;
  const accentColor = DIFFICULTY_COLORS[course.difficulty];
  const catColor = CATEGORY_COLORS[course.category] ?? T.teal;
  const sigil = DIFFICULTY_SIGILS[course.difficulty];

  const progressPercent =
    course.totalLessons > 0
      ? course.completedLessons / course.totalLessons
      : 0;

  return (
    <button onClick={onPress} className="w-full text-left transition-opacity hover:opacity-[0.85]">
      <ParchmentCard>
        {/* Top row: sigil + tags + difficulty */}
        <div className="flex items-center gap-2 mb-3">
          {/* Sigil */}
          <div className="w-9 h-9 flex items-center justify-center">
            <span
              className="text-xl"
              style={{ color: 'rgba(255,255,255,0.1)', fontFamily: 'serif' }}
            >
              {sigil}
            </span>
          </div>
          <div className="flex gap-[5px] flex-wrap flex-1">
            <Tag label={course.difficulty} color={accentColor} />
            <Tag label={course.category} color={catColor} />
          </div>
          <DifficultyFlasks level={difficultyLevel} />
        </div>

        {/* Title */}
        <h3
          className="text-[17px] font-bold tracking-wide leading-[22px] mb-[5px]"
          style={{ color: '#B8B0A4', fontFamily: 'Georgia, serif' }}
        >
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-xs leading-[18px] mb-3.5 line-clamp-2" style={{ color: T.textSecondary }}>
          {course.description}
        </p>

        {/* Progress bar */}
        <ProgressBar progress={progressPercent} />
        <p className="font-mono text-[10px] mt-1" style={{ color: T.textMuted }}>
          {course.completedLessons}/{course.totalLessons} lessons
        </p>

        {/* Enroll button */}
        <div
          className="mt-3.5 mb-3.5"
          onClick={(e) => e.stopPropagation()}
        >
          <PrimaryButton onClick={onEnroll}>
            ◆  LOCK & START  ◆
          </PrimaryButton>
        </div>

        {/* Stats row */}
        <StatsRow course={course} accentColor={accentColor} />
      </ParchmentCard>
    </button>
  );
}

/* Active course card with corner marks */
function ActiveCourseCard({
  course,
  streak,
  gauntletDay,
  onPress,
}: {
  course: Course;
  streak: number;
  gauntletDay: number;
  onPress: () => void;
}) {
  return (
    <button onClick={onPress} className="w-full text-left transition-opacity hover:opacity-[0.85]">
      <ParchmentCard style={{ borderColor: `${T.violet}35` }}>
        <CornerMarks />

        {/* Breathing border effect (CSS animation) */}
        <div
          className="absolute inset-[-1px] rounded-[10px] pointer-events-none animate-pulse"
          style={{
            border: `1px solid ${T.violet}25`,
            opacity: 0.5,
          }}
        />

        <div className="flex items-center">
          <div className="flex-1">
            <h3
              className="text-[17px] font-bold tracking-wide leading-[22px] mb-1.5"
              style={{ color: T.textPrimary, fontFamily: 'Georgia, serif' }}
            >
              {course.title}
            </h3>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px]" style={{ color: T.amber }}>
                ✹ {streak} streak
              </span>
              <span className="font-mono text-[11px]" style={{ color: T.violet }}>
                Day {gauntletDay}
              </span>
              <span className="font-mono text-[11px]" style={{ color: T.textMuted }}>
                {course.completedLessons}/{course.totalLessons} lessons
              </span>
            </div>
          </div>
          <span className="text-lg" style={{ color: T.textMuted }}>›</span>
        </div>
      </ParchmentCard>
    </button>
  );
}

/* ── Main page ── */
export default function CoursesPage() {
  const router = useRouter();

  const courses = useCourseStore((s) => s.courses);
  const contentLoading = useCourseStore((s) => s.contentLoading);
  const contentError = useCourseStore((s) => s.contentError);
  const initializeContent = useCourseStore((s) => s.initializeContent);
  const enrolledCourseIds = useCourseStore((s) => s.enrolledCourseIds);
  const courseStates = useCourseStore((s) => s.courseStates);
  const lessons = useCourseStore((s) => s.lessons);

  /* Load courses on mount */
  useEffect(() => {
    void initializeContent();
  }, [initializeContent]);

  /* Separate enrolled (locked) vs available */
  const activeCourseIds = enrolledCourseIds.filter((courseId) =>
    Boolean(courseStates[courseId]?.lockAccountAddress),
  );
  const activeCourses = courses.filter((c) => activeCourseIds.includes(c.id));
  const availableCourses = courses.filter((c) => !activeCourseIds.includes(c.id));

  /* Available course tap — go to deposit to lock in */
  const handleCoursePress = (course: Course) => {
    router.push(`/onboarding/deposit?courseId=${course.id}`);
  };

  const handleEnroll = (courseId: string) => {
    router.push(`/onboarding/deposit?courseId=${courseId}`);
  };

  const handleActiveCoursePress = (courseId: string) => {
    // Set as active course and navigate to dungeon hub
    useCourseStore.getState().setActiveCourse(courseId);
    router.push('/dungeon');
  };

  return (
    <ScreenBackground>
      <PageHeader
        title="Courses"
        subtitle="Mastering your craft through proof of effort."
      />

      {/* Loading state */}
      {contentLoading && courses.length === 0 && (
        <div
          className="p-4 rounded-lg border mb-4"
          style={{
            borderColor: T.borderDormant,
            backgroundColor: 'rgba(14,14,28,0.6)',
          }}
        >
          <p className="text-xs text-center" style={{ color: T.textSecondary }}>
            Syncing lesson modules...
          </p>
        </div>
      )}

      {/* Error state */}
      {contentError && (
        <div
          className="p-4 rounded-lg border mb-4"
          style={{
            borderColor: 'rgba(255,68,102,0.15)',
            backgroundColor: 'rgba(14,14,28,0.6)',
          }}
        >
          <p className="text-xs text-center" style={{ color: 'rgba(255,68,102,0.6)' }}>
            {contentError}
          </p>
          <button
            onClick={() => void initializeContent(true)}
            className="mt-3 mx-auto block px-4 py-2 rounded-md border text-[11px] font-semibold uppercase tracking-wide"
            style={{
              borderColor: `${T.amber}30`,
              backgroundColor: 'rgba(212,160,74,0.08)',
              color: T.amber,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Active courses */}
      {activeCourses.length > 0 && (
        <div className="mb-5">
          <SectionLabel>Active Courses</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {activeCourses.map((course) => {
              const state = courseStates[course.id];
              return (
                <ActiveCourseCard
                  key={course.id}
                  course={course}
                  streak={state?.currentStreak ?? 0}
                  gauntletDay={state?.gauntletDay ?? 1}
                  onPress={() => handleActiveCoursePress(course.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available courses label */}
      {activeCourses.length > 0 && availableCourses.length > 0 && (
        <SectionLabel>Available Courses</SectionLabel>
      )}

      {/* Course list */}
      <div className="flex flex-col gap-3">
        {(activeCourses.length > 0 ? availableCourses : courses).map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            onPress={() => handleCoursePress(course)}
            onEnroll={() => handleEnroll(course.id)}
          />
        ))}
      </div>

      {/* Empty state */}
      {!contentLoading && !contentError && courses.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: T.textMuted }}>
            No courses available yet.
          </p>
        </div>
      )}
    </ScreenBackground>
  );
}
