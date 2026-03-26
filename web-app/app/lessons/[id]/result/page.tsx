'use client';

import { Suspense, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStreakStore } from '@/stores';
import {
  ScreenBackground,
  ParchmentCard,
  PrimaryButton,
  T,
} from '@/components/theme';

// Wrap in Suspense — useSearchParams requires it in Next.js 16
export default function LessonResultPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ScreenBackground>
          <div className="flex items-center justify-center min-h-[60vh]">
            <p style={{ color: T.textSecondary }} className="text-sm font-mono">
              Loading...
            </p>
          </div>
        </ScreenBackground>
      }
    >
      <ResultContent params={props.params} />
    </Suspense>
  );
}

function ResultContent({ params }: { params: Promise<{ id: string }> }) {
  // Async params unwrap for Next.js 16
  const { id: _lessonId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read result data from query params
  const score = Number(searchParams.get('score') ?? 0);
  const totalQuestions = Number(searchParams.get('total') ?? 0);
  const accepted = searchParams.get('accepted') !== 'false';

  const currentStreak = useStreakStore((s) => s.currentStreak);
  const correctCount = Math.round((score / 100) * totalQuestions);

  // Score color based on performance (matches RN exactly)
  const scoreColor =
    score >= 80
      ? T.green
      : score >= 50
        ? T.amber
        : T.crimson;

  return (
    <ScreenBackground>
      {/* Centered layout like the RN screen */}
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
        {/* Score display */}
        <p
          className="text-[56px] font-bold tracking-wide"
          style={{ color: scoreColor, fontFamily: 'Georgia, serif' }}
        >
          {score}%
        </p>
        <p className="mt-2 text-base" style={{ color: T.textSecondary }}>
          {correctCount}/{totalQuestions} Questions Correct
        </p>

        {/* Reward cards */}
        <div className="mt-7 w-full flex flex-col gap-3.5">
          {/* Verification status */}
          <ParchmentCard className="p-[18px]">
            <p
              className="font-mono text-[10px] uppercase tracking-[1px]"
              style={{ color: T.textSecondary }}
            >
              Lesson Status
            </p>
            <p
              className="text-[22px] font-bold mt-1"
              style={{ color: accepted ? T.green : T.amber }}
            >
              {accepted ? 'Verified' : 'Needs Improvement'}
            </p>
          </ParchmentCard>

          {/* Streak status */}
          <ParchmentCard className="p-[18px]">
            <p
              className="font-mono text-[10px] uppercase tracking-[1px]"
              style={{ color: T.textSecondary }}
            >
              Current Streak
            </p>
            <p
              className="text-[22px] font-bold mt-1"
              style={{ color: T.amber }}
            >
              {currentStreak} day{currentStreak !== 1 ? 's' : ''}
            </p>
          </ParchmentCard>
        </div>

        {/* Return button */}
        <div className="mt-7 w-full">
          <PrimaryButton onClick={() => router.push('/dungeon')}>
            Return to Hub
          </PrimaryButton>
        </div>
      </div>
    </ScreenBackground>
  );
}
