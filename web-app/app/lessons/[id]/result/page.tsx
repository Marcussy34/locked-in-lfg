'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCourseStore } from '@/stores';
import {
  ScreenBackground,
  ParchmentCard,
  PrimaryButton,
  T,
} from '@/components/theme';

interface QuizReviewData {
  questions: {
    id: string;
    prompt: string;
    type: string;
    options?: { id: string; text: string }[] | string[];
    correctAnswer?: string;
  }[];
  userAnswers: Record<string, string>;
  questionResults: {
    questionId: string;
    prompt: string;
    accepted: boolean;
    score: number;
    feedbackSummary: string;
  }[];
}

export default function LessonResultPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <ScreenBackground>
          <div className="flex items-center justify-center min-h-[60vh]">
            <p style={{ color: T.textSecondary }} className="text-sm font-mono">Loading...</p>
          </div>
        </ScreenBackground>
      }
    >
      <ResultContent params={props.params} />
    </Suspense>
  );
}

function ResultContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: _lessonId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = Number(searchParams.get('score') ?? 0);
  const totalQuestions = Number(searchParams.get('total') ?? 0);
  const accepted = searchParams.get('accepted') !== 'false';
  const fuelAwarded = Number(searchParams.get('fuel') ?? 0);
  const fuelTotal = Number(searchParams.get('fuelTotal') ?? 0);
  const xpAwarded = Number(searchParams.get('xp') ?? 0);
  const xpTotal = Number(searchParams.get('xpTotal') ?? 0);
  const xpLevel = Number(searchParams.get('xpLevel') ?? 0);

  const activeState = useCourseStore((s) => {
    const courseId = s.activeCourseId;
    return courseId ? s.courseStates[courseId] : null;
  });
  const streak = activeState?.currentStreak ?? 0;
  const correctCount = Math.round((score / 100) * totalQuestions);

  const scoreColor = score >= 80 ? T.green : score >= 50 ? T.amber : T.crimson;

  const LEVEL_NAMES = ['Novice', 'Apprentice', 'Scholar', 'Adept', 'Master', 'Sage', 'Legend'];
  const levelName = xpLevel > 0 ? (LEVEL_NAMES[xpLevel - 1] ?? `Level ${xpLevel}`) : '';

  // Load question review from sessionStorage
  const [reviewData, setReviewData] = useState<QuizReviewData | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lastQuizReview');
      if (raw) {
        setReviewData(JSON.parse(raw));
        sessionStorage.removeItem('lastQuizReview');
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <ScreenBackground>
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
        {/* Score */}
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
        <div className="mt-7 w-full flex flex-col gap-3">
          {/* Status */}
          <ParchmentCard className="p-[18px]">
            <p className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: T.textSecondary }}>
              Lesson Status
            </p>
            <p className="text-[22px] font-bold mt-1" style={{ color: accepted ? T.green : T.amber }}>
              {accepted ? 'Verified' : 'Needs Improvement'}
            </p>
          </ParchmentCard>

          {/* Rewards row */}
          <div className="flex gap-3">
            {/* Streak */}
            <ParchmentCard className="p-[18px] flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: T.textSecondary }}>
                Streak
              </p>
              <p className="text-[20px] font-bold mt-1" style={{ color: T.amber }}>
                {streak} day{streak !== 1 ? 's' : ''}
              </p>
            </ParchmentCard>

            {/* Fuel earned */}
            {fuelAwarded > 0 && (
              <ParchmentCard className="p-[18px] flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: T.textSecondary }}>
                  Fuel Earned
                </p>
                <p className="text-[20px] font-bold mt-1" style={{ color: T.rust }}>
                  +{fuelAwarded.toFixed(2)}
                </p>
                <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, fuelTotal * 100)}%`, backgroundColor: fuelTotal >= 1 ? T.green : T.amber }}
                  />
                </div>
                <p className="text-[9px] font-mono mt-1" style={{ color: T.textMuted }}>
                  {fuelTotal.toFixed(2)} / 1.00 today
                </p>
              </ParchmentCard>
            )}
          </div>

          {/* XP earned */}
          {xpAwarded > 0 && (
            <ParchmentCard className="p-[18px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: T.textSecondary }}>
                    XP Earned
                  </p>
                  <p className="text-[20px] font-bold mt-1" style={{ color: T.violet }}>
                    +{xpAwarded} XP
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-mono font-bold" style={{ color: T.amber }}>
                    Lv.{xpLevel} {levelName}
                  </p>
                  <p className="text-[10px] font-mono" style={{ color: T.textMuted }}>
                    {xpTotal} XP total
                  </p>
                </div>
              </div>
            </ParchmentCard>
          )}
        </div>

        {/* Question Review toggle */}
        {reviewData && reviewData.questions.length > 0 && (
          <div className="mt-5 w-full">
            <button
              onClick={() => setShowReview(!showReview)}
              className="w-full py-3 rounded-lg border text-center font-mono text-xs font-semibold tracking-[1px] transition-all duration-150 hover:border-[rgba(212,160,74,0.18)] hover:bg-[rgba(255,255,255,0.06)]"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: T.borderDormant,
                color: T.textSecondary,
              }}
            >
              {showReview ? 'Hide Review' : 'Review Answers'}
            </button>

            {showReview && (
              <div className="mt-3 flex flex-col gap-3">
                {reviewData.questions.map((q, idx) => {
                  const userAnswer = reviewData.userAnswers[q.id] ?? '';
                  const backendResult = reviewData.questionResults.find(r => r.questionId === q.id);
                  const isCorrect = backendResult
                    ? backendResult.accepted
                    : q.correctAnswer
                      ? userAnswer === q.correctAnswer
                      : null;

                  return (
                    <ParchmentCard key={q.id} className="p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                          style={{
                            backgroundColor: isCorrect === null ? `${T.amber}20` : isCorrect ? `${T.green}20` : `${T.crimson}20`,
                            color: isCorrect === null ? T.amber : isCorrect ? T.green : T.crimson,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <p className="text-[13px] font-semibold leading-[18px]" style={{ color: T.textPrimary }}>
                          {q.prompt}
                        </p>
                      </div>

                      {/* User's answer */}
                      <div className="ml-7">
                        <p className="text-[11px] font-mono uppercase tracking-[1px] mb-1" style={{ color: T.textMuted }}>
                          Your answer
                        </p>
                        <p
                          className="text-[13px] mb-2"
                          style={{ color: isCorrect === false ? T.crimson : isCorrect === true ? T.green : T.textSecondary }}
                        >
                          {userAnswer || '(no answer)'}
                        </p>

                        {/* Correct answer if wrong */}
                        {isCorrect === false && q.correctAnswer && (
                          <>
                            <p className="text-[11px] font-mono uppercase tracking-[1px] mb-1" style={{ color: T.textMuted }}>
                              Correct answer
                            </p>
                            <p className="text-[13px]" style={{ color: T.green }}>
                              {q.correctAnswer}
                            </p>
                          </>
                        )}

                        {/* Backend feedback */}
                        {backendResult?.feedbackSummary && (
                          <p className="text-[12px] mt-2 leading-[17px]" style={{ color: T.textSecondary }}>
                            {backendResult.feedbackSummary}
                          </p>
                        )}
                      </div>
                    </ParchmentCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Return button */}
        <div className="mt-5 w-full">
          <PrimaryButton onClick={() => router.push('/courses')}>
            Continue
          </PrimaryButton>
        </div>
      </div>
    </ScreenBackground>
  );
}
