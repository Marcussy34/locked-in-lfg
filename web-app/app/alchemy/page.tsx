'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore, useUserStore } from '@/stores';
import {
  ScreenBackground,
  BackButton,
  PageHeader,
  ParchmentCard,
  StatBox,
  PrimaryButton,
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

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      <PageHeader
        title="Convert to Ichor"
        subtitle="Turn your Fuel into Ichor instantly."
        accentWord="Ichor"
      />

      {/* Balances */}
      <div className="flex gap-2.5 mb-5">
        <StatBox
          label="Fuel"
          value={`${fuelBalance}/${fuelCap}`}
          color={T.rust}
        />
        <StatBox
          label="Ichor Balance"
          value={Math.floor(ichorBalance)}
          color={T.green}
        />
      </div>

      {/* Conversion card */}
      <ParchmentCard className="p-5 mb-4">
        <p
          className="text-[13px] font-semibold mb-4 text-center"
          style={{ color: T.textSecondary }}
        >
          1 Fuel = {ICHOR_PER_FUEL} Ichor
        </p>

        {/* Amount selector */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <button
            onClick={() => setConvertAmount(Math.max(1, convertAmount - 1))}
            disabled={convertAmount <= 1}
            className="w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-bold"
            style={{
              borderColor: T.borderDormant,
              color: convertAmount <= 1 ? T.textMuted : T.textPrimary,
              backgroundColor: 'transparent',
            }}
          >
            -
          </button>
          <div className="text-center">
            <p className="text-[32px] font-bold font-mono" style={{ color: T.amber }}>
              {Math.min(convertAmount, fuelBalance || 1)}
            </p>
            <p className="text-[11px]" style={{ color: T.textSecondary }}>Fuel</p>
          </div>
          <button
            onClick={() => setConvertAmount(Math.min(fuelBalance, convertAmount + 1))}
            disabled={convertAmount >= fuelBalance}
            className="w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-bold"
            style={{
              borderColor: T.borderDormant,
              color: convertAmount >= fuelBalance ? T.textMuted : T.textPrimary,
              backgroundColor: 'transparent',
            }}
          >
            +
          </button>
        </div>

        {/* Arrow + output preview */}
        <div className="flex flex-col items-center gap-1 mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12M10 16l-4-4M10 16l4-4" stroke={T.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-[24px] font-bold font-mono" style={{ color: T.green }}>
            {Math.min(convertAmount, fuelBalance || 0) * ICHOR_PER_FUEL}
          </p>
          <p className="text-[11px]" style={{ color: T.textSecondary }}>Ichor</p>
        </div>

        {/* Quick select pills */}
        {fuelBalance > 1 && (
          <div className="flex justify-center gap-2 mb-4">
            {[1, Math.ceil(fuelBalance / 2), fuelBalance].filter((v, i, a) => a.indexOf(v) === i).map((amount) => (
              <button
                key={amount}
                onClick={() => setConvertAmount(amount)}
                className="px-3 py-1 rounded-full text-[11px] font-mono font-bold border"
                style={{
                  borderColor: convertAmount === amount ? T.amber : T.borderDormant,
                  color: convertAmount === amount ? T.amber : T.textSecondary,
                  backgroundColor: convertAmount === amount ? `${T.amber}10` : 'transparent',
                }}
              >
                {amount === fuelBalance ? 'All' : amount}
              </button>
            ))}
          </div>
        )}
      </ParchmentCard>

      {/* Convert button */}
      <PrimaryButton onClick={handleConvert} disabled={!canConvert}>
        {isConverting
          ? 'CONVERTING...'
          : justConverted
            ? `+${justConverted} Ichor!`
            : fuelBalance <= 0
              ? 'NO FUEL TO CONVERT'
              : 'CONVERT'}
      </PrimaryButton>

      {/* Error display */}
      {error && (
        <p className="text-[12px] text-center mt-2" style={{ color: T.crimson }}>
          {error}
        </p>
      )}

      {/* Footer note */}
      <ParchmentCard className="flex items-center justify-center mb-8 mt-4">
        <p className="text-[13px] text-center" style={{ color: T.textSecondary }}>
          Earn Fuel by completing lessons. Convert it to Ichor anytime.
        </p>
      </ParchmentCard>
    </ScreenBackground>
  );
}
