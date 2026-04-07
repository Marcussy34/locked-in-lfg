'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore } from '@/stores';
import { getCourseRuntimeHistory } from '@/services/api/progress/progressApi';
import { fetchWithAuth } from '@/services/api/httpClient';
import type { RuntimeHistoryResponse, RuntimeAuditEvent } from '@/services/api/types';
import {
  ScreenBackground,
  BackButton,
  ParchmentCard,
  StatBox,
  SectionLabel,
  T,
} from '@/components/theme';

/* Human-readable event title — streak-focused labels
 * Backend uses FUEL_BURN / MISS event types from the old whitepaper model.
 * We translate these into user-facing streak language. */
function renderEventTitle(event: RuntimeAuditEvent) {
  if (event.eventType === 'FUEL_BURN') {
    if (event.reason === 'BURNED') return 'Lesson Completed';
    if (event.reason === 'NO_FUEL') return 'Lesson Missed';
    if (event.reason === 'GAUNTLET_LOCKED') return 'Gauntlet Day';
    return 'Streak Event';
  }
  if (event.reason === 'FULL_CONSEQUENCE') return 'Streak Broken';
  if (event.reason === 'SAVER_CONSUMED') return 'Saver Used';
  if (event.reason === 'GAUNTLET_LOCKED') return 'Gauntlet Day';
  return 'Streak Event';
}

function renderRelayStatus(status: RuntimeAuditEvent['lockVaultStatus']) {
  if (status === 'published') return 'Published';
  if (status === 'publishing') return 'Publishing';
  if (status === 'failed') return 'Failed';
  return 'Pending';
}

function renderEventRelayStatus(event: RuntimeAuditEvent) {
  const isLegacyManualEvent =
    event.lockVaultStatus === 'pending' &&
    !event.eventId.startsWith('auto-burn:') &&
    !event.eventId.startsWith('auto-miss:');
  if (isLegacyManualEvent) return 'Legacy';
  return renderRelayStatus(event.lockVaultStatus);
}

