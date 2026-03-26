'use client';

import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores';
import {
  ScreenBackground,
  ParchmentCard,
  CornerMarks,
  PrimaryButton,
  T,
} from '@/components/theme';

export default function GauntletPage() {
  const router = useRouter();
  const completeGauntlet = useUserStore((s) => s.completeGauntlet);

  const handleStart = () => {
    completeGauntlet();
    router.push('/dungeon');
  };

  return (
    <ScreenBackground>
      {/* Centered vertically like the RN screen */}
      <div className="flex items-center justify-center min-h-[80vh] px-6">
        <ParchmentCard className="w-full text-center p-7 relative">
          {/* Decorative corner marks */}
          <CornerMarks />

          {/* Title */}
          <h1
            className="text-[22px] font-bold text-center"
            style={{ fontFamily: 'Georgia, serif', color: T.amber }}
          >
            Week 1 Gauntlet
          </h1>

          {/* Description */}
          <p
            className="mt-3 text-sm leading-relaxed text-center"
            style={{ color: T.textSecondary }}
          >
            No savers. No yield. Maximum stakes. Complete 7 days to unlock the
            dungeon.
          </p>

          {/* Enter button */}
          <div className="mt-7">
            <PrimaryButton onClick={handleStart}>
              Skip Gauntlet (Dev)
            </PrimaryButton>
          </div>
        </ParchmentCard>
      </div>
    </ScreenBackground>
  );
}
