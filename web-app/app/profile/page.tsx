'use client';

import { useRouter } from 'next/navigation';
import { useUserStore, useCourseStore } from '@/stores';
import {
  T,
  ScreenBackground,
  BackButton,
  ParchmentCard,
  MenuRow,
  StatBox,
  SectionLabel,
  DangerButton,
  SecondaryButton,
  Divider,
} from '@/components/theme';

export default function ProfilePage() {
  const router = useRouter();

  // User state
  const walletAddress = useUserStore((s) => s.walletAddress);
  const disconnect = useUserStore((s) => s.disconnect);

  // Course state
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const activeCourseIds = useCourseStore((s) => s.activeCourseIds);
  const courseStates = useCourseStore((s) => s.courseStates);
  const courses = useCourseStore((s) => s.courses);
  const setActiveCourse = useCourseStore((s) => s.setActiveCourse);

  const activeState = activeCourseId ? courseStates[activeCourseId] : null;
  const activeCourse = activeCourseId
    ? courses.find((c) => c.id === activeCourseId)
    : null;

  // Stats from active course
  const streak = activeState?.currentStreak ?? 0;
  const ichor = activeState?.ichorBalance ?? 0;
  const fuel = activeState?.fuelCounter ?? 0;
  const fuelCap = activeState?.fuelCap ?? 7;
  const saverCount = activeState?.saverCount ?? 0;

  // Courses with active locks
  const lockedCourseIds = activeCourseIds.filter((id) =>
    Boolean(courseStates[id]?.lockAccountAddress),
  );

  // Menu items matching the RN screen
  const menuItems = [
    { label: 'Streak Status', href: '/streaks', icon: '\u2739', color: T.amber },
    { label: 'Leaderboard', href: '/leaderboard', icon: '\u2694', color: T.amber },
    { label: 'Ichor Shop', href: '/shop', icon: '\u2697', color: T.teal },
    { label: 'Community Pot', href: '/community-pot', icon: '\u26b2', color: T.amber },
    { label: 'Inventory', href: '/inventory', icon: '\u2692', color: T.rust },
    { label: 'Resurface Receipts', href: '/history', icon: '\u21ba', color: T.teal },
  ];

  const handleDisconnect = () => {
    if (confirm('Disconnect wallet? This clears your local session.')) {
      disconnect();
      router.push('/');
    }
  };

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      {/* Title */}
      <h1
        className="text-2xl font-bold tracking-wide mb-1"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Profile
      </h1>
      {activeCourse && (
        <p className="text-[13px] mt-1" style={{ color: T.textSecondary }}>
          {activeCourse.title}
        </p>
      )}

      {/* Stats row */}
      <div className="flex gap-2 mt-5">
        <StatBox label="Streak" value={streak} color={T.amber} />
        <StatBox label="Ichor" value={Math.floor(ichor)} color={T.teal} />
        <StatBox label="Fuel" value={`${fuel}/${fuelCap}`} color={T.rust} />
        <StatBox label="Savers" value={`${3 - saverCount}/3`} color={T.violet} />
      </div>

      {/* Course switcher (only when multiple locked courses) */}
      {lockedCourseIds.length > 1 && (
        <div className="mt-5">
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

      {/* Menu items */}
      <div className="mt-5">
        {menuItems.map((item) => (
          <MenuRow
            key={item.href}
            icon={item.icon}
            label={item.label}
            color={item.color}
            onClick={() => router.push(item.href)}
          />
        ))}
      </div>

      {/* Danger zone */}
      <div className="mt-5 space-y-2.5 pb-8">
        <Divider />

        {/* Browse courses */}
        <button
          onClick={() => router.push('/courses')}
          className="flex items-center gap-3 py-3.5 px-4 rounded-lg border w-full text-left transition-colors"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderColor: T.borderDormant,
          }}
        >
          <span className="text-base w-[22px] text-center" style={{ color: T.textMuted }}>
            {'\u2637'}
          </span>
          <span className="text-sm font-semibold" style={{ color: T.textSecondary }}>
            Browse Courses
          </span>
        </button>

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-3 py-3.5 px-4 rounded-lg border w-full text-left transition-colors"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,68,102,0.15)',
          }}
        >
          <span className="text-base w-[22px] text-center" style={{ color: T.textMuted }}>
            {'\u2715'}
          </span>
          <span className="text-sm font-semibold" style={{ color: T.crimson }}>
            Disconnect
          </span>
        </button>
      </div>
    </ScreenBackground>
  );
}
