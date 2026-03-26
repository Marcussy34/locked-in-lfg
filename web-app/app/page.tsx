'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/stores/userStore';
import { useCourseStore } from '@/stores/courseStore';
import { ScreenBackground, T } from '@/components/theme';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const phase = useUserStore((s) => s.onboardingPhase);
  const activeCourseIds = useCourseStore((s) => s.activeCourseIds);
  const courseStates = useCourseStore((s) => s.courseStates);

  // Redirect after auth — mirror AppNavigator logic
  useEffect(() => {
    if (!isAuthenticated) return;

    const hasActiveLock = activeCourseIds.some(
      (courseId: string) => Boolean(courseStates[courseId]?.lockAccountAddress),
    );

    // Same routing as AppNavigator.tsx
    if ((phase === 'onboarding' || phase === 'gauntlet') && hasActiveLock) {
      router.replace('/courses');
      return;
    }

    switch (phase) {
      case 'auth':
        // Just authenticated — move to onboarding
        router.replace('/onboarding/courses');
        break;
      case 'onboarding':
        router.replace('/onboarding/courses');
        break;
      case 'gauntlet':
        router.replace('/onboarding/gauntlet');
        break;
      case 'main':
        router.replace('/courses');
        break;
    }
  }, [isAuthenticated, phase, activeCourseIds, courseStates, router]);

  return (
    <ScreenBackground>
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-8">
        <h1
          className="text-4xl font-bold tracking-wide"
          style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
        >
          Locked In
        </h1>

        <p
          className="mt-3 text-[15px] leading-relaxed text-center"
          style={{ color: T.textSecondary }}
        >
          Lock your funds. Light the flame. Learn or burn.
        </p>

        <div className="flex items-center gap-2 mt-6 mb-8">
          <div className="w-[30px] h-px" style={{ backgroundColor: `${T.amber}30` }} />
          <span className="text-[7px]" style={{ color: `${T.amber}50` }}>◆</span>
          <div className="w-[30px] h-px" style={{ backgroundColor: `${T.amber}30` }} />
        </div>

        <div className="w-full">
          <WalletConnect />
        </div>
      </div>
    </ScreenBackground>
  );
}
