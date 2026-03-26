'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore, useUserStore } from '@/stores';
import {
  T,
  ScreenBackground,
  BackButton,
  ParchmentCard,
} from '@/components/theme';

// Human-readable fuel earn status
function formatFuelEarnStatus(status: string): string {
  switch (status) {
    case 'PAUSED_RECOVERY':
      return 'Paused during saver recovery';
    case 'AT_CAP':
      return 'Fuel cap reached';
    case 'EARNED_TODAY':
      return 'Daily Fuel already earned';
    default:
      return 'Fuel available';
  }
}

// Format a burn timestamp or fallback
function formatBurnTime(timestamp: string | null): string {
  if (!timestamp) return 'No burn scheduled';
  return new Date(timestamp).toLocaleString();
}

export default function InventoryPage() {
  const router = useRouter();

  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const refreshCourseRuntime = useCourseStore((s) => s.refreshCourseRuntime);
  const authToken = useUserStore((s) => s.authToken);

  const activeState = activeCourseId ? courseStates[activeCourseId] : null;
  const fuelBalance = activeState?.fuelCounter ?? 0;
  const fuelCap = activeState?.fuelCap ?? 7;
  const dungeonIchor = activeState?.ichorBalance ?? 0;
  const gauntletActive = activeState?.gauntletActive ?? true;
  const fuelEarnStatus = useCourseStore((s) => s.getFuelEarnStatus());
  const nextFuelBurnAt = useCourseStore((s) => s.getNextFuelBurnAt());

  // Brewer status text
  const brewerStatus = gauntletActive
    ? 'Locked until gauntlet complete'
    : fuelBalance <= 0
      ? 'Stopped (Fuel is zero)'
      : 'Fuel available';

  // Refresh runtime on mount
  useEffect(() => {
    if (activeCourseId && authToken) {
      void refreshCourseRuntime(activeCourseId, authToken).catch(() => {
        // Keep last synced runtime visible if refresh fails.
      });
    }
  }, [activeCourseId, authToken, refreshCourseRuntime]);

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      {/* Title */}
      <h1
        className="text-2xl font-bold tracking-wide mt-2 mb-1"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Inventory
      </h1>
      <p className="text-xs leading-[18px]" style={{ color: T.textSecondary }}>
        Your dungeon resources
      </p>

      {/* Fuel card */}
      <ParchmentCard
        className="mt-4"
        style={{ padding: 20, borderColor: `${T.rust}25` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="font-mono text-[10px] uppercase tracking-[1px]"
              style={{ color: T.textSecondary }}
            >
              Fuel
            </p>
            <p className="text-[30px] font-bold mt-1" style={{ color: T.rust }}>
              {fuelBalance}
              <span className="text-sm font-normal" style={{ color: T.textSecondary }}>
                /{fuelCap}
              </span>
            </p>
          </div>
          <span className="text-[30px]">{'\u26FD'}</span>
        </div>
        <p className="text-[11px] mt-2" style={{ color: T.textSecondary }}>
          {formatFuelEarnStatus(fuelEarnStatus)}
        </p>
        <p className="text-[11px] mt-1" style={{ color: T.textMuted }}>
          Next burn: {formatBurnTime(nextFuelBurnAt)}
        </p>
        <p className="text-[11px] mt-1" style={{ color: T.textMuted }}>
          Brewer: {brewerStatus}
        </p>
      </ParchmentCard>

      {/* Dungeon Ichor card */}
      <ParchmentCard
        className="mt-3"
        style={{ padding: 20, borderColor: `${T.amber}25` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="font-mono text-[10px] uppercase tracking-[1px]"
              style={{ color: T.textSecondary }}
            >
              Dungeon Ichor
            </p>
            <p className="text-[30px] font-bold mt-1" style={{ color: T.amber }}>
              {Math.floor(dungeonIchor).toLocaleString()}
            </p>
          </div>
          <span className="text-[30px]">{'\u2697'}</span>
        </div>
        <p className="text-[11px] mt-2" style={{ color: T.textMuted }}>
          Locked until course complete + lock period ends
        </p>
      </ParchmentCard>
    </ScreenBackground>
  );
}
