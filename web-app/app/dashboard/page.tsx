'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore, useUserStore } from '@/stores';
import { getUserXp } from '@/services/api/progress/progressApi';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  StatBox,
  SectionLabel,
  T,
} from '@/components/theme';

const LEVEL_NAMES = ['Novice', 'Apprentice', 'Scholar', 'Adept', 'Master', 'Sage', 'Legend'];
const XP_THRESHOLDS = [0, 500, 1500, 3500, 7000, 12000, 20000];

export default function DashboardPage() {
  const router = useRouter();
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const courses = useCourseStore((s) => s.courses);
  const lessons = useCourseStore((s) => s.lessons);
  const lessonProgress = useCourseStore((s) => s.lessonProgress);
  const enrolledCourseIds = useCourseStore((s) => s.enrolledCourseIds);
  const authToken = useUserStore((s) => s.authToken);

  const [xp, setXp] = useState({ xpTotal: 0, xpLevel: 1 });

  useEffect(() => {
    if (authToken) {
      getUserXp(authToken).then((data) => setXp({ xpTotal: data.xpTotal, xpLevel: data.xpLevel })).catch(() => {});
    }
  }, [authToken]);

  const activeState = activeCourseId ? courseStates[activeCourseId] ?? null : null;
  const activeCourse = activeCourseId ? courses.find((c) => c.id === activeCourseId) : null;

  const streak = activeState?.currentStreak ?? 0;
  const longestStreak = activeState?.longestStreak ?? 0;
  const fuelBalance = activeState?.fuelCounter ?? 0;
  const fuelCap = activeState?.fuelCap ?? 7;
  const fuelFragments = activeState?.fuelFragmentsToday ?? 0;
  const ichorBalance = activeState?.ichorBalance ?? 0;
  const saverCount = activeState?.saverCount ?? 0;
  const saversRemaining = Math.max(0, 3 - saverCount);

  // Total lessons completed across all courses
  const totalCompleted = Object.values(lessonProgress).filter((p) => p.completed).length;
  const totalLessons = Object.values(lessons).reduce((sum, arr) => sum + arr.length, 0);

  // Enrolled course count
  const enrolledCount = enrolledCourseIds.filter((id) => Boolean(courseStates[id]?.lockAccountAddress)).length;

  const levelName = LEVEL_NAMES[xp.xpLevel - 1] ?? `Level ${xp.xpLevel}`;
  const currentThreshold = XP_THRESHOLDS[xp.xpLevel - 1] ?? 0;
  const nextThreshold = XP_THRESHOLDS[xp.xpLevel] ?? currentThreshold + 1000;
  const xpProgress = (xp.xpTotal - currentThreshold) / (nextThreshold - currentThreshold);

  const flameLabel = streak >= 3 ? 'Burning' : streak >= 1 ? 'Lit' : 'Cold';
  const flameColor = streak >= 3 ? T.amber : streak >= 1 ? T.rust : T.textMuted;

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      {/* Hero — XP + Level */}
      <div className="text-center pt-2 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[2px] mb-1" style={{ color: T.textMuted }}>
          Your Progress
        </p>
        <p className="text-[28px] font-bold" style={{ color: T.amber, fontFamily: 'Georgia, serif' }}>
          Lv.{xp.xpLevel} {levelName}
        </p>
        <div className="max-w-xs mx-auto mt-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-mono" style={{ color: T.textSecondary }}>{xp.xpTotal} XP</span>
            <span className="text-[10px] font-mono" style={{ color: T.textMuted }}>{nextThreshold} XP</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, xpProgress * 100))}%`, backgroundColor: T.amber }}
            />
          </div>
        </div>
      </div>

      {/* Stats grid — 2-col on mobile, 6-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <StatBox label="Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} color={flameColor} />
        <StatBox label="Longest" value={`${longestStreak} day${longestStreak !== 1 ? 's' : ''}`} color={T.amber} />
        <StatBox label="Fuel" value={`${fuelBalance}/${fuelCap}`} color={T.rust} />
        <StatBox label="Ichor" value={Math.floor(ichorBalance)} color={T.green} />
        <StatBox label="Lessons" value={`${totalCompleted}/${totalLessons}`} color={T.violet} />
        <StatBox label="Courses" value={enrolledCount} color={T.teal} />
      </div>

      {/* Cards — single column on mobile, 2-col on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">

      {/* Flame status */}
      <ParchmentCard className="flex items-center gap-4 p-4">
        <span className="text-[32px]">
          {streak >= 3 ? '\u{1F525}' : streak >= 1 ? '\u{1FA94}' : '\u{1F9CA}'}
        </span>
        <div>
          <p className="text-[15px] font-bold" style={{ color: flameColor, fontFamily: 'Georgia, serif' }}>
            Flame: {flameLabel}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: T.textSecondary }}>
            {streak >= 3
              ? 'Yield is active. Keep the streak alive.'
              : streak >= 1
                ? 'Building momentum. 3-day streak activates yield.'
                : 'Complete a lesson today to light the flame.'}
          </p>
        </div>
      </ParchmentCard>

      {/* Fuel progress today */}
      <ParchmentCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: T.textSecondary }}>
            Today&apos;s Fuel
          </span>
          <span className="text-[11px] font-mono font-bold" style={{ color: fuelFragments >= 1 ? T.green : T.amber }}>
            {fuelFragments.toFixed(2)} / 1.00
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, fuelFragments * 100)}%`, backgroundColor: fuelFragments >= 1 ? T.green : T.amber }}
          />
        </div>
      </ParchmentCard>

      {/* Saver lamps */}
      <ParchmentCard className="p-4">
        <SectionLabel>Saver Lamps</SectionLabel>
        <div className="flex justify-center gap-7 mt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[24px]">{i < saversRemaining ? '\u{1F525}' : '\u{1F4A8}'}</span>
              <span
                className="font-mono text-[9px] mt-1 uppercase tracking-[1px]"
                style={{ color: i < saversRemaining ? T.green : T.textMuted }}
              >
                {i < saversRemaining ? 'Active' : 'Used'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center mt-2" style={{ color: T.textMuted }}>
          Miss a day? A saver protects your streak. {saversRemaining}/3 remaining.
        </p>
      </ParchmentCard>

      {/* Active course */}
      {activeCourse && (
        <ParchmentCard className="p-4">
          <SectionLabel>Active Course</SectionLabel>
          <p className="text-[15px] font-bold mt-1" style={{ color: T.textPrimary, fontFamily: 'Georgia, serif' }}>
            {activeCourse.title}
          </p>
          <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
            {activeCourse.completedLessons}/{(lessons[activeCourse.id] ?? []).length || activeCourse.totalLessons} lessons completed
          </p>
        </ParchmentCard>
      )}
      </div>
    </ScreenBackground>
  );
}
