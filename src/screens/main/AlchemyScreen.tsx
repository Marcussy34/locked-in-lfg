import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCourseStore } from '@/stores/courseStore';
import { BREW_MODE_LIST, type BrewModeId } from '@/types';
import {
  ScreenBackground,
  BackButton,
  PageHeader,
  ParchmentCard,
  StatBox,
  T,
  ts,
} from '@/theme';

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

export function AlchemyScreen() {
  const navigation = useNavigation();
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

  useEffect(() => {
    if (!activeCourseId || brewStatus !== 'BREWING') {
      return;
    }

    const tick = () => {
      setNow(Date.now());
      tickBrewForCourse(activeCourseId);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeCourseId, brewStatus, tickBrewForCourse]);

  const remainingMs = useMemo(() => {
    if (brewStatus !== 'BREWING' || !activeState?.brewEndsAt) {
      return 0;
    }

    return Math.max(0, new Date(activeState.brewEndsAt).getTime() - now);
  }, [activeState?.brewEndsAt, brewStatus, now]);

  const progress = useMemo(() => {
    if (
      brewStatus !== 'BREWING' ||
      !activeState?.brewStartedAt ||
      !activeState?.brewEndsAt
    ) {
      return 0;
    }

    const start = new Date(activeState.brewStartedAt).getTime();
    const end = new Date(activeState.brewEndsAt).getTime();
    const total = end - start;
    if (total <= 0) return 1;

    return Math.min(1, Math.max(0, (now - start) / total));
  }, [activeState?.brewEndsAt, activeState?.brewStartedAt, brewStatus, now]);

  const accrued = useMemo(() => {
    if (brewStatus !== 'BREWING' || !activeState?.brewStartedAt || !activeMode) {
      return 0;
    }

    const elapsedHours =
      Math.max(0, now - new Date(activeState.brewStartedAt).getTime()) /
      (60 * 60 * 1000);

    return Math.floor(activeMode.ichorPerHour * elapsedHours);
  }, [activeMode, activeState?.brewStartedAt, brewStatus, now]);

  const handleConfirmBrew = useCallback(() => {
    if (!activeCourseId || !canBrew || brewStatus === 'BREWING') {
      return;
    }

    startBrewForCourse(activeCourseId, selectedMode);
  }, [activeCourseId, brewStatus, canBrew, selectedMode, startBrewForCourse]);

  const handleCancel = useCallback(() => {
    if (!activeCourseId) {
      return;
    }

    cancelBrewForCourse(activeCourseId);
  }, [activeCourseId, cancelBrewForCourse]);

  return (
    <ScreenBackground>
      <ScrollView style={s.scrollView} contentContainerStyle={ts.scrollContent}>
        <BackButton onPress={() => navigation.goBack()} />

        <PageHeader
          title="Brew Ichor"
          subtitle="Fuel powers the Brewer. Ichor accrues while the brew is active."
          accentWord="Ichor"
        />

        {/* Status grid */}
        <View style={s.statGrid}>
          <View style={s.statRow}>
            <StatBox
              label="Current Brew"
              value={brewStatus === 'BREWING' && activeMode ? activeMode.label : 'None'}
              color={T.textPrimary}
            />
            <View style={s.statGap} />
            <StatBox
              label="Ichor Balance"
              value={Math.floor(ichorBalance)}
              color={T.green}
            />
          </View>
          <View style={s.statRow}>
            <StatBox
              label="Fuel"
              value={`${fuelBalance}/${fuelCap}`}
              color={T.rust}
            />
            <View style={s.statGap} />
            <StatBox
              label="Brewer"
              value={gauntletActive ? 'Locked' : canBrew ? 'Ready' : 'Stopped'}
              color={T.textPrimary}
            />
          </View>
        </View>

        {brewStatus === 'BREWING' ? (
          <View style={s.sectionWrap}>
            <ParchmentCard style={s.activeBrewCard}>
              <Text style={s.activeBrewTitle}>
                {activeMode?.symbol} {activeMode?.label ?? 'Active Brew'}
              </Text>

              <Text style={s.countdownText}>{formatTime(remainingMs)}</Text>
              <Text style={s.remainingLabel}>remaining</Text>

              <View style={[ts.progressBarBg, s.progressBar]}>
                <View
                  style={[
                    ts.progressBarFill,
                    { width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>

              <Text style={s.accruingLabel}>Ichor accumulating:</Text>
              <Text style={s.accruedValue}>+{accrued}</Text>

              <Pressable style={ts.dangerBtn} onPress={handleCancel}>
                <Text style={ts.dangerBtnText}>Cancel Brew</Text>
              </Pressable>
            </ParchmentCard>
          </View>
        ) : (
          <View style={s.sectionWrap}>
            {BREW_MODE_LIST.map((mode) => {
              const isSelected = selectedMode === mode.id;
              return (
                <Pressable
                  key={mode.id}
                  onPress={() => canBrew && setSelectedMode(mode.id)}
                  style={{ opacity: !canBrew ? 0.4 : 1 }}
                >
                  <ParchmentCard
                    style={[
                      s.modeCard,
                      isSelected ? s.modeCardSelected : {},
                    ]}
                  >
                    <View style={s.modeRow}>
                      <View style={s.modeLeft}>
                        <Text style={s.modeSymbol}>{mode.symbol}</Text>
                        <View>
                          <Text
                            style={[
                              s.modeLabel,
                              isSelected && { color: T.amber },
                            ]}
                          >
                            {mode.label}
                          </Text>
                          <Text style={s.modeDuration}>{mode.durationLabel}</Text>
                        </View>
                      </View>
                      <View style={s.modeRight}>
                        <Text style={s.modeRate}>{mode.ichorPerHour}/hr</Text>
                        {mode.bonusPercent > 0 && (
                          <Text style={s.modeBonus}>
                            +{mode.bonusPercent}% rate
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={s.modeTotal}>
                      Total: {Math.round(mode.ichorPerHour * (mode.durationMs / (60 * 60 * 1000)))} Ichor
                    </Text>
                  </ParchmentCard>
                </Pressable>
              );
            })}

            <Pressable
              style={[
                ts.primaryBtn,
                s.confirmBtn,
                !canBrew && s.confirmBtnDisabled,
              ]}
              onPress={handleConfirmBrew}
              disabled={!canBrew}
            >
              <Text style={[ts.primaryBtnText, !canBrew && { color: T.textSecondary }]}>
                {gauntletActive
                  ? 'GAUNTLET LOCKED'
                  : fuelBalance <= 0
                    ? 'FUEL REQUIRED'
                    : 'CONFIRM BREW'}
              </Text>
            </Pressable>
          </View>
        )}

        <ParchmentCard style={s.footerCard}>
          <Text style={s.footerText}>
            Fuel is the brewing resource for this course.
          </Text>
        </ParchmentCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scrollView: {
    flex: 1,
  },

  /* Stat grid */
  statGrid: {
    gap: 10,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
  },
  statGap: {
    width: 10,
  },

  /* Section wrapper */
  sectionWrap: {
    marginBottom: 16,
  },

  /* Active brew card */
  activeBrewCard: {
    borderColor: T.amberDim,
    padding: 20,
    alignItems: 'center',
  },
  activeBrewTitle: {
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '700',
    color: T.amber,
    textAlign: 'center',
  },
  countdownText: {
    fontFamily: 'monospace',
    fontSize: 30,
    fontWeight: '700',
    color: T.textPrimary,
    textAlign: 'center',
    marginTop: 16,
  },
  remainingLabel: {
    fontSize: 11,
    color: T.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  progressBar: {
    width: '100%',
    marginTop: 16,
  },
  accruingLabel: {
    fontSize: 13,
    color: T.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  accruedValue: {
    fontSize: 20,
    fontWeight: '700',
    color: T.green,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },

  /* Brew mode cards */
  modeCard: {
    marginTop: 10,
  },
  modeCardSelected: {
    borderColor: T.amber + '35',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeSymbol: {
    fontSize: 24,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: T.textPrimary,
  },
  modeDuration: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: T.textSecondary,
    marginTop: 2,
  },
  modeRight: {
    alignItems: 'flex-end',
  },
  modeRate: {
    fontSize: 14,
    fontWeight: '700',
    color: T.green,
  },
  modeBonus: {
    fontSize: 11,
    color: T.amber,
    marginTop: 2,
  },
  modeTotal: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: T.textSecondary,
    marginTop: 8,
  },

  /* Confirm button */
  confirmBtn: {
    marginTop: 20,
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: T.borderDormant,
  },

  /* Footer */
  footerCard: {
    marginBottom: 32,
    marginTop: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: T.textSecondary,
    textAlign: 'center',
  },
});
