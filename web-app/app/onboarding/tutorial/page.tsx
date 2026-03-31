'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores';
import { T } from '@/components/theme';

interface Slide {
  title: string;
  highlight?: string;
  body: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    title: 'Congrats,',
    highlight: "you're in.",
    body: (
      <>
        <p>That&apos;s it. You signed up. You&apos;re ready.</p>
        <p className="mt-4">
          You might be wondering &ldquo;Hold up, isn&apos;t this a crypto app?
          Don&apos;t I need to set up a wallet or something?&rdquo;
        </p>
        <p className="mt-4" style={{ color: T.amber }}>
          Nah fam. We already did it for you.
        </p>
        <p className="mt-4">
          When you signed in with Google, a secure wallet was automatically created
          and linked to your account. No downloads. No weird passwords. No 12-word
          phrases to memorize.
        </p>
        <p className="mt-4" style={{ color: T.textMuted }}>
          Think of it like this: when you sign up for a payment app (TNG, GrabPay),
          you don&apos;t think about the bank routing behind it. You just... use it.
          Same goes here.
        </p>
      </>
    ),
  },
  {
    title: 'LockedIn uses',
    highlight: 'digital dollars.',
    body: (
      <>
        <p>
          Not Bitcoin. Not some volatile coin that could crash overnight.{' '}
          <span style={{ color: T.amber }}>Digital dollars.</span>
        </p>
        <p className="mt-4">
          They&apos;re called <strong>USDC</strong>, and here&apos;s all you need to know:
        </p>
        <div
          className="my-5 py-4 px-5 rounded-lg border text-center"
          style={{ borderColor: `${T.amber}30`, backgroundColor: `${T.amber}08` }}
        >
          <p className="text-[20px] font-bold" style={{ color: T.amber, fontFamily: 'Georgia, serif' }}>
            1 USDC = $1. Always.
          </p>
        </div>
        <p>
          It doesn&apos;t go up. It doesn&apos;t go down. $50 of USDC today is $50 tomorrow,
          next week, next month.
        </p>
        <p className="mt-4" style={{ color: T.textMuted }}>
          USDC is issued by Circle, backed by real US dollars in real bank accounts.
          Used by millions worldwide. Not experimental &mdash; just dollars on the internet.
        </p>
      </>
    ),
  },
  {
    title: 'Lock money,',
    highlight: 'lock in commitment.',
    body: (
      <>
        <div className="flex flex-col gap-3 mb-5">
          {[
            { num: '1', text: 'You lock some USDC (say $50) for a set time (say 30 days)' },
            { num: '2', text: 'You learn every day \u2014 complete lessons, build a streak' },
            { num: '3', text: 'Your locked money earns yield (interest) while it sits there' },
            { num: '4', text: 'Stay consistent \u2192 you get your money back + rewards' },
            { num: '5', text: 'Slack off \u2192 your earned rewards start shrinking' },
          ].map((step) => (
            <div key={step.num} className="flex gap-3 items-start">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${T.amber}20`, color: T.amber }}
              >
                {step.num}
              </span>
              <p className="text-[13px] leading-[20px]">{step.text}</p>
            </div>
          ))}
        </div>
        <div
          className="py-4 px-5 rounded-lg border"
          style={{ borderColor: `${T.green}25`, backgroundColor: `${T.green}08` }}
        >
          <p className="text-[13px] leading-[20px]" style={{ color: T.green }}>
            Think of it like a gym membership, but reversed.
          </p>
          <p className="text-[12px] mt-2" style={{ color: T.textSecondary }}>
            Normal gym: You pay, and if you don&apos;t go, you lose money.
          </p>
          <p className="text-[12px] mt-1" style={{ color: T.amber }}>
            LockedIn: You lock money, and if you consistently learn, you earn money.
          </p>
        </div>
      </>
    ),
  },
];

export default function OnboardingTutorialPage() {
  const router = useRouter();
  const completeTutorial = useUserStore((s) => s.completeTutorial);
  const [slideIndex, setSlideIndex] = useState(0);

  const slide = SLIDES[slideIndex];
  const isLast = slideIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      completeTutorial();
      router.replace('/courses');
    } else {
      setSlideIndex(slideIndex + 1);
    }
  };

  const handleSkip = () => {
    completeTutorial();
    router.replace('/courses');
  };

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
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(6,6,12,0.55)' }} />

      <div className="relative max-w-lg mx-auto px-6 min-h-screen flex flex-col">
        {/* Skip button */}
        <div className="flex justify-end pt-5">
          <button
            onClick={handleSkip}
            className="text-[10px] font-mono uppercase tracking-[1.5px]"
            style={{ color: T.textMuted }}
          >
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col justify-center py-8">
          {/* Title */}
          <h1
            className="text-[28px] font-bold tracking-wide leading-tight mb-6"
            style={{ color: T.textPrimary, fontFamily: 'Georgia, serif' }}
          >
            {slide.title}
            {slide.highlight && (
              <>
                {'\n'}
                <span style={{ color: T.amber }}>{slide.highlight}</span>
              </>
            )}
          </h1>

          {/* Body */}
          <div className="text-[14px] leading-[22px]" style={{ color: T.textSecondary }}>
            {slide.body}
          </div>
        </div>

        {/* Bottom: dots + button */}
        <div className="pb-10">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === slideIndex ? 24 : 8,
                  height: 8,
                  backgroundColor: i === slideIndex ? T.amber : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-[10px] text-center"
            style={{
              backgroundColor: T.amber,
              border: `1px solid ${T.amber}50`,
              boxShadow: '0 0 16px rgba(212,160,74,0.2)',
            }}
          >
            <span
              className="text-[13px] font-bold uppercase tracking-[3px]"
              style={{ color: T.bg, fontFamily: 'Georgia, serif' }}
            >
              {isLast ? '\u25C6  GET STARTED  \u25C6' : 'NEXT'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
