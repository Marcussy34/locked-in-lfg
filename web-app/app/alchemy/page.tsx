'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore } from '@/stores';
import { BREW_MODE_LIST, type BrewModeId } from '@/types';
import {
  ScreenBackground,
  BackButton,
  PageHeader,
  ParchmentCard,
  StatBox,
  ProgressBar,
  DangerButton,
  PrimaryButton,
  T,
} from '@/components/theme';

/* Format milliseconds as HH:MM:SS */
function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getMode(modeId: string | null) {
  return BREW_MODE_LIST.find((mode) => mode.id === modeId) ?? null;
}

export default function AlchemyPage() {
  const router = useRouter();
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const startBrewForCourse = useCourseStore((s) => s.startBrewForCourse);
  const tickBrewForCourse = useCourseStore((s) => s.tickBrewForCourse);
  const cancelBrewForCourse = useCourseStore((s) => s.cancelBrewForCourse);
  const [selectedMode, setSelectedMode] = useState<BrewModeId>('slow');
  const [now, setNow] = useState(() => Date.now());

  const activeState = activeCourseId ? courseStates[activeCourseId] ?? null : null;
  const activeMode = getMode(activeState?.brewModeId ?? null);
  const fuelBalance = activeState?.fuelCounter ?? 0;
  const fuelCap = activeState?.fuelCap ?? 7;
  const gauntletActive = activeState?.gauntletActive ?? true;
  const brewStatus = activeState?.brewStatus ?? 'IDLE';
  const ichorBalance = activeState?.ichorBalance ?? 0;
  const canBrew = fuelBalance > 0 && !gauntletActive;

  /* Tick timer while brewing */
  useEffect(() => {
    if (!activeCourseId || brewStatus !== 'BREWING') return;
    const tick = () => {
      setNow(Date.now());
      tickBrewForCourse(activeCourseId);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeCourseId, brewStatus, tickBrewForCourse]);

  const remainingMs = useMemo(() => {
    if (brewStatus !== 'BREWING' || !activeState?.brewEndsAt) return 0;
    return Math.max(0, new Date(activeState.brewEndsAt).getTime() - now);
  }, [activeState?.brewEndsAt, brewStatus, now]);

  const progress = useMemo(() => {
    if (brewStatus !== 'BREWING' || !activeState?.brewStartedAt || !activeState?.brewEndsAt) return 0;
    const start = new Date(activeState.brewStartedAt).getTime();
    const end = new Date(activeState.brewEndsAt).getTime();
    const total = end - start;
    if (total <= 0) return 1;
    return Math.min(1, Math.max(0, (now - start) / total));
  }, [activeState?.brewEndsAt, activeState?.brewStartedAt, brewStatus, now]);

  const accrued = useMemo(() => {
    if (brewStatus !== 'BREWING' || !activeState?.brewStartedAt || !activeMode) return 0;
    const elapsedHours = Math.max(0, now - new Date(activeState.brewStartedAt).getTime()) / (60 * 60 * 1000);
    return Math.floor(activeMode.ichorPerHour * elapsedHours);
  }, [activeMode, activeState?.brewStartedAt, brewStatus, now]);

  const handleConfirmBrew = useCallback(() => {
    if (!activeCourseId || !canBrew || brewStatus === 'BREWING') return;
    startBrewForCourse(activeCourseId, selectedMode);
  }, [activeCourseId, brewStatus, canBrew, selectedMode, startBrewForCourse]);

  const handleCancel = useCallback(() => {
    if (!activeCourseId) return;
    cancelBrewForCourse(activeCourseId);
  }, [activeCourseId, cancelBrewForCourse]);

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      <PageHeader
        title="Brew Ichor"
        subtitle="Fuel powers the Brewer. Ichor accrues while the brew is active."
        accentWord="Ichor"
      />

      {/* Status grid */}
      <div className="flex flex-col gap-2.5 mb-4">
        <div className="flex gap-2.5">
          <StatBox
            label="Current Brew"
            value={brewStatus === 'BREWING' && activeMode ? activeMode.label : 'None'}
            color={T.textPrimary}
          />
          <StatBox
            label="Ichor Balance"
            value={Math.floor(ichorBalance)}
            color={T.green}
          />
        </div>
        <div className="flex gap-2.5">
          <StatBox
            label="Fuel"
            value={`${fuelBalance}/${fuelCap}`}
            color={T.rust}
          />
          <StatBox
            label="Brewer"
            value={gauntletActive ? 'Locked' : canBrew ? 'Ready' : 'Stopped'}
            color={T.textPrimary}
          />
        </div>
      </div>

      {/* Active brew or mode selection */}
      {brewStatus === 'BREWING' ? (
        <div className="mb-4">
          <ParchmentCard
            className="flex flex-col items-center p-5"
            style={{ borderColor: T.amberDim }}
          >
            {/* Active brew title */}
            <p
              className="text-lg font-bold text-center"
              style={{ fontFamily: 'Georgia, serif', color: T.amber }}
            >
              {activeMode?.symbol} {activeMode?.label ?? 'Active Brew'}
            </p>

            {/* Countdown */}
            <p
              className="font-mono text-[30px] font-bold text-center mt-4"
              style={{ color: T.textPrimary }}
            >
              {formatTime(remainingMs)}
            </p>
            <p className="text-[11px] text-center mt-1" style={{ color: T.textSecondary }}>
              remaining
            </p>

            {/* Progress bar */}
            <div className="w-full mt-4">
              <ProgressBar progress={progress} />
            </div>

            {/* Accruing ichor */}
            <p className="text-[13px] text-center mt-4" style={{ color: T.textSecondary }}>
              Ichor accumulating:
            </p>
            <p className="text-xl font-bold text-center mt-1 mb-4" style={{ color: T.green }}>
              +{accrued}
            </p>

            <DangerButton onClick={handleCancel}>Cancel Brew</DangerButton>
          </ParchmentCard>
        </div>
      ) : (
        <div className="mb-4">
          {BREW_MODE_LIST.map((mode) => {
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => canBrew && setSelectedMode(mode.id)}
                className="w-full text-left mt-2.5"
                style={{ opacity: !canBrew ? 0.4 : 1 }}
              >
                <ParchmentCard
                  style={{
                    borderColor: isSelected ? `${T.amber}35` : T.borderDormant,
                  }}
                >
                  {/* Mode row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode.symbol}</span>
                      <div>
                        <p
                          className="text-[15px] font-semibold"
                          style={{ color: isSelected ? T.amber : T.textPrimary }}
                        >
                          {mode.label}
                        </p>
                        <p className="font-mono text-[11px] mt-0.5" style={{ color: T.textSecondary }}>
                          {mode.durationLabel}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: T.green }}>
                        {mode.ichorPerHour}/hr
                      </p>
                      {mode.bonusPercent > 0 && (
                        <p className="text-[11px] mt-0.5" style={{ color: T.amber }}>
                          +{mode.bonusPercent}% rate
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Total ichor */}
                  <p className="font-mono text-[11px] mt-2" style={{ color: T.textSecondary }}>
                    Total: {Math.round(mode.ichorPerHour * (mode.durationMs / (60 * 60 * 1000)))} Ichor
                  </p>
                </ParchmentCard>
              </button>
            );
          })}

          {/* Confirm button */}
          <div className="mt-5">
            <PrimaryButton
              onClick={handleConfirmBrew}
              disabled={!canBrew}
            >
              {gauntletActive
                ? 'GAUNTLET LOCKED'
                : fuelBalance <= 0
                  ? 'FUEL REQUIRED'
                  : 'CONFIRM BREW'}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Footer note */}
      <ParchmentCard className="flex items-center justify-center mb-8 mt-2">
        <p className="text-[13px] text-center" style={{ color: T.textSecondary }}>
          Fuel is the brewing resource for this course.
        </p>
      </ParchmentCard>
    </ScreenBackground>
  );
}
