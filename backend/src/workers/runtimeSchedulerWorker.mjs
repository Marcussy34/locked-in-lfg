import { appConfig } from '../config.mjs';
import { hasLockVaultRelayConfig, readLockAccountSnapshot } from '../lib/lockVault.mjs';
import {
  consumeDailyFuel,
  consumeSaverOrApplyFullConsequence,
  listRuntimeSchedulerCandidates,
  publishFuelBurnReceipt,
  publishMissConsequenceReceipt,
  syncCourseRuntimeStateWithLockSnapshot,
} from '../modules/progress/repository.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_SECONDS = 24 * 60 * 60;

function isoDate(value) {
  return value.toISOString().slice(0, 10);
}

function addDays(dateText, delta) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  return new Date(date.getTime() + delta * DAY_MS).toISOString().slice(0, 10);
}

function maxIsoDate(...values) {
  return values.filter(Boolean).sort().at(-1) ?? null;
}

function lockStartDayFromSnapshot(snapshot) {
  return new Date(snapshot.lockStartTs * 1000).toISOString().slice(0, 10);
}

function deriveDueBurn(runtime, snapshot, now) {
  if (!snapshot.gauntletComplete || snapshot.fuelCounter <= 0) {
    return null;
  }

  if (snapshot.lastBrewerBurnTs > 0) {
    const nextDueTs = snapshot.lastBrewerBurnTs + DAY_SECONDS;
    if (nextDueTs > Math.floor(now.getTime() / 1000)) {
      return null;
    }

    return {
      cycleId: `auto-burn:${runtime.walletAddress}:${runtime.courseId}:${nextDueTs}`,
      burnedAt: new Date(nextDueTs * 1000).toISOString(),
    };
  }

  return {
    cycleId: `auto-burn:${runtime.walletAddress}:${runtime.courseId}:initial`,
    burnedAt: now.toISOString(),
  };
}

function deriveDueMiss(runtime, snapshot, now) {
  if (!snapshot.gauntletComplete) {
    return null;
  }

  const today = isoDate(now);
  const baseDay = maxIsoDate(
    runtime.lastCompletedDay,
    runtime.lastMissDay,
    addDays(lockStartDayFromSnapshot(snapshot), -1),
  );
  const nextMissDay = addDays(baseDay, 1);

  if (nextMissDay >= today) {
    return null;
  }

  return {
    missEventId: `auto-miss:${runtime.walletAddress}:${runtime.courseId}:${nextMissDay}`,
    missDay: nextMissDay,
  };
}

async function processRuntimeCandidate(app, candidate, now) {
  let snapshot;

  try {
    snapshot = await readLockAccountSnapshot(candidate.walletAddress, candidate.courseId);
  } catch (error) {
    app.log.warn(
      {
        walletAddress: candidate.walletAddress,
        courseId: candidate.courseId,
        error: error instanceof Error ? error.message : String(error),
      },
      'runtime_scheduler.lock_missing',
    );
    return {
      burnProcessed: 0,
      missProcessed: 0,
    };
  }

  const runtime = await syncCourseRuntimeStateWithLockSnapshot(
    candidate.walletAddress,
    candidate.courseId,
    snapshot,
  );

  let burnProcessed = 0;
  let missProcessed = 0;

  const dueBurn = deriveDueBurn(
    { walletAddress: candidate.walletAddress, courseId: candidate.courseId },
    snapshot,
    now,
  );

  if (dueBurn) {
    const burnResult = await consumeDailyFuel(
      candidate.walletAddress,
      candidate.courseId,
      dueBurn.cycleId,
      dueBurn.burnedAt,
    );
    const publishResult = await publishFuelBurnReceipt(
      candidate.walletAddress,
      candidate.courseId,
      dueBurn.cycleId,
    );

    app.log.info(
      {
        walletAddress: candidate.walletAddress,
        courseId: candidate.courseId,
        cycleId: dueBurn.cycleId,
        burnReason: burnResult.reason,
        relayReason: publishResult.reason,
        signature: publishResult.signature ?? null,
      },
      'runtime_scheduler.fuel_burn_processed',
    );
    burnProcessed += 1;
  }

  const dueMiss = deriveDueMiss(
    {
      ...runtime,
      walletAddress: candidate.walletAddress,
      lastMissDay: candidate.lastMissDay,
    },
    snapshot,
    now,
  );

  if (dueMiss) {
    const missResult = await consumeSaverOrApplyFullConsequence(
      candidate.walletAddress,
      candidate.courseId,
      dueMiss.missEventId,
      dueMiss.missDay,
    );
    const publishResult = await publishMissConsequenceReceipt(
      candidate.walletAddress,
      candidate.courseId,
      dueMiss.missEventId,
    );

    app.log.info(
      {
        walletAddress: candidate.walletAddress,
        courseId: candidate.courseId,
        missEventId: dueMiss.missEventId,
        missDay: dueMiss.missDay,
        missReason: missResult.reason,
        relayReason: publishResult.reason,
        signature: publishResult.signature ?? null,
      },
      'runtime_scheduler.miss_processed',
    );
    missProcessed += 1;
  }

  return {
    burnProcessed,
    missProcessed,
  };
}

export function registerRuntimeSchedulerWorker(app) {
  let timer = null;
  let stopped = false;
  let inFlight = false;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNextRun(delayMs = appConfig.runtimeSchedulerIntervalMs) {
    if (stopped) {
      return;
    }

    clearTimer();
    timer = setTimeout(async () => {
      await runCycle();
    }, Math.max(1000, delayMs));
    timer.unref?.();
  }

  async function runCycle() {
    if (stopped) {
      return;
    }

    if (inFlight) {
      scheduleNextRun();
      return;
    }

    inFlight = true;

    try {
      const candidates = await listRuntimeSchedulerCandidates(
        appConfig.runtimeSchedulerBatchSize,
      );
      let burnProcessed = 0;
      let missProcessed = 0;

      for (const candidate of candidates) {
        const result = await processRuntimeCandidate(app, candidate, new Date());
        burnProcessed += result.burnProcessed;
        missProcessed += result.missProcessed;
      }

      if (burnProcessed > 0 || missProcessed > 0) {
        app.log.info(
          {
            candidates: candidates.length,
            burnProcessed,
            missProcessed,
          },
          'runtime_scheduler.cycle_complete',
        );
      }
    } catch (error) {
      app.log.error({ err: error }, 'runtime_scheduler.cycle_failed');
    } finally {
      inFlight = false;
      scheduleNextRun();
    }
  }

  app.addHook('onReady', async () => {
    if (!appConfig.runtimeSchedulerEnabled) {
      app.log.info('Runtime scheduler worker disabled');
      return;
    }

    if (!hasLockVaultRelayConfig()) {
      app.log.warn('Runtime scheduler worker disabled because relay config is incomplete');
      return;
    }

    app.log.info(
      {
        intervalMs: appConfig.runtimeSchedulerIntervalMs,
        batchSize: appConfig.runtimeSchedulerBatchSize,
      },
      'Runtime scheduler worker started',
    );
    scheduleNextRun(1000);
  });

  app.addHook('onClose', async () => {
    stopped = true;
    clearTimer();
  });
}
