'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore, useUserStore } from '@/stores';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  StatBox,
  T,
} from '@/components/theme';

const ICHOR_PER_FUEL = 100;

export default function AlchemyPage() {
  const router = useRouter();
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const convertFuelForCourse = useCourseStore((s) => s.convertFuelForCourse);
  const authToken = useUserStore((s) => s.authToken);
  const [convertAmount, setConvertAmount] = useState(1);
  const [justConverted, setJustConverted] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeState = activeCourseId ? courseStates[activeCourseId] ?? null : null;
  const fuelBalance = activeState?.fuelCounter ?? 0;
  const fuelCap = activeState?.fuelCap ?? 7;
  const ichorBalance = activeState?.ichorBalance ?? 0;
  const fuelFragments = activeState?.fuelFragmentsToday ?? 0;
  const canConvert = fuelBalance > 0 && !isConverting;

  const handleConvert = useCallback(async () => {
    if (!activeCourseId || !canConvert) return;
    const amount = Math.min(convertAmount, fuelBalance);
    setIsConverting(true);
    setError(null);
    try {
      await convertFuelForCourse(activeCourseId, amount, authToken);
      setJustConverted(amount * ICHOR_PER_FUEL);
      setTimeout(() => setJustConverted(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setIsConverting(false);
    }
  }, [activeCourseId, canConvert, convertAmount, fuelBalance, convertFuelForCourse, authToken]);

  const effectiveAmount = Math.min(convertAmount, fuelBalance || 1);

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      <h1
        className="text-2xl font-bold tracking-wide"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Alchemy
      </h1>
      <p className="text-xs mt-1 mb-5" style={{ color: T.textSecondary }}>
        Brew fuel into ichor tokens
      </p>

      {/* 2-column layout on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Conversion UI */}
        <ParchmentCard className="p-6">
          <p
            className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-center mb-2"
            style={{ color: T.textMuted }}
          >
            Brew Fuel into Ichor
          </p>
          <p
            className="text-[13px] text-center mb-5"
            style={{ color: T.textSecondary }}
          >
            1 Fuel = {ICHOR_PER_FUEL} Ichor
          </p>

          {/* Amount selector */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <button
              onClick={() => setConvertAmount(Math.max(1, convertAmount - 1))}
              disabled={convertAmount <= 1}
              className="w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-bold transition-colors"
              style={{
                borderColor: T.borderDormant,
                color: convertAmount <= 1 ? T.textMuted : T.textPrimary,
                backgroundColor: 'transparent',
              }}
            >
              -
            </button>
            <div className="text-center">
              <p className="text-[42px] font-bold" style={{ color: T.amber, fontFamily: 'Georgia, serif' }}>
                {effectiveAmount}
              </p>
              <p
                className="font-mono text-[9px] uppercase tracking-[1px]"
                style={{ color: T.textMuted }}
              >
                Fuel
              </p>
            </div>
            <button
              onClick={() => setConvertAmount(Math.min(fuelBalance, convertAmount + 1))}
              disabled={convertAmount >= fuelBalance}
              className="w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-bold transition-colors"
              style={{
                borderColor: T.borderDormant,
                color: convertAmount >= fuelBalance ? T.textMuted : T.textPrimary,
                backgroundColor: 'transparent',
              }}
            >
              +
            </button>
          </div>

          {/* Quick select pills */}
          <div className="flex justify-center gap-2 mb-5">
            {[1, ...(fuelBalance > 2 ? [Math.ceil(fuelBalance / 2)] : []), ...(fuelBalance > 1 ? [fuelBalance] : [])].filter((v, i, a) => a.indexOf(v) === i).map((amount) => (
              <button
                key={amount}
                onClick={() => setConvertAmount(amount)}
                className="px-3.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-colors"
                style={{
                  borderColor: convertAmount === amount ? T.amber : T.borderDormant,
                  color: convertAmount === amount ? T.amber : T.textSecondary,
                  backgroundColor: convertAmount === amount ? 'rgba(212,160,74,0.1)' : 'transparent',
                }}
              >
                {amount === fuelBalance ? 'All' : amount}
              </button>
            ))}
          </div>

          {/* Output preview */}
          <div
            className="rounded-lg p-3.5 text-center mb-5"
            style={{
              background: 'rgba(62,230,138,0.04)',
              border: '1px solid rgba(62,230,138,0.1)',
            }}
          >
            <p
              className="font-mono text-[10px] uppercase tracking-[1px]"
              style={{ color: T.textMuted }}
            >
              You&apos;ll receive
            </p>
            <p className="text-[28px] font-bold mt-1" style={{ color: T.green }}>
              {effectiveAmount * ICHOR_PER_FUEL} Ichor
            </p>
          </div>

          {/* Convert button */}
          <button
            onClick={handleConvert}
            disabled={!canConvert}
            className="w-full py-3 rounded-lg text-center font-bold text-sm uppercase tracking-[1px] transition-colors"
            style={{
              border: `1px solid ${T.amber}`,
              background: canConvert ? 'rgba(212,160,74,0.12)' : 'transparent',
              color: canConvert ? T.amber : T.textMuted,
              fontFamily: 'Georgia, serif',
              opacity: canConvert ? 1 : 0.4,
              cursor: canConvert ? 'pointer' : 'not-allowed',
            }}
          >
            {isConverting
              ? 'Converting...'
              : justConverted
                ? `+${justConverted} Ichor!`
                : fuelBalance <= 0
                  ? 'No Fuel to Convert'
                  : '\u25C6 Convert \u25C6'}
          </button>

          {error && (
            <p className="text-[12px] text-center mt-2" style={{ color: T.crimson }}>
              {error}
            </p>
          )}
        </ParchmentCard>

        {/* Right: Stats + Daily Fuel */}
        <div className="flex flex-col gap-3">
          <StatBox
            label="Available Fuel"
            value={`${fuelBalance}/${fuelCap}`}
            color={T.rust}
          />
          <StatBox
            label="Ichor Balance"
            value={Math.floor(ichorBalance)}
            color={T.green}
          />
          <ParchmentCard className="p-4">
            <p
              className="font-mono text-[10px] font-bold uppercase tracking-[2px] mb-3"
              style={{ color: T.textMuted }}
            >
              Daily Fuel Progress
            </p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono" style={{ color: T.textMuted }}>
                Fragments earned today
              </span>
              <span className="text-[12px] font-mono font-bold" style={{ color: fuelFragments >= 1 ? T.green : T.amber }}>
                {fuelFragments.toFixed(2)} / 1.00
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, fuelFragments * 100)}%`,
                  backgroundColor: fuelFragments >= 1 ? T.green : T.amber,
                }}
              />
            </div>
          </ParchmentCard>
        </div>
      </div>
    </ScreenBackground>
  );
}
