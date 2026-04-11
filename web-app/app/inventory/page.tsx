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
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
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
  const fuelEarnStatus = useCourseStore((s) => s.getFuelEarnStatus());
  const nextFuelBurnAt = useCourseStore((s) => s.getNextFuelBurnAt());

  // Brewer status text
  const brewerStatus = fuelBalance <= 0 ? 'Stopped (Fuel is zero)' : 'Fuel available';

  // Refresh runtime on mount
  useEffect(() => {
    if (activeCourseId && authToken) {
      void refreshCourseRuntime(activeCourseId, authToken).catch(() => {
        // Keep last synced runtime visible if refresh fails.
      });
    }
  }, [activeCourseId, authToken, refreshCourseRuntime]);

  const earnStatusColor =
    fuelEarnStatus === 'PAUSED_RECOVERY' || fuelEarnStatus === 'AT_CAP'
      ? T.amber
      : T.green;

  return (
    <ScreenBackground>
      <div className="pt-14" />
      <BackButton onClick={() => router.back()} />

      <h1
        className="text-2xl font-bold tracking-wide mt-2 mb-1"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Inventory
      </h1>
      <p className="text-sm leading-[18px] mb-5" style={{ color: 'rgba(255,255,255,0.6)' }}>
        Your on-chain resources
      </p>

      {/* 2-column layout on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fuel card */}
        <ParchmentCard
          style={{ padding: 24, borderLeftWidth: 3, borderLeftColor: T.rust }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(232,132,90,0.08)',
                border: '1px solid rgba(232,132,90,0.15)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.rust} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3-7 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.38-2.35 1-3.5.5.88 1.13 1.62 1.5 3z" />
              </svg>
            </div>
            <div>
              <p
                className="text-[20px] font-bold"
                style={{ fontFamily: 'Georgia, serif', color: T.rust }}
              >
                Fuel
              </p>
              <p className="text-[28px] font-bold" style={{ color: T.rust }}>
                {fuelBalance} / {fuelCap}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center py-3" style={{ borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
              <span className="text-[13px]" style={{ fontFamily: 'Georgia, serif', color: T.textSecondary }}>Earn Status</span>
              <span className="text-[13px] font-bold" style={{ color: earnStatusColor }}>{formatFuelEarnStatus(fuelEarnStatus)}</span>
            </div>
            <div className="flex justify-between items-center py-3" style={{ borderBottom: '1px dashed rgba(255,255,255,0.04)' }}>
              <span className="text-[13px]" style={{ fontFamily: 'Georgia, serif', color: T.textSecondary }}>Next Burn</span>
              <span className="text-[13px] font-bold" style={{ color: T.textSecondary }}>{formatBurnTime(nextFuelBurnAt)}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-[13px]" style={{ fontFamily: 'Georgia, serif', color: T.textSecondary }}>Brewer Status</span>
              <span className="text-[13px] font-bold" style={{ color: fuelBalance > 0 ? T.green : T.textMuted }}>{brewerStatus}</span>
            </div>
          </div>
        </ParchmentCard>

        {/* Dungeon Ichor card */}
        <ParchmentCard
          style={{ padding: 24, borderLeftWidth: 3, borderLeftColor: T.amber }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-[10px] flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(212,160,74,0.08)',
                border: '1px solid rgba(212,160,74,0.15)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3h6v5l4 9a2 2 0 0 1-1.8 2.8H6.8A2 2 0 0 1 5 17l4-9V3z" />
                <path d="M9 3h6" />
                <path d="M7 15h10" />
              </svg>
            </div>
            <div>
              <p
                className="text-[20px] font-bold"
                style={{ fontFamily: 'Georgia, serif', color: T.amber }}
              >
                Dungeon Ichor
              </p>
              <p className="text-[28px] font-bold" style={{ color: T.green }}>
                {Math.floor(dungeonIchor).toLocaleString()}
              </p>
            </div>
          </div>

          <div
            className="rounded-lg p-3"
            style={{
              background: 'rgba(212,160,74,0.04)',
              border: '1px solid rgba(212,160,74,0.1)',
            }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: T.textSecondary }}>
              Locked until course complete + lock period ends. Redeem via Rewards page.
            </p>
          </div>
        </ParchmentCard>
      </div>
    </ScreenBackground>
  );
}
