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
  ParchmentCard,
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
      <div className="pt-14" />
      <BackButton onClick={() => router.back()} />

      <h1
        className="text-2xl font-bold tracking-wide"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Rewards
      </h1>
      <p className="text-sm leading-[18px] mb-5" style={{ color: 'rgba(255,255,255,0.6)' }}>
        Redeem ichor for USDC
      </p>

      {/* 2-column layout on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── Left: Redemption UI ── */}
        <ParchmentCard
          style={{ padding: 24, borderColor: T.borderAlive }}
        >
          {/* Ichor hero */}
          <div className="text-center mb-5">
            <p className="text-4xl font-bold" style={{ color: T.green }}>
              {ichorBalance.toLocaleString()}
            </p>
            <p
              className="font-mono text-[10px] uppercase tracking-[1px] mt-1"
              style={{ color: T.textMuted }}
            >
              Ichor Balance
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span
                className="font-mono text-[10px] px-2.5 py-1 rounded-xl"
                style={{ color: T.teal, background: 'rgba(42,232,212,0.08)', border: '1px solid rgba(42,232,212,0.15)' }}
              >
                {tierLabel}
              </span>
              <span className="font-mono text-[10px]" style={{ color: T.textMuted }}>
                1,000 = {rate.toFixed(2)} USDC
              </span>
            </div>
            <p className="text-[14px] font-bold mt-2" style={{ color: T.teal }}>
              Worth ~${balanceWorth} USDC
            </p>
          </div>

          {/* Redeem section */}
          <p
            className="font-mono text-[10px] font-bold uppercase tracking-[2px] text-center mb-3"
            style={{ color: T.textMuted }}
          >
            Redeem Ichor
          </p>

          {/* Amount input */}
          <div
            className="rounded-[10px] border px-3.5 py-3 flex items-center justify-center mb-3"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: T.borderAlive }}
          >
            <input
              type="number"
              value={ichorAmount}
              onChange={(e) => setIchorAmount(e.target.value)}
              placeholder="1000"
              className="bg-transparent outline-none text-2xl font-bold font-mono text-center w-full"
              style={{ color: T.amber }}
            />
            <span className="text-[11px] ml-2 flex-shrink-0" style={{ color: T.textMuted }}>ICHOR</span>
          </div>

          {/* Preset pills */}
          <div className="flex justify-center gap-2 mb-4">
            {PRESETS.map((preset) => {
              const selected = parsedAmount === preset;
              return (
                <button
                  key={preset}
                  onClick={() => setIchorAmount(String(preset))}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-colors"
                  style={{
                    borderColor: selected ? T.amber : T.borderDormant,
                    backgroundColor: selected ? 'rgba(212,160,74,0.1)' : 'transparent',
                    color: selected ? T.amber : T.textSecondary,
                  }}
                >
                  {preset.toLocaleString()}
                </button>
              );
            })}
            <button
              onClick={() => setIchorAmount(String(ichorBalance))}
              className="px-3.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-colors"
              style={{
                borderColor: parsedAmount === ichorBalance && ichorBalance > 0 ? T.amber : T.borderDormant,
                backgroundColor: parsedAmount === ichorBalance && ichorBalance > 0 ? 'rgba(212,160,74,0.1)' : 'transparent',
                color: parsedAmount === ichorBalance && ichorBalance > 0 ? T.amber : T.textSecondary,
              }}
            >
              All
            </button>
          </div>

          {/* Payout preview */}
          <div
            className="rounded-lg p-3.5 text-center mb-4"
            style={{ background: 'rgba(62,230,138,0.04)', border: '1px solid rgba(62,230,138,0.1)' }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[1px]" style={{ color: T.textMuted }}>Payout</p>
            <p className="text-[22px] font-bold mt-1" style={{ color: T.green }}>
              {payout === '--' ? '--' : `${payout} USDC`}
            </p>
          </div>

          {/* Claim button (disabled) */}
          <button
            className="w-full py-3 rounded-lg text-center font-bold text-sm uppercase tracking-[1px]"
            style={{
              border: `1px solid ${T.amber}`,
              background: 'rgba(212,160,74,0.12)',
              color: T.amber,
              fontFamily: 'Georgia, serif',
              opacity: 0.4,
              cursor: 'not-allowed',
            }}
            disabled
          >
            ◆ Claim Rewards ◆
          </button>
          <p className="text-center text-[10px] mt-2" style={{ color: T.textMuted }}>
            On-chain redemption requires wallet connection
          </p>
        </ParchmentCard>

        {/* ── Right: Earnings + Activity ── */}
        <div>
          {/* Earnings stats 2x2 */}
          {loading ? (
            <p className="text-sm" style={{ color: T.textSecondary }}>Loading earnings...</p>
          ) : error ? (
            <p className="text-xs" style={{ color: T.amber }}>{error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <StatCard icon={<ArrowUpIcon />} label="Total Yield" value={`${yieldHistory?.totalGrossYieldUi ?? '0'}`} unit="USDC" />
                <StatCard icon={<MinusBoxIcon />} label="Fees" value={`${yieldHistory?.totalPlatformFeeUi ?? '0'}`} unit="USDC" />
                <StatCard icon={<DoubleChevronIcon />} label="Redirected" value={`${yieldHistory?.totalRedirectedUi ?? '0'}`} unit="USDC" />
                <StatCard icon={<SmallPotionIcon />} label="Ichor Earned" value={Number(yieldHistory?.totalIchorAwarded ?? '0').toLocaleString()} valueColor={T.amber} />
              </div>
              <ParchmentCard className="text-center mb-4" style={{ padding: 12 }}>
                <p className="font-mono text-[9px] uppercase tracking-[1.5px]" style={{ color: T.textMuted }}>Harvests</p>
                <p className="text-base font-bold mt-0.5" style={{ color: T.amber }}>
                  {yieldHistory?.totalHarvests ?? 0} harvests total
                </p>
              </ParchmentCard>
            </>
          )}

          {/* Recent Activity */}
          <ParchmentCard style={{ padding: 16 }}>
            <p
              className="font-mono text-[10px] font-bold uppercase tracking-[2px] mb-3"
              style={{ color: T.textMuted }}
            >
              Recent Activity
            </p>
            {loading ? (
              <p className="text-sm" style={{ color: T.textSecondary }}>Loading...</p>
            ) : recentHarvests.length === 0 ? (
              <p className="text-sm" style={{ color: T.textSecondary }}>No activity yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentHarvests.map((entry) => (
                  <div
                    key={entry.harvestId}
                    className="flex justify-between items-center py-2"
                    style={{ borderBottom: `1px solid ${T.borderDormant}` }}
                  >
                    <div>
                      <p className="text-[12px] font-semibold" style={{ color: T.textPrimary }}>Yield Earned</p>
                      <p className="font-mono text-[9px] mt-0.5" style={{ color: T.textMuted }}>{relativeTime(entry.harvestedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-bold" style={{ color: T.green }}>+{entry.grossYieldAmountUi} USDC</p>
                      <p className="font-mono text-[9px] mt-0.5" style={{ color: T.textMuted }}>+{Number(entry.ichorAwarded).toLocaleString()} Ichor</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ParchmentCard>
        </div>
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
    <ParchmentCard style={{ padding: 14 }}>
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
    </ParchmentCard>
  );
}
