'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore, useUserStore } from '@/stores';
import type { Course, CourseDifficulty } from '@/types';
import {
  T,
  ParchmentCard,
  CornerMarks,
} from '@/components/theme';

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

function DifficultyFlasks({ level }: { level: number }) {
  const fills = [T.green, T.teal, T.crimson];
  return (
    <div className="flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-3.5 rounded-[3px] relative"
          style={{
            backgroundColor: i < level ? fills[i] : 'rgba(255,255,255,0.06)',
            opacity: i < level ? 1 : 0.3,
            border: `0.5px solid ${i < level ? `${fills[i]}40` : 'rgba(255,255,255,0.04)'}`,
          }}
        >
          {i < level && (
            <div
              className="absolute bottom-0.5 left-px right-px h-1 rounded-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

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

function StatsRow({ course, accentColor }: { course: Course; accentColor: string }) {
  return (
    <div
      className="flex items-center gap-2 pt-3 border-t"
      style={{ borderTopColor: T.borderDormant }}
    >
      <span className="font-mono text-[10px]" style={{ color: T.textMuted }}>
        {course.totalModules ?? 1} mod
      </span>
      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.08)' }}>
        {'\u00B7'}
      </span>
      <span className="font-mono text-[10px]" style={{ color: T.textMuted }}>
        {course.totalLessons} lessons
      </span>
      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.08)' }}>
        {'\u00B7'}
      </span>
      <span className="font-mono text-[10px]" style={{ color: T.textMuted }}>
        {course.difficulty}
      </span>
      <div className="flex-1" />
      <span className="font-mono text-[9px]" style={{ color: `${accentColor}70` }}>
        {course.category}
      </span>
    </div>
  );
}

function CourseCard({
  course,
  selected,
  onSelect,
  isEnrolled,
  isComingSoon,
}: {
  course: Course;
  selected: boolean;
  onSelect: () => void;
  isEnrolled: boolean;
  isComingSoon: boolean;
}) {
  const difficultyLevel =
    course.difficulty === 'beginner' ? 1 : course.difficulty === 'intermediate' ? 2 : 3;
  const accentColor = DIFFICULTY_COLORS[course.difficulty];
  const catColor = CATEGORY_COLORS[course.category] ?? T.teal;

  return (
    <div
      onClick={isComingSoon ? undefined : onSelect}
      role={isComingSoon ? undefined : 'button'}
      tabIndex={isComingSoon ? undefined : 0}
      className={`w-full text-left relative ${isComingSoon ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
    >
      <ParchmentCard
        style={{
          backgroundColor: selected ? T.bgCardActive : T.bgCard,
          borderColor: isEnrolled
            ? `${T.green}35`
            : selected
              ? `${accentColor}35`
              : T.borderDormant,
        }}
      >
        {selected && <CornerMarks />}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Tag label={course.difficulty} color={accentColor} />
          <Tag label={course.category} color={catColor} />
          {isEnrolled && <Tag label="enrolled" color={T.green} />}
          <div className="flex-1" />
          <DifficultyFlasks level={difficultyLevel} />
        </div>

        <h3
          className="text-[17px] font-bold tracking-wide leading-snug mb-[5px]"
          style={{
            color: selected ? T.textPrimary : '#B8B0A4',
            fontFamily: 'Georgia, serif',
          }}
        >
          {course.title}
        </h3>

        <p className="text-xs leading-[18px] mb-3.5 line-clamp-2" style={{ color: T.textSecondary }}>
          {course.description}
        </p>

        {isComingSoon && (
          <div
            className="mb-3.5 py-3 rounded-[10px] border text-center"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: T.borderDormant,
            }}
          >
            <span
              className="text-[12px] font-bold uppercase tracking-[2px]"
              style={{ color: T.textMuted, fontFamily: 'Georgia, serif' }}
            >
              Coming Soon
            </span>
          </div>
        )}

        <StatsRow course={course} accentColor={accentColor} />
      </ParchmentCard>
    </div>
  );
}

export default function OnboardingCoursesPage() {
  const router = useRouter();

  const courses = useCourseStore((s) => s.courses);
  const lessons = useCourseStore((s) => s.lessons);
  const contentLoading = useCourseStore((s) => s.contentLoading);
  const contentError = useCourseStore((s) => s.contentError);
  const contentInitialized = useCourseStore((s) => s.contentInitialized);
  const initializeContent = useCourseStore((s) => s.initializeContent);
  const syncOnChainEnrollments = useCourseStore((s) => s.syncOnChainEnrollments);
  const enrolledCourseIds = useCourseStore((s) => s.enrolledCourseIds);
  const courseStates = useCourseStore((s) => s.courseStates);
  const walletAddress = useUserStore((s) => s.walletAddress);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!contentInitialized && !contentLoading) {
      void initializeContent();
    }
  }, [contentInitialized, contentLoading, initializeContent]);

  // Detect on-chain locks
  useEffect(() => {
    if (walletAddress && courses.length > 0) {
      void syncOnChainEnrollments(walletAddress);
    }
  }, [walletAddress, courses.length, syncOnChainEnrollments]);

  const enrolledIds = new Set(
    enrolledCourseIds.filter((id) => Boolean(courseStates[id]?.lockAccountAddress)),
  );

  const selectedCourse = selectedId ? courses.find((c) => c.id === selectedId) : null;
  const selectedIsEnrolled = selectedId ? enrolledIds.has(selectedId) : false;

  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundColor: T.bg,
        backgroundImage: "url('/images/wood.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(6,6,12,0.4)' }} />
      <div className="relative max-w-2xl mx-auto px-[18px] pb-32">
        <div className="text-center pt-5 pb-7">
          <div className="flex items-center justify-center gap-2 mb-3.5">
            <div className="w-[30px] h-px" style={{ backgroundColor: `${T.amber}30` }} />
            <span className="text-[7px]" style={{ color: `${T.amber}50` }}>{'\u25C6'}</span>
            <div className="w-[30px] h-px" style={{ backgroundColor: `${T.amber}30` }} />
          </div>
          <h1
            className="text-[26px] font-bold tracking-wide leading-tight mb-2"
            style={{ color: T.textPrimary, fontFamily: 'Georgia, serif' }}
          >
            Choose Your{'\n'}
            <span style={{ color: T.amber }}>Path</span>
          </h1>
          <p className="text-xs leading-[18px]" style={{ color: T.textSecondary }}>
            Mastering your craft through proof of effort.
          </p>
        </div>

        {contentLoading && courses.length === 0 && (
          <div
            className="p-4 rounded-lg border mb-4"
            style={{ borderColor: T.borderDormant, backgroundColor: 'rgba(14,14,28,0.6)' }}
          >
            <p className="text-xs text-center" style={{ color: T.textSecondary }}>
              Syncing course catalog...
            </p>
          </div>
        )}

        {contentError && (
          <div
            className="p-4 rounded-lg border mb-4"
            style={{ borderColor: 'rgba(255,68,102,0.15)', backgroundColor: 'rgba(14,14,28,0.6)' }}
          >
            <p className="text-xs text-center" style={{ color: 'rgba(255,68,102,0.6)' }}>
              {contentError}
            </p>
            <button
              onClick={() => void initializeContent(true)}
              className="mt-3 mx-auto block px-4 py-2 rounded-md border text-[11px] font-semibold uppercase tracking-wide"
              style={{ borderColor: `${T.amber}30`, backgroundColor: 'rgba(212,160,74,0.08)', color: T.amber }}
            >
              Retry
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {courses.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            const actualLessonCount = (lessons[course.id] ?? []).length;
            const isComingSoon = actualLessonCount === 0 && course.totalLessons === 0;
            return (
              <CourseCard
                key={course.id}
                course={course}
                selected={selectedId === course.id}
                isEnrolled={isEnrolled}
                isComingSoon={isComingSoon}
                onSelect={() => setSelectedId(selectedId === course.id ? null : course.id)}
              />
            );
          })}
        </div>

        {courses.length === 0 && !contentLoading && !contentError && (
          <div
            className="p-4 rounded-lg border"
            style={{ borderColor: T.borderDormant, backgroundColor: 'rgba(14,14,28,0.6)' }}
          >
            <p className="text-xs text-center" style={{ color: T.textSecondary }}>
              No courses available.
            </p>
          </div>
        )}
      </div>

      {/* Fixed CTA at bottom */}
      {selectedCourse && (
        <div
          className="fixed bottom-0 left-0 right-0 px-[18px] pb-8 pt-4"
          style={{ backgroundColor: `${T.bg}F5` }}
        >
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => {
                if (selectedIsEnrolled) {
                  useCourseStore.getState().setActiveCourse(selectedCourse.id);
                  router.push('/dungeon');
                } else {
                  router.push(`/onboarding/deposit?courseId=${selectedCourse.id}`);
                }
              }}
              className="w-full py-4 rounded-[10px] text-center"
              style={{
                backgroundColor: selectedIsEnrolled ? T.green : T.amber,
                border: `1px solid ${selectedIsEnrolled ? T.green : T.amber}50`,
                boxShadow: `0 0 16px ${selectedIsEnrolled ? 'rgba(62,230,138,0.2)' : 'rgba(212,160,74,0.2)'}`,
              }}
            >
              <span
                className="text-[13px] font-bold uppercase tracking-[3px]"
                style={{ color: T.bg, fontFamily: 'Georgia, serif' }}
              >
                {selectedIsEnrolled
                  ? '\u25C6  CONTINUE COURSE  \u25C6'
                  : '\u25C6  BEGIN DESCENT  \u25C6'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