export default function StreaksPage() {
  const router = useRouter();
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const courses = useCourseStore((s) => s.courses);
  const refreshCourseRuntime = useCourseStore((s) => s.refreshCourseRuntime);
  const [history, setHistory] = useState<RuntimeHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeState = activeCourseId ? courseStates[activeCourseId] ?? null : null;
  const activeCourse = activeCourseId ? courses.find((c) => c.id === activeCourseId) : null;

  const streak = activeState?.currentStreak ?? 0;
  const longestStreak = activeState?.longestStreak ?? 0;
  const saverCount = activeState?.saverCount ?? 0;
  const saversRemaining = Math.max(0, 3 - saverCount);
  const saverRecoveryMode = activeState?.saverRecoveryMode ?? false;
  const redirectPercent = Math.round((activeState?.currentYieldRedirectBps ?? 0) / 100);
  const extensionDays = activeState?.extensionDays ?? 0;

  /* Flame state */
  const flameState = streak >= 3 ? 'BURNING' : streak >= 1 ? 'LIT' : 'COLD';
  const flameColor =
    flameState === 'BURNING'
      ? T.amber
      : flameState === 'LIT'
        ? T.rust
        : T.textMuted;

  const lampsLit = saversRemaining;

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!activeCourseId) { setHistory(null); setLoading(false); return; }

      setLoading(true);

      // Fire-and-forget runtime refresh
      void fetchWithAuth((token) => refreshCourseRuntime(activeCourseId, token)).catch(() => {});

      try {
        const resp = await fetchWithAuth((token) => getCourseRuntimeHistory(activeCourseId, token));
        if (!active) return;
        if (!resp) { setError('Connect wallet to view streaks.'); setLoading(false); return; }
        setHistory(resp);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (active) { setError(err instanceof Error ? err.message : 'Failed to load.'); setLoading(false); }
      }
    };

    void load();
    return () => { active = false; };
  }, [activeCourseId, refreshCourseRuntime]);

  /* Event colors */
  const isCompletedEvent = (e: RuntimeAuditEvent) =>
    e.eventType === 'FUEL_BURN' && e.reason === 'BURNED';
  const isMissEvent = (e: RuntimeAuditEvent) =>
    e.eventType === 'MISS' || (e.eventType === 'FUEL_BURN' && e.reason !== 'BURNED');

  return (
    <ScreenBackground>
      <div className="pt-14" />
      <BackButton onClick={() => router.back()} />

      {/* Title */}
      <h1
        className="text-2xl font-bold tracking-wide"
        style={{ fontFamily: 'Georgia, serif', color: T.textPrimary }}
      >
        Streak Status
      </h1>
      {activeCourse && (
        <p className="text-sm mt-1 mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {activeCourse.title}
        </p>
      )}

      {/* Row 1: Flame | Stats | Savers — 3-col on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {/* Flame hero */}
        <ParchmentCard className="flex flex-col items-center justify-center py-7">
          <span className="text-[56px]">
            {flameState === 'BURNING'
              ? '\u{1F525}'
              : flameState === 'LIT'
                ? '\u{1FA94}'
                : '\u{1F9CA}'}
          </span>
          <p
            className="text-[22px] font-bold mt-3 tracking-[1px]"
            style={{ fontFamily: 'Georgia, serif', color: flameColor }}
          >
            {flameState === 'BURNING'
              ? 'Burning'
              : flameState === 'LIT'
                ? 'Lit'
                : 'Cold'}
          </p>
          <p className="text-xs mt-2" style={{ color: T.textSecondary }}>
            {flameState === 'BURNING'
              ? `Yield is active. ${streak}-day streak.`
              : flameState === 'LIT'
                ? `Building momentum. ${streak}-day streak.`
                : 'Complete a lesson to light the flame.'}
          </p>
        </ParchmentCard>

        {/* Stats stacked */}
        <div className="flex flex-col gap-3">
          <StatBox label="Current Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} color={T.amber} />
          <StatBox label="Longest Streak" value={`${longestStreak} day${longestStreak !== 1 ? 's' : ''}`} color={T.amber} />
        </div>

        {/* Saver Lamps */}
        <ParchmentCard className="flex flex-col items-center justify-center">
          <SectionLabel>Saver Lamps</SectionLabel>
          <div className="flex justify-center gap-7 mt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-[28px]">
                  {i < lampsLit ? '\u{1F525}' : '\u{1F4A8}'}
                </span>
                <span
                  className="font-mono text-[10px] mt-1 uppercase tracking-[1px]"
                  style={{ color: i < lampsLit ? T.green : T.textMuted }}
                >
                  {i < lampsLit ? 'Active' : 'Used'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-center mt-3" style={{ color: T.textSecondary }}>
            {saversRemaining}/3 remaining
          </p>
        </ParchmentCard>
      </div>

      {/* Row 2: Consequence State — 3 stat boxes */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <StatBox
          label="Yield Redirect"
          value={`${redirectPercent}%`}
          color={redirectPercent > 0 ? T.crimson : T.green}
        />
        <StatBox
          label="Saver Recovery"
          value={saverRecoveryMode ? 'Active' : 'Inactive'}
          color={saverRecoveryMode ? T.green : T.green}
        />
        <StatBox
          label="Extension Total"
          value={`${extensionDays} day${extensionDays !== 1 ? 's' : ''}`}
          color={extensionDays > 0 ? T.crimson : T.textSecondary}
        />
      </div>

      {/* Row 3: Streak History */}
      <ParchmentCard className="mt-3">
        <div className="flex justify-between items-center">
          <SectionLabel>Streak History</SectionLabel>
          {history && (
            <span
              className="font-mono text-[10px]"
              style={{ color: T.textMuted }}
            >
              {history.burnCount} completed {'\u00B7'} {history.missCount} missed {'\u00B7'} {history.extensionDaysAdded} extensions
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-xs mt-2" style={{ color: T.textSecondary }}>
            Loading streak history...
          </p>
        ) : error ? (
          <p className="text-[11px] mt-1.5" style={{ color: T.amber }}>{error}</p>
        ) : history ? (
          <>
            {history.events.length > 0 ? (
              <div className="flex flex-col gap-2.5 mt-3">
                {history.events.map((event) => {
                  const title = renderEventTitle(event);
                  const status = renderEventRelayStatus(event);
                  const completed = isCompletedEvent(event);
                  const missed = isMissEvent(event);
                  const dotColor = completed ? T.green : missed ? T.crimson : T.textMuted;

                  const saversBefore =
                    event.saverCountBefore == null ? null : Math.max(0, 3 - event.saverCountBefore);
                  const saversAfter =
                    event.saverCountAfter == null ? null : Math.max(0, 3 - event.saverCountAfter);

                  /* Build subtitle */
                  const datePart = event.eventDay ? `Day ${event.eventDay}` : '';
                  const timePart = new Date(event.occurredAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  let detailPart = 'Streak maintained';
                  if (event.reason === 'SAVER_CONSUMED' && saversBefore != null && saversAfter != null) {
                    detailPart = `Savers: ${saversBefore} \u2192 ${saversAfter}`;
                  } else if (event.reason === 'FULL_CONSEQUENCE') {
                    detailPart = `Redirect: ${Math.round((event.redirectBpsBefore ?? 0) / 100)}% \u2192 ${Math.round((event.redirectBpsAfter ?? 0) / 100)}%`;
                  } else if (event.reason === 'NO_FUEL') {
                    detailPart = 'No lesson completed';
                  }

                  /* Status pill colors */
                  const statusColor =
                    status === 'Published'
                      ? T.green
                      : status === 'Failed'
                        ? T.crimson
                        : T.textSecondary;
                  const statusBg =
                    status === 'Published'
                      ? 'rgba(62,230,138,0.08)'
                      : status === 'Failed'
                        ? 'rgba(255,68,102,0.08)'
                        : 'rgba(255,255,255,0.04)';

                  /* Right-side indicator */
                  const rightLabel = completed
                    ? '\u2713'
                    : event.reason === 'SAVER_CONSUMED'
                      ? '-1 Saver'
                      : event.reason === 'FULL_CONSEQUENCE'
                        ? 'Broken'
                        : '';
                  const rightColor = completed ? T.green : T.crimson;

                  return (
                    <div
                      key={event.eventId}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-[10px]"
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: `1px solid ${missed ? 'rgba(255,68,102,0.12)' : T.borderDormant}`,
                      }}
                    >
                      {/* Dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: dotColor }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span
                            className="text-[13px] font-bold"
                            style={{ color: missed ? T.crimson : T.textPrimary }}
                          >
                            {title}
                          </span>
                          <span
                            className="font-mono text-[10px] uppercase tracking-[1px] px-2.5 py-0.5 rounded-xl"
                            style={{
                              color: statusColor,
                              background: statusBg,
                              border: `1px solid ${statusColor}30`,
                            }}
                          >
                            {status}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] mt-1" style={{ color: T.textMuted }}>
                          {datePart} {'\u00B7'} {timePart} {'\u00B7'} {detailPart}
                        </p>
                      </div>

                      {/* Right indicator */}
                      <span
                        className="text-xs font-bold flex-shrink-0"
                        style={{ color: rightColor }}
                      >
                        {rightLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs mt-2" style={{ color: T.textSecondary }}>
                No runtime events recorded yet.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs mt-2" style={{ color: T.textSecondary }}>
            No active course selected.
          </p>
        )}
      </ParchmentCard>
    </ScreenBackground>
  );
}
