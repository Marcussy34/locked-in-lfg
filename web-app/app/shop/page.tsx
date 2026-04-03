'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore } from '@/stores';
import { getYieldHistory } from '@/services/api/progress/progressApi';
import { fetchWithAuth } from '@/services/api/httpClient';
import type { YieldHistoryResponse } from '@/services/api/types';
import {
  ScreenBackground,
  BackButton,
  T,
} from '@/components/theme';

/* ── Inline SVG Icons ──────────────────────────────────────────────── */

function PotionIcon({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 44" width={size} height={size} fill="none">
      <path
        d="M18 8h8v5l7 12c.8 1.6.2 3.2-1 4.2S28 31 22 31s-8-.8-9.5-1.8-1.8-2.6-1-4.2L18 13V8z"
        fill="rgba(212,160,74,0.2)"
        stroke="#D4A04A"
        strokeWidth="1.3"
      />
      <rect x="17" y="4" width="10" height="4.5" rx="2" stroke="#D4A04A" strokeWidth="1.3" />
      <ellipse cx="22" cy="24" rx="7" ry="3.5" fill="rgba(212,160,74,0.25)" />
      <circle cx="19" cy="22" r="1.2" fill="rgba(212,160,74,0.4)" />
      <circle cx="24.5" cy="21" r="0.8" fill="rgba(212,160,74,0.35)" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 20 20" width={16} height={16} fill="none">
      <path d="M10 2v16M6 14l4 4 4-4" stroke="#D4A04A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HexPlusIcon() {
  return (
    <svg viewBox="0 0 18 18" width={14} height={14} fill="none">
      <path d="M9 1L2 5.5v7L9 17l7-4.5v-7L9 1z" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
      <path d="M9 6v6M6.5 9h5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowUpIcon({ color = '#3EE68A' }: { color?: string }) {
  return (
    <svg viewBox="0 0 14 14" width={12} height={12} fill="none">
      <path d="M7 1v12M3 5l4-4 4 4" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MinusBoxIcon() {
  return (
    <svg viewBox="0 0 14 14" width={12} height={12} fill="none">
      <rect x="2.5" y="2.5" width="9" height="9" rx="2" stroke="rgba(255,255,255,0.3)" strokeWidth="1.1" />
      <path d="M5 7h4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function DoubleChevronIcon() {
  return (
    <svg viewBox="0 0 14 14" width={12} height={12} fill="none">
      <path d="M3 11l4-4 4 4M3 7l4-4 4 4" stroke="#E8845A" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SmallPotionIcon() {
  return (
    <svg viewBox="0 0 14 14" width={12} height={12} fill="none">
      <path d="M5 2.5h4v2.5l3 5c.4.8 0 1.5-.5 2S9.5 13.5 7 13.5s-3.5-.5-4-1-.9-1.2-.5-2l3-5V2.5z" stroke="#D4A04A" strokeWidth="1.1" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} fill="none">
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="1.1" />
      <path d="M8 4.5v4l2.5 1.5" stroke="rgba(255,255,255,0.35)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 14 14" width={12} height={12} fill="none">
      <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7L7 1z" fill="#D4A04A" opacity="0.6" />
    </svg>
  );
}

function ActivityBadge() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: 'rgba(62,230,138,0.1)',
        border: '1px solid rgba(62,230,138,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 14 14" width={12} height={12} fill="none">
        <path d="M7 10V4M4.5 6.5L7 4l2.5 2.5" stroke="#3EE68A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getConversionRate(ichorLifetime: number): number {
  if (ichorLifetime <= 9_999) return 0.9;
  if (ichorLifetime <= 49_999) return 1.0;
  if (ichorLifetime <= 99_999) return 1.1;
  return 1.25;
}

function getTierLabel(ichorLifetime: number): string {
  if (ichorLifetime <= 9_999) return 'Tier 1';
  if (ichorLifetime <= 49_999) return 'Tier 2';
  if (ichorLifetime <= 99_999) return 'Tier 3';
  return 'Tier 4';
}

/* ── Preset amounts ────────────────────────────────────────────────── */
const PRESETS = [250, 500, 1000] as const;

/* ── Page ───────────────────────────────────────────────────────────── */

export default function ShopPage() {
  const router = useRouter();
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const activeState = activeCourseId ? courseStates[activeCourseId] ?? null : null;
  const ichorBalance = activeState?.ichorBalance ?? 0;
  const lifetimeIchor = activeState?.totalIchorProduced ?? 0;

  const [yieldHistory, setYieldHistory] = useState<YieldHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ichorAmount, setIchorAmount] = useState('1000');

  const rate = getConversionRate(lifetimeIchor);
  const tierLabel = getTierLabel(lifetimeIchor);
  const parsedAmount = Number(ichorAmount) || 0;
  const payout = parsedAmount > 0 ? ((parsedAmount / 1000) * rate).toFixed(2) : '--';
  const balanceWorth = ((ichorBalance / 1000) * rate).toFixed(2);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!activeCourseId) {
        setYieldHistory(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const resp = await fetchWithAuth((token) => getYieldHistory(activeCourseId, token));
        if (!active) return;
        if (!resp) { setError('Connect wallet to view rewards.'); setLoading(false); return; }
        setYieldHistory(resp);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (active) { setError(err instanceof Error ? err.message : 'Failed to load.'); setLoading(false); }
      }
    };
    void load();
    return () => { active = false; };
  }, [activeCourseId]);

  const recentHarvests = yieldHistory?.entries ?? [];

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      {/* Title */}
      <h1
        className="text-2xl font-bold tracking-wide"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Claim Rewards
      </h1>
      <p className="text-xs leading-[18px] mb-4" style={{ color: T.textSecondary }}>
        Redeem Ichor earned from learning
      </p>

      {/* ── Zone 1: Hero Balance ────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(212,160,74,0.12) 0%, rgba(212,160,74,0.04) 100%)',
          border: `1px solid rgba(212,160,74,0.25)`,
        }}
      >
        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(212,160,74,0.12) 0%, transparent 70%)' }}
        />

        <div className="relative">
          <div className="flex justify-center mb-2.5">
            <PotionIcon />
          </div>
          <span
            className="font-mono text-[9px] uppercase tracking-[2px]"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Your Ichor
          </span>
          <div className="text-[40px] font-bold mt-1.5" style={{ color: T.amber }}>
            {ichorBalance.toLocaleString()}
          </div>
          <div className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Worth approximately{' '}
            <strong style={{ color: T.green }}>${balanceWorth} USDC</strong>
          </div>

          {/* Tier badge */}
          <div
            className="inline-flex items-center gap-1.5 mt-3.5 rounded-full px-3.5 py-1.5"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <StarIcon />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {tierLabel} &middot; 1,000 = {rate.toFixed(2)} USDC
            </span>
          </div>
        </div>
      </div>

      {/* ── Zone 2: Redeem Card ─────────────────────────────────────── */}
      <div
        className="mt-5 rounded-[14px] p-[18px]"
        style={{
          backgroundColor: T.bgCard,
          border: `1px solid ${T.borderAlive}`,
        }}
      >
        <div className="flex items-center gap-2 mb-3.5">
          <ArrowDownIcon />
          <span
            className="font-mono text-[10px] uppercase tracking-[2px] font-bold"
            style={{ color: T.amber }}
          >
            Redeem Ichor
          </span>
        </div>

        {/* Amount label */}
        <span
          className="font-mono text-[9px] uppercase tracking-[1px] mb-1.5 block"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Amount
        </span>

        {/* Input */}
        <div
          className="rounded-[10px] border px-3.5 py-3.5 flex items-center justify-between"
          style={{ backgroundColor: T.bg, borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <input
            type="number"
            value={ichorAmount}
            onChange={(e) => setIchorAmount(e.target.value)}
            placeholder="1000"
            className="bg-transparent outline-none text-xl w-full"
            style={{ color: T.textPrimary }}
          />
          <span
            className="text-[10px] rounded-md px-2.5 py-1 ml-2 shrink-0"
            style={{ color: 'rgba(212,160,74,0.6)', backgroundColor: 'rgba(212,160,74,0.1)' }}
          >
            ICHOR
          </span>
        </div>

        {/* Preset pills */}
        <div className="flex gap-2 mt-2.5">
          {PRESETS.map((preset) => {
            const selected = parsedAmount === preset;
            return (
              <button
                key={preset}
                onClick={() => setIchorAmount(String(preset))}
                className="px-3.5 py-1.5 rounded-full text-[10px] transition-colors"
                style={{
                  border: `1px solid ${selected ? 'rgba(212,160,74,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  backgroundColor: selected ? 'rgba(212,160,74,0.12)' : 'transparent',
                  color: selected ? T.amber : 'rgba(255,255,255,0.35)',
                  fontWeight: selected ? 700 : 400,
                }}
              >
                {preset.toLocaleString()}
              </button>
            );
          })}
          <button
            onClick={() => setIchorAmount(String(ichorBalance))}
            className="px-3.5 py-1.5 rounded-full text-[10px] transition-colors"
            style={{
              border: `1px solid ${parsedAmount === ichorBalance && ichorBalance > 0 ? 'rgba(212,160,74,0.4)' : 'rgba(255,255,255,0.06)'}`,
              backgroundColor: parsedAmount === ichorBalance && ichorBalance > 0 ? 'rgba(212,160,74,0.12)' : 'transparent',
              color: parsedAmount === ichorBalance && ichorBalance > 0 ? T.amber : 'rgba(255,255,255,0.35)',
              fontWeight: parsedAmount === ichorBalance && ichorBalance > 0 ? 700 : 400,
            }}
          >
            All
          </button>
        </div>

        {/* Payout preview */}
        <div
          className="mt-3.5 rounded-[10px] border p-3.5"
          style={{
            backgroundColor: 'rgba(62,230,138,0.05)',
            borderColor: 'rgba(62,230,138,0.12)',
          }}
        >
          <div className="flex justify-between items-center">
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              You&apos;ll receive
            </span>
            <span className="text-[22px] font-bold" style={{ color: T.green }}>
              {payout === '--' ? '--' : `${payout} USDC`}
            </span>
          </div>
          <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.22)' }}>
            Sent directly to your connected wallet
          </p>
        </div>

        {/* CTA */}
        <button
          className="w-full mt-4 rounded-[10px] py-3.5 text-center"
          style={{
            backgroundColor: T.amber,
            border: '1px solid #E8B860',
            fontFamily: 'Georgia, serif',
          }}
          disabled
        >
          <span
            className="text-[13px] font-extrabold uppercase tracking-[2px]"
            style={{ color: '#1A1000' }}
          >
            Claim Rewards
          </span>
        </button>
        <p className="text-center text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.18)' }}>
          On-chain redemption requires wallet connection
        </p>
      </div>

      {/* ── Zone 3: Earnings Breakdown ──────────────────────────────── */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-3">
          <HexPlusIcon />
          <span
            className="font-mono text-[10px] uppercase tracking-[2px] font-bold"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Earnings Breakdown
          </span>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: T.textSecondary }}>Loading earnings...</p>
        ) : error ? (
          <p className="text-xs" style={{ color: T.amber }}>{error}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatCard
                icon={<ArrowUpIcon />}
                label="Total Yield"
                value={`${yieldHistory?.totalGrossYieldUi ?? '0'}`}
                unit="USDC"
              />
              <StatCard
                icon={<MinusBoxIcon />}
                label="Fees"
                value={`${yieldHistory?.totalPlatformFeeUi ?? '0'}`}
                unit="USDC"
              />
              <StatCard
                icon={<DoubleChevronIcon />}
                label="Redirected"
                value={`${yieldHistory?.totalRedirectedUi ?? '0'}`}
                unit="USDC"
              />
              <StatCard
                icon={<SmallPotionIcon />}
                label="Ichor Earned"
                value={Number(yieldHistory?.totalIchorAwarded ?? '0').toLocaleString()}
                valueColor={T.amber}
              />
            </div>
            <p className="text-center text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.15)' }}>
              {yieldHistory?.totalHarvests ?? 0} harvests total
            </p>
          </>
        )}
      </div>

      {/* ── Zone 4: Recent Activity ─────────────────────────────────── */}
      <div className="mt-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <ClockIcon />
          <span
            className="font-mono text-[10px] uppercase tracking-[2px] font-bold"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Recent Activity
          </span>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: T.textSecondary }}>Loading activity...</p>
        ) : error ? (
          <p className="text-xs" style={{ color: T.amber }}>{error}</p>
        ) : recentHarvests.length === 0 ? (
          <div
            className="rounded-[10px] border p-4 text-center"
            style={{ backgroundColor: T.bgCard, borderColor: T.borderDormant }}
          >
            <p className="text-sm" style={{ color: T.textSecondary }}>No activity yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentHarvests.map((entry) => (
              <div
                key={entry.harvestId}
                className="rounded-[10px] border p-3.5"
                style={{ backgroundColor: T.bgCard, borderColor: T.borderDormant }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <ActivityBadge />
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: T.textPrimary }}>
                        Yield Earned
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>
                        {relativeTime(entry.harvestedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-bold" style={{ color: T.green }}>
                      +{entry.grossYieldAmountUi} USDC
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: T.amber }}>
                      +{Number(entry.ichorAwarded).toLocaleString()} Ichor
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScreenBackground>
  );
}

/* ── Stat Card Component ───────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  unit,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
}) {
  return (
    <div
      className="rounded-[10px] border p-3.5"
      style={{ backgroundColor: T.bgCard, borderColor: T.borderDormant }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span
          className="font-mono text-[8px] uppercase tracking-[1px]"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {label}
        </span>
      </div>
      <span className="text-[17px] font-bold" style={{ color: valueColor ?? T.textPrimary }}>
        {value}
        {unit && (
          <span className="text-[10px] ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}
