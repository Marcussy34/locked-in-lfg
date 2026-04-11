'use client';

import { useState } from 'react';
import type { Question } from '@/types';
import { T, ParchmentCard, PrimaryButton } from './theme';

interface RecallQuestionProps {
  question: Question;
  lessonTitle: string;
  onComplete: () => void;
}

/**
 * Spaced-retrieval recall question shown before starting a new lesson.
 * Tests the user on a random question from a previously completed lesson.
 * Not graded — purely for retention reinforcement.
 */
export function RecallQuestion({ question, lessonTitle, onComplete }: RecallQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const isMcq = question.type === 'mcq';

  const handleCheck = () => {
    if (isMcq) {
      // correctAnswer may be option text OR option id — check both
      const selected = question.options?.find((opt) => {
        const id = typeof opt === 'string' ? opt : opt.id;
        return id === selectedOption;
      });
      const selectedId = selected ? (typeof selected === 'string' ? selected : selected.id) : '';
      const selectedText = selected ? (typeof selected === 'string' ? selected : selected.text) : '';
      const correct = selectedText === question.correctAnswer || selectedId === question.correctAnswer;
      setIsCorrect(correct);
    } else {
      // Simple keyword check for short_text (client-side approximation)
      const answer = textAnswer.trim().toLowerCase();
      const keywords = (question.correctAnswer ?? '').toLowerCase().split(/\s+/);
      const matchCount = keywords.filter((kw) => answer.includes(kw)).length;
      setIsCorrect(matchCount >= Math.ceil(keywords.length * 0.5));
    }
    setHasChecked(true);
  };

  const canCheck =
    (isMcq && Boolean(selectedOption)) ||
    (!isMcq && textAnswer.trim().length > 0);

  return (
    <div className="min-h-[60vh] md:min-h-[80vh] flex flex-col items-center justify-center px-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <svg viewBox="0 0 20 20" width={18} height={18} fill="none">
            <path
              d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.4A6.4 6.4 0 1110 3.6a6.4 6.4 0 010 12.8z"
              fill="rgba(212,160,74,0.3)"
            />
            <path
              d="M9 7h2v2H9V7zm0 4h2v4H9v-4z"
              fill="#D4A04A"
            />
          </svg>
          <span
            className="font-mono text-[10px] uppercase tracking-[2px] font-bold"
            style={{ color: T.amber }}
          >
            Quick Recall
          </span>
        </div>
        <p className="text-[13px]" style={{ color: T.textSecondary }}>
          Before we continue, let&apos;s revisit something from{' '}
          <span style={{ color: T.amber }}>{lessonTitle}</span>
        </p>
      </div>

      {/* Question card */}
      <div className="w-full max-w-lg">
        <ParchmentCard className="p-5">
          {/* Prompt */}
          <p
            className="text-[15px] font-semibold leading-[22px] mb-4"
            style={{ color: T.textPrimary }}
          >
            {question.prompt}
          </p>

          {/* MCQ Options */}
          {isMcq && question.options && (
            <div className="flex flex-col gap-2.5">
              {question.options.map((opt) => {
                const optText = typeof opt === 'string' ? opt : opt.text;
                const optId = typeof opt === 'string' ? opt : opt.id;
                const isSelected = selectedOption === optId;
                const showResult = hasChecked;
                const isCorrectOption = optText === question.correctAnswer || optId === question.correctAnswer;

                let borderColor = T.borderDormant;
                let bgColor = 'transparent';
                if (showResult && isCorrectOption) {
                  borderColor = T.green;
                  bgColor = `${T.green}10`;
                } else if (showResult && isSelected && !isCorrectOption) {
                  borderColor = T.crimson;
                  bgColor = `${T.crimson}10`;
                } else if (isSelected) {
                  borderColor = T.amber;
                  bgColor = `${T.amber}08`;
                }

                return (
                  <button
                    key={optId}
                    onClick={() => !hasChecked && setSelectedOption(optId)}
                    disabled={hasChecked}
                    aria-label={optText}
                    className="w-full text-left px-4 py-3 rounded-lg border text-[13px] transition-colors"
                    style={{
                      borderColor,
                      backgroundColor: bgColor,
                      color: T.textPrimary,
                      opacity: hasChecked && !isSelected && !isCorrectOption ? 0.4 : 1,
                    }}
                  >
                    {optText}
                  </button>
                );
              })}
            </div>
          )}

          {/* Short text input */}
          {!isMcq && (
            <textarea
              value={textAnswer}
              onChange={(e) => !hasChecked && setTextAnswer(e.target.value)}
              disabled={hasChecked}
              placeholder="Type your answer..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border text-[13px] bg-transparent outline-none resize-none"
              style={{
                borderColor: hasChecked
                  ? isCorrect ? T.green : T.crimson
                  : T.borderDormant,
                color: T.textPrimary,
              }}
            />
          )}

          {/* Result feedback */}
          {hasChecked && (
            <div
              className="mt-3 px-4 py-2.5 rounded-lg text-[12px] font-semibold"
              style={{
                backgroundColor: isCorrect ? `${T.green}10` : `${T.crimson}10`,
                color: isCorrect ? T.green : T.crimson,
              }}
            >
              {isCorrect ? 'Correct! Great recall.' : 'Not quite — but that\'s okay, that\'s why we review.'}
            </div>
          )}
        </ParchmentCard>

        {/* Action button */}
        <div className="mt-4">
          {!hasChecked ? (
            <PrimaryButton onClick={handleCheck} disabled={!canCheck}>
              Check Answer
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={onComplete}>
              Continue to Lesson
            </PrimaryButton>
          )}
        </div>

        <p className="text-center text-[10px] mt-2" style={{ color: T.textMuted }}>
          Recall questions help strengthen your memory — they don&apos;t affect your score.
        </p>
      </div>
    </div>
  );
}
