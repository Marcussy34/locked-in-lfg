'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCourseStore, useUserStore } from '@/stores';
import { getCourseRuntimeHistory } from '@/services/api/progress/progressApi';
import { refreshAuthSession } from '@/services/api/auth/authApi';
import { ApiError } from '@/services/api/errors';
import type { RuntimeHistoryResponse } from '@/services/api/types';
import {
  ScreenBackground,
  BackButton,
  PageHeader,
  ParchmentCard,
  StatBox,
  SectionLabel,
  Divider,
  T,
} from '@/components/theme';

export default function DashboardPage() {
  const router = useRouter();
  const activeCourseId = useCourseStore((s) => s.activeCourseId);
  const courseStates = useCourseStore((s) => s.courseStates);
  const courses = useCourseStore((s) => s.courses);
  const refreshCourseRuntime = useCourseStore((s) => s.refreshCourseRuntime);
  const authToken = useUserStore((s) => s.authToken);
  const refreshToken = useUserStore((s) => s.refreshToken);
  const setAuthSession = useUserStore((s) => s.setAuthSession);

  const [history, setHistory] = useState<RuntimeHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeState = activeCourseId ? courseStates[activeCourseId] ?? null : null;
  const activeCourse = activeCourseId ? courses.find((c) => c.id === activeCourseId) : null;

  /* Derived values */
  const streak = activeState?.currentStreak ?? 0;
  const longestStreak = activeState?.longestStreak ?? 0;
  const saverCount = activeState?.saverCount ?? 0;
  const saversRemaining = Math.max(0, 3 - saverCount);
  const gauntletActive = activeState?.gauntletActive ?? false;
  const gauntletDay = activeState?.gauntletDay ?? 1;
  const saverRecoveryMode = activeState?.saverRecoveryMode ?? false;
  const redirectPercent = Math.round((activeState?.currentYieldRedirectBps ?? 0) / 100);
  const extensionDays = activeState?.extensionDays ?? 0;

  /* Flame state derived from streak */
  const flameState = streak >= 3 ? 'BURNING' : streak >= 1 ? 'LIT' : 'COLD';
  const flameColor =
    flameState === 'BURNING'
      ? T.amber
      : flameState === 'LIT'
        ? T.rust
        : T.textMuted;

  const lampsLit = saversRemaining;

  const refreshBackendToken = useCallback(async () => {
    if (!refreshToken) throw new Error('No refresh token');
    const refreshed = await refreshAuthSession({ refreshToken });
    setAuthSession(refreshed.accessToken, refreshed.refreshToken);
    return refreshed.accessToken;
  }, [refreshToken, setAuthSession]);

  /* Load runtime history and refresh runtime state */
  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!activeCourseId) {
        setHistory(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      let token = authToken;
      if (!token && refreshToken) {
        try { token = await refreshBackendToken(); } catch {
          if (active) { setError('Connect wallet to view dashboard.'); setLoading(false); }
          return;
        }
      }
      if (!token) {
        if (active) { setError('Connect wallet to view dashboard.'); setLoading(false); }
        return;
      }

      /* Refresh runtime state in background */
      void refreshCourseRuntime(activeCourseId, token).catch(() => {});

      try {
        const resp = await getCourseRuntimeHistory(activeCourseId, token);
        if (active) { setHistory(resp); setError(null); setLoading(false); }
      } catch (err) {
        if (err instanceof ApiError && (err.code === 'TOKEN_EXPIRED' || err.status === 401) && refreshToken) {
          try {
            const newToken = await refreshBackendToken();
            const retried = await getCourseRuntimeHistory(activeCourseId, newToken);
            if (active) { setHistory(retried); setError(null); setLoading(false); }
            return;
          } catch { /* fall through */ }
        }
        if (active) { setError(err instanceof Error ? err.message : 'Failed to load.'); setLoading(false); }
      }
    };

    void load();
    return () => { active = false; };
  }, [activeCourseId, authToken, refreshToken, refreshBackendToken, refreshCourseRuntime]);

  return (
    <ScreenBackground>
      <BackButton onClick={() => router.back()} />

      <PageHeader title="Streak Status" />
      {activeCourse && (
        <p className="text-xs mt-1 mb-2" style={{ color: T.textSecondary }}>
          {activeCourse.title}
        </p>
      )}

      {/* Flame state hero */}
      <ParchmentCard className="flex flex-col items-center py-6 mt-4">
        <p
          className="text-[32px] font-bold tracking-[2px]"
          style={{ fontFamily: 'Georgia, serif', color: flameColor }}
        >
          {flameState}
        </p>
        <p className="text-xs mt-2" style={{ color: T.textSecondary }}>
          {flameState === 'BURNING'
            ? 'Your flame burns bright'
            : flameState === 'LIT'
              ? 'Your flame is lit'
              : 'Your flame is cold'}
        </p>
      </ParchmentCard>

      {/* Streak stats */}
      <div className="flex gap-2.5 mt-3">
        <StatBox label="Current Streak" value={`${streak}`} color={T.amber} />
        <StatBox label="Longest Streak" value={`${longestStreak}`} color={T.amber} />
      </div>

      {/* Saver Lamps */}
      <ParchmentCard className="mt-3">
        <SectionLabel>Saver Lamps</SectionLabel>
        <div className="flex justify-center gap-7 mt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[28px]">
                {i < lampsLit ? '\u{1F525}' : '\u{1F4A8}'}
              </span>
              <span
                className="font-mono text-[10px] mt-1 uppercase tracking-[1px]"
                style={{ color: i < lampsLit ? T.violet : T.textMuted }}
              >
                {i < lampsLit ? 'Active' : 'Used'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-center mt-3" style={{ color: T.textSecondary }}>
          {saversRemaining}/3 savers remaining
          {gauntletActive ? ` \u00B7 Locked during gauntlet (Day ${gauntletDay}/7)` : ''}
        </p>
      </ParchmentCard>

      {/* Consequence State */}
      <ParchmentCard className="mt-3">
        <SectionLabel>Consequence State</SectionLabel>
        <div className="flex justify-between items-center">
          <span
            className="font-mono text-[10px] uppercase tracking-[1px]"
            style={{ color: T.textSecondary }}
          >
            Yield redirect
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: redirectPercent > 0 ? T.crimson : T.textPrimary }}
          >
            {redirectPercent}%
          </span>
        </div>
        <Divider />
        <div className="flex justify-between items-center">
          <span
            className="font-mono text-[10px] uppercase tracking-[1px]"
            style={{ color: T.textSecondary }}
          >
            Saver recovery
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: saverRecoveryMode ? T.green : T.textPrimary }}
          >
            {saverRecoveryMode ? 'Active' : 'Inactive'}
          </span>
        </div>
        <Divider />
        <div className="flex justify-between items-center">
          <span
            className="font-mono text-[10px] uppercase tracking-[1px]"
            style={{ color: T.textSecondary }}
          >
            Extension total
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: extensionDays > 0 ? T.crimson : T.textPrimary }}
          >
            {extensionDays} day{extensionDays !== 1 ? 's' : ''}
          </span>
        </div>
      </ParchmentCard>

      {/* Gauntlet status */}
      {gauntletActive && (
        <ParchmentCard className="mt-3" style={{ borderColor: `${T.violet}30` }}>
          <p className="text-sm font-bold" style={{ color: T.violet }}>
            Gauntlet Active
          </p>
          <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
            Day {gauntletDay} of 7 — no savers allowed
          </p>
        </ParchmentCard>
      )}

      {/* Runtime Audit */}
      <ParchmentCard className="mt-3">
        <SectionLabel>Runtime Audit</SectionLabel>
        {loading ? (
          <p className="text-xs mt-2" style={{ color: T.textSecondary }}>Loading...</p>
        ) : error ? (
          <p className="text-[11px] mt-1.5" style={{ color: T.amber }}>{error}</p>
        ) : history ? (
          <p className="text-[13px] mt-1" style={{ color: T.textPrimary }}>
            Burns: {history.burnCount} &middot; Misses: {history.missCount} &middot; Extensions: {history.extensionDaysAdded} day{history.extensionDaysAdded === 1 ? '' : 's'}
          </p>
        ) : (
          <p className="text-xs mt-2" style={{ color: T.textSecondary }}>
            No active course selected.
          </p>
        )}
      </ParchmentCard>
    </ScreenBackground>
  );
}
