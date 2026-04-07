'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore, useCourseStore } from '@/stores';
import { getUserXp } from '@/services/api/progress/progressApi';
import { fetchWithAuth } from '@/services/api/httpClient';
import {
  T,
  ScreenBackground,
  BackButton,
  ParchmentCard,
  SectionLabel,
  ProgressBar,
} from '@/components/theme';

const LEVEL_NAMES = ['Novice', 'Apprentice', 'Scholar', 'Adept', 'Master', 'Sage', 'Legend'];

export default function ProfilePage() {
  const router = useRouter();

  // User state
  const walletAddress = useUserStore((s) => s.walletAddress);
  const displayName = useUserStore((s) => s.displayName);
  const disconnect = useUserStore((s) => s.disconnect);

  // Course state
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const activeCourseIds = useCourseStore((s) => s.activeCourseIds);
  const courseStates = useCourseStore((s) => s.courseStates);
  const courses = useCourseStore((s) => s.courses);
  const setActiveCourse = useCourseStore((s) => s.setActiveCourse);
  const lessonProgress = useCourseStore((s) => s.lessonProgress);
  const enrolledCourseIds = useCourseStore((s) => s.enrolledCourseIds);
  const lessons = useCourseStore((s) => s.lessons);

  const activeState = activeCourseId ? courseStates[activeCourseId] : null;
  const activeCourse = activeCourseId
    ? courses.find((c) => c.id === activeCourseId)
    : null;

  // XP state
  const [xp, setXp] = useState({ xpTotal: 0, xpLevel: 1 });

  useEffect(() => {
    fetchWithAuth(getUserXp).then((data) => {
      if (data) setXp({ xpTotal: data.xpTotal, xpLevel: data.xpLevel });
    });
  }, []);

  // Derived stats
  const lessonsCompleted = Object.values(lessonProgress).filter((lp) => lp.completed).length;
  const longestStreak = activeState?.longestStreak ?? 0;
  const coursesEnrolled = enrolledCourseIds.length;

  // Active course lesson progress
  const activeLessons = activeCourseId ? (lessons[activeCourseId] ?? []) : [];
  const activeLessonsCompleted = activeLessons.filter(
    (l) => lessonProgress[l.id]?.completed,
  ).length;
  const activeLessonsTotal = activeLessons.length;
  const progressFraction = activeLessonsTotal > 0 ? activeLessonsCompleted / activeLessonsTotal : 0;

  // Courses with active locks
  const lockedCourseIds = activeCourseIds.filter((id) =>
    Boolean(courseStates[id]?.lockAccountAddress),
  );

  // Truncated wallet
  const truncatedWallet = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : 'Not connected';

  const levelName = LEVEL_NAMES[Math.min(xp.xpLevel - 1, LEVEL_NAMES.length - 1)] ?? 'Novice';

  const handleDisconnect = () => {
    if (confirm('Disconnect wallet? This clears your local session.')) {
      disconnect();
      router.push('/');
    }
  };

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      {/* Page title */}
      <h1
        className="text-2xl font-bold tracking-wide mb-5"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Profile
      </h1>

      {/* Two-column grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* ── Left column: Identity Card ── */}
        <div
          style={{
            borderRadius: 14,
            border: '2px solid rgba(212,160,74,0.2)',
            background: 'linear-gradient(160deg, rgba(14,14,28,0.95), rgba(6,6,12,0.98))',
            boxShadow: '0 0 40px rgba(212,160,74,0.05)',
            overflow: 'hidden',
          }}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{
              borderBottom: '1px solid rgba(212,160,74,0.12)',
              background: 'rgba(212,160,74,0.04)',
            }}
          >
            <span
              className="font-mono text-[11px] font-bold uppercase tracking-[2px]"
              style={{ color: T.amber }}
            >
              Adventurer Profile
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-full"
              style={{
                color: T.green,
                backgroundColor: 'rgba(62,230,138,0.1)',
                border: '1px solid rgba(62,230,138,0.2)',
              }}
            >
              Active
            </span>
          </div>

          {/* Avatar + Identity */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-4">
              {/* Avatar placeholder */}
              <div
                className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(212,160,74,0.08)',
                  border: '1px solid rgba(212,160,74,0.15)',
                }}
              >
                <span className="text-3xl" style={{ color: T.amber, opacity: 0.4 }}>
                  {'\u2726'}
                </span>
              </div>
              <div className="min-w-0">
                <p
                  className="text-lg font-bold truncate"
                  style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
                >
                  {displayName || 'Adventurer'}
                </p>
                <p
                  className="font-mono text-[11px] mt-0.5"
                  style={{ color: T.textSecondary }}
                >
                  {truncatedWallet}
                </p>
                {/* Level + XP pills */}
                <div className="flex items-center gap-2 mt-2.5">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-full"
                    style={{
                      color: T.amber,
                      backgroundColor: 'rgba(212,160,74,0.1)',
                      border: '1px solid rgba(212,160,74,0.18)',
                    }}
                  >
                    Lv.{xp.xpLevel} {levelName}
                  </span>
                  <span
                    className="text-[10px] font-bold tracking-[0.5px] px-2.5 py-1 rounded-full"
                    style={{
                      color: T.teal,
                      backgroundColor: 'rgba(42,232,212,0.08)',
                      border: '1px solid rgba(42,232,212,0.15)',
                    }}
                  >
                    {xp.xpTotal} XP
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Journey section */}
          <div className="px-5 pb-5">
            {/* Decorated divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(212,160,74,0.12)' }} />
              <span
                className="text-[10px] font-mono tracking-[1.5px]"
                style={{ color: T.textMuted }}
              >
                ~ Journey ~
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(212,160,74,0.12)' }} />
            </div>

            <div className="space-y-2.5">
              <JourneyRow label="Lessons Completed" value={lessonsCompleted} />
              <JourneyRow label="Longest Streak" value={`${longestStreak} days`} />
              <JourneyRow label="Courses Enrolled" value={coursesEnrolled} />
              <JourneyRow label="Member Since" value="Mar 2026" />
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-5">
          {/* Active Course */}
          {activeCourse && (
            <div>
              <SectionLabel>Active Course</SectionLabel>
              <ParchmentCard>
                <p
                  className="text-sm font-bold mb-1"
                  style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
                >
                  {activeCourse.title}
                </p>
                <p className="text-[12px] mb-3" style={{ color: T.textSecondary }}>
                  {activeLessonsCompleted} / {activeLessonsTotal} lessons
                </p>
                <ProgressBar progress={progressFraction} />
              </ParchmentCard>
            </div>
          )}

          {/* Course switcher (only when multiple locked courses) */}
          {lockedCourseIds.length > 1 && (
            <div>
              <SectionLabel>Switch Course</SectionLabel>
              {lockedCourseIds.map((courseId) => {
                const course = courses.find((c) => c.id === courseId);
                if (!course) return null;
                const isActive = courseId === activeCourseId;
                return (
                  <button
                    key={courseId}
                    onClick={() => {
                      setActiveCourse(courseId);
                      router.back();
                    }}
                    className="w-full text-left mb-2"
                  >
                    <ParchmentCard
                      style={{
                        padding: 14,
                        borderColor: isActive ? `${T.amber}50` : T.borderDormant,
                      }}
                    >
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isActive ? T.amber : T.textPrimary }}
                      >
                        {course.title}
                        {isActive ? ' (active)' : ''}
                      </span>
                    </ParchmentCard>
                  </button>
                );
              })}
            </div>
          )}

          {/* Account actions */}
          <div>
            <SectionLabel>Account</SectionLabel>
            <div className="space-y-2.5">
              {/* Browse Courses */}
              <button
                onClick={() => router.push('/courses')}
                className="flex items-center gap-3.5 py-3.5 px-4 rounded-xl border w-full text-left transition-all"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderColor: T.borderDormant,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212,160,74,0.18)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.borderDormant;
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(212,160,74,0.08)' }}
                >
                  <span className="text-base" style={{ color: T.amber }}>
                    {'\u2637'}
                  </span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold block" style={{ color: T.textPrimary }}>
                    Browse Courses
                  </span>
                  <span className="text-[11px]" style={{ color: T.textSecondary }}>
                    Explore available learning paths
                  </span>
                </div>
                <span className="text-lg" style={{ color: T.textMuted }}>
                  {'\u203A'}
                </span>
              </button>

              {/* Disconnect Wallet */}
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-3.5 py-3.5 px-4 rounded-xl border w-full text-left transition-all"
                style={{
                  backgroundColor: 'rgba(255,68,102,0.03)',
                  borderColor: 'rgba(255,68,102,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,68,102,0.25)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,68,102,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,68,102,0.1)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,68,102,0.03)';
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,68,102,0.08)' }}
                >
                  <span className="text-base" style={{ color: T.crimson }}>
                    {'\u2715'}
                  </span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold block" style={{ color: T.crimson }}>
                    Disconnect Wallet
                  </span>
                  <span className="text-[11px]" style={{ color: T.textSecondary }}>
                    Clear local session data
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ScreenBackground>
  );
}

/** Small helper for the journey stat rows */
function JourneyRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px]" style={{ color: T.textSecondary }}>
        {label}
      </span>
      <span
        className="text-[13px] font-semibold font-mono"
        style={{ color: T.textPrimary }}
      >
        {value}
      </span>
    </div>
  );
}
