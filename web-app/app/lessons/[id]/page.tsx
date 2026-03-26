'use client';

import { useCallback, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore, useUserStore, useStreakStore, useFlameStore } from '@/stores';
import { hasRemoteLessonApi, startLesson, submitLesson } from '@/services/api';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { ApiError } from '@/services/api/errors';
import type { Question } from '@/types';
import {
  T,
  ScreenBackground,
  BackButton,
  ParchmentCard,
  PrimaryButton,
  ProgressBar,
} from '@/components/theme';

type Phase = 'reading' | 'questions';

export default function LessonPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: lessonId } = use(props.params);
  const router = useRouter();

  // Store selectors
  const lesson = useCourseStore((s) => s.getLesson(lessonId));
  const walletAddress = useUserStore((s) => s.walletAddress);
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);

  // Local state
  const [phase, setPhase] = useState<Phase>('reading');
  const [startSynced, setStartSynced] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string>>({});
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived values
  const questions = lesson?.questions ?? [];
  const currentQuestion: Question | undefined = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const courseId = lesson?.courseId ?? '';

  const usesRemoteVerification =
    hasRemoteLessonApi() &&
    lesson?.releaseId !== 'local-mock-release' &&
    !!walletAddress;

  const supportsLocalChecking = Boolean(currentQuestion?.correctAnswer);

  const canContinue =
    (currentQuestion?.type === 'mcq' && Boolean(selectedOption)) ||
    (currentQuestion?.type === 'short_text' && textAnswer.trim().length > 0);

  // Get lesson content from blocks or fallback
  const lessonContent = lesson?.blocks
    ?.sort((a, b) => a.order - b.order)
    .map((block) => block.text ?? '')
    .filter(Boolean)
    .join('\n\n') ?? lesson?.content ?? '';

  // Lesson position
  const courseLessons = useCourseStore((s) => s.getLessonsForCourse(courseId));
  const lessonOrder = lesson?.order ?? 0;
  const totalLessonsInCourse = courseLessons.length;

  // Auth helpers
  const refreshBackendAccessToken = useCallback(async (): Promise<string | null> => {
    if (!refreshToken) return null;
    try {
      const refreshed = await refreshAuthSession({ refreshToken });
      setAuthSession(refreshed.accessToken, refreshed.refreshToken);
      return refreshed.accessToken;
    } catch {
      setAuthSession(null, null);
      return null;
    }
  }, [refreshToken, setAuthSession]);

  const ensureBackendAccessToken = useCallback(async (): Promise<string | null> => {
    if (!usesRemoteVerification) return null;
    if (authToken) return authToken;
    return refreshBackendAccessToken();
  }, [usesRemoteVerification, authToken, refreshBackendAccessToken]);

  const runWithTokenRefreshRetry = useCallback(
    async <TResult,>(operation: (token: string) => Promise<TResult>): Promise<TResult | null> => {
      const token = await ensureBackendAccessToken();
      if (!token) return null;
      try {
        return await operation(token);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) throw err;
        const refreshedToken = await refreshBackendAccessToken();
        if (!refreshedToken) return null;
        return operation(refreshedToken);
      }
    },
    [ensureBackendAccessToken, refreshBackendAccessToken],
  );

  // Lesson completion
  const applyLessonCompletion = useCallback(
    (score: number) => {
      useCourseStore.getState().completeLesson(lessonId, courseId, score);
      useStreakStore.getState().completeDay();
      const newStreak = useStreakStore.getState().currentStreak;
      useFlameStore.getState().updateFromStreak(newStreak);
    },
    [courseId, lessonId],
  );

  const syncLessonStart = useCallback(
    (nextAttemptId: string, startedAt: string) => {
      if (startSynced || !usesRemoteVerification) return;
      setStartSynced(true);
      runWithTokenRefreshRetry((token) =>
        startLesson(lessonId, { attemptId: nextAttemptId, startedAt }, token),
      ).catch(() => {
        setStartSynced(false);
      });
    },
    [lessonId, runWithTokenRefreshRetry, startSynced, usesRemoteVerification],
  );

  const gradeCurrentAnswer = useCallback(() => {
    if (!currentQuestion?.correctAnswer) return false;
    if (currentQuestion.type === 'mcq') {
      return selectedOption === currentQuestion.correctAnswer;
    }
    return (
      textAnswer.trim().replace(/\s+/g, ' ').toLowerCase() ===
      currentQuestion.correctAnswer.trim().replace(/\s+/g, ' ').toLowerCase()
    );
  }, [currentQuestion, selectedOption, textAnswer]);

  const buildAnswerMapWithCurrent = useCallback(() => {
    if (!currentQuestion) return submittedAnswers;
    const answerText =
      currentQuestion.type === 'mcq' ? selectedOption ?? '' : textAnswer.trim();
    return { ...submittedAnswers, [currentQuestion.id]: answerText };
  }, [currentQuestion, selectedOption, submittedAnswers, textAnswer]);

  const submitRemoteLesson = useCallback(
    async (answerMap: Record<string, string>) => {
      if (!attemptId || !attemptStartedAt) {
        throw new Error('Lesson attempt was not initialized.');
      }
      const response = await runWithTokenRefreshRetry((token) =>
        submitLesson(
          lessonId,
          {
            attemptId,
            startedAt: attemptStartedAt,
            completedAt: new Date().toISOString(),
            answers: questions.map((q) => ({
              questionId: q.id,
              answerText: answerMap[q.id] ?? '',
            })),
          },
          token,
        ),
      );
      if (!response) throw new Error('Backend session expired.');
      return response;
    },
    [attemptId, attemptStartedAt, lessonId, questions, runWithTokenRefreshRetry],
  );

  const finalizeLesson = useCallback(
    async (answerMap: Record<string, string>) => {
      if (usesRemoteVerification) {
        setSubmitting(true);
        try {
          const result = await submitRemoteLesson(answerMap);
          if (result.courseRuntime) {
            useCourseStore.getState().syncCourseRuntime(courseId, result.courseRuntime);
          }
          if (result.accepted) {
            applyLessonCompletion(result.score);
          }
          const params = new URLSearchParams({
            score: String(result.score),
            total: String(result.totalQuestions),
            accepted: String(result.accepted),
          });
          router.push(`/lessons/${lessonId}/result?${params.toString()}`);
        } catch {
          setError('Submit failed. Please try again.');
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // Local scoring
      const score = Math.round((correctCount / Math.max(totalQuestions, 1)) * 100);
      applyLessonCompletion(score);
      const params = new URLSearchParams({
        score: String(score),
        total: String(totalQuestions),
        accepted: 'true',
      });
      router.push(`/lessons/${lessonId}/result?${params.toString()}`);
    },
    [
      applyLessonCompletion,
      correctCount,
      courseId,
      lessonId,
      router,
      submitRemoteLesson,
      totalQuestions,
      usesRemoteVerification,
    ],
  );

  const handleCheck = useCallback(() => {
    if (!currentQuestion || !supportsLocalChecking) return;
    const correct = gradeCurrentAnswer();
    setIsCorrect(correct);
    setHasChecked(true);
    if (correct) setCorrectCount((c) => c + 1);
  }, [currentQuestion, gradeCurrentAnswer, supportsLocalChecking]);

  const handleAdvance = useCallback(async () => {
    if (!currentQuestion) return;
    const nextAnswers = buildAnswerMapWithCurrent();
    setSubmittedAnswers(nextAnswers);

    if (isLastQuestion) {
      await finalizeLesson(nextAnswers);
      return;
    }

    setCurrentQuestionIndex((i) => i + 1);
    setSelectedOption(null);
    setTextAnswer('');
    setHasChecked(false);
    setIsCorrect(false);
  }, [buildAnswerMapWithCurrent, currentQuestion, finalizeLesson, isLastQuestion]);

  const handleStartQuestions = useCallback(() => {
    const nextAttemptId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    setAttemptId(nextAttemptId);
    setAttemptStartedAt(startedAt);
    setPhase('questions');
    syncLessonStart(nextAttemptId, startedAt);
  }, [syncLessonStart]);

  // Not found
  if (!lesson) {
    return (
      <ScreenBackground>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm" style={{ color: T.textSecondary }}>
            Lesson not found
          </p>
        </div>
      </ScreenBackground>
    );
  }

  // Reading phase
  if (phase === 'reading') {
    return (
      <ScreenBackground>
        <BackButton onClick={() => router.back()} />

        {/* Lesson counter */}
        <p className="text-xs mt-1" style={{ color: T.textMuted }}>
          Lesson {lessonOrder} of {totalLessonsInCourse}
        </p>

        {/* Title */}
        <h1
          className="text-2xl font-bold tracking-wide mt-3 mb-0"
          style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
        >
          {lesson.title}
        </h1>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {lessonContent.split('\n\n').map((paragraph, i) => (
            <p
              key={i}
              className="text-[15px] leading-[22px]"
              style={{ color: T.textSecondary }}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* Start questions / Complete lesson button */}
        <div className="mt-6 mb-8">
          {questions.length > 0 ? (
            <PrimaryButton onClick={handleStartQuestions}>
              Start Questions
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={() => {
                applyLessonCompletion(100);
                const params = new URLSearchParams({
                  score: '100',
                  total: '0',
                  accepted: 'true',
                });
                router.push(`/lessons/${lessonId}/result?${params.toString()}`);
              }}
            >
              Complete Lesson
            </PrimaryButton>
          )}
        </div>
      </ScreenBackground>
    );
  }

  // Questions phase
  const progressPercent =
    ((currentQuestionIndex + 1) / Math.max(totalQuestions, 1)) * 100;

  const isActionEnabled =
    supportsLocalChecking && !hasChecked
      ? canContinue
      : canContinue || (supportsLocalChecking && hasChecked);

  const isAdvanceDisabled =
    submitting || (!supportsLocalChecking && !canContinue);

  return (
    <ScreenBackground>
      {/* Question header */}
      <div className="flex items-center gap-3 mt-2">
        {/* Exit button */}
        <button
          onClick={() => {
            if (confirm('Leave lesson? Your progress on this attempt will be lost.')) {
              router.back();
            }
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center border"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderColor: T.borderDormant,
          }}
        >
          <span className="text-base font-semibold" style={{ color: T.textMuted }}>
            {'\u2715'}
          </span>
        </button>

        <div className="flex-1 flex items-center justify-between">
          <span className="text-xs" style={{ color: T.textSecondary }}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          {usesRemoteVerification && (
            <span className="text-[11px]" style={{ color: T.textMuted }}>
              Scored on submit
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <ProgressBar progress={progressPercent / 100} />
      </div>

      {/* Question prompt */}
      <h2
        className="text-lg font-bold mt-6 mb-0"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        {currentQuestion?.prompt}
      </h2>

      {/* MCQ options */}
      {currentQuestion?.type === 'mcq' && (
        <div className="mt-4 flex flex-col gap-3">
          {currentQuestion.options?.map((option) => {
            const optionId = typeof option === 'string' ? option : option.id;
            const optionText = typeof option === 'string' ? option : option.text;

            let borderColor = T.borderDormant;
            let bgColor = T.bgCard;

            if (supportsLocalChecking && hasChecked && currentQuestion.correctAnswer) {
              if (optionText === currentQuestion.correctAnswer) {
                borderColor = T.green;
                bgColor = 'rgba(62,230,138,0.08)';
              } else if (
                optionText === selectedOption &&
                optionText !== currentQuestion.correctAnswer
              ) {
                borderColor = T.crimson;
                bgColor = 'rgba(255,68,102,0.08)';
              }
            } else if (optionText === selectedOption) {
              borderColor = T.amber;
              bgColor = T.bgCardActive;
            }

            return (
              <button
                key={optionId}
                onClick={() => {
                  if (!hasChecked || !supportsLocalChecking) {
                    setSelectedOption(optionText);
                  }
                }}
                disabled={supportsLocalChecking && hasChecked}
                className="w-full text-left p-4 rounded-[10px] border transition-colors"
                style={{ borderColor, backgroundColor: bgColor }}
              >
                <span className="text-[15px]" style={{ color: T.textPrimary }}>
                  {optionText}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Short text input */}
      {currentQuestion?.type === 'short_text' && (
        <div className="mt-4">
          <input
            type="text"
            placeholder="Type your answer..."
            value={textAnswer}
            onChange={(e) => {
              if (!hasChecked || !supportsLocalChecking) {
                setTextAnswer(e.target.value);
              }
            }}
            readOnly={supportsLocalChecking && hasChecked}
            className="w-full p-4 rounded-[10px] border text-[15px] outline-none transition-colors"
            style={{
              backgroundColor: T.bgCard,
              borderColor:
                supportsLocalChecking && hasChecked
                  ? isCorrect
                    ? T.green
                    : T.crimson
                  : T.borderDormant,
              color: T.textPrimary,
            }}
          />
          {supportsLocalChecking && hasChecked && !isCorrect && currentQuestion.correctAnswer && (
            <p className="mt-2 text-[13px]" style={{ color: T.textSecondary }}>
              Correct answer:{' '}
              <span className="font-semibold" style={{ color: T.green }}>
                {currentQuestion.correctAnswer}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Local check feedback */}
      {supportsLocalChecking && hasChecked && (
        <p
          className="mt-4 text-[15px] font-semibold"
          style={{ color: isCorrect ? T.green : T.crimson }}
        >
          {isCorrect ? 'Correct!' : 'Incorrect'}
        </p>
      )}

      {/* Remote verification info */}
      {usesRemoteVerification && (
        <p className="mt-4 text-[13px]" style={{ color: T.textMuted }}>
          Answers are verified by the lesson API after you finish the lesson.
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="mt-3 text-sm" style={{ color: T.crimson }}>
          {error}
        </p>
      )}

      {/* Action button */}
      <div className="mt-6 mb-8">
        {supportsLocalChecking && !hasChecked ? (
          <button
            onClick={handleCheck}
            disabled={!canContinue}
            className="w-full py-3.5 rounded-lg border text-center transition-opacity"
            style={{
              backgroundColor: canContinue ? T.amber : 'rgba(255,255,255,0.04)',
              borderColor: canContinue ? '#E8B860' : 'transparent',
              fontFamily: 'Georgia, serif',
              fontSize: 14,
              fontWeight: 800,
              color: canContinue ? '#1A1000' : T.textMuted,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
            }}
          >
            {currentQuestion?.type === 'mcq' ? 'Check Answer' : 'Submit'}
          </button>
        ) : (
          <button
            onClick={() => void handleAdvance()}
            disabled={isAdvanceDisabled}
            className="w-full py-3.5 rounded-lg border text-center transition-opacity"
            style={{
              backgroundColor: isActionEnabled ? T.amber : 'rgba(255,255,255,0.04)',
              borderColor: isActionEnabled ? '#E8B860' : 'transparent',
              fontFamily: 'Georgia, serif',
              fontSize: 14,
              fontWeight: 800,
              color: isActionEnabled ? '#1A1000' : T.textMuted,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
            }}
          >
            {submitting
              ? 'Submitting...'
              : isLastQuestion
                ? 'See Results'
                : 'Next Question'}
          </button>
        )}
      </div>
    </ScreenBackground>
  );
}
