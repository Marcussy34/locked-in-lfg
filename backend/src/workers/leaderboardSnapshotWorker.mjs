import { appConfig } from '../config.mjs';
import { hasDatabase } from '../lib/db.mjs';
import { refreshLeaderboardSnapshot } from '../modules/progress/repository.mjs';

export function registerLeaderboardSnapshotWorker(app) {
  let timer = null;
  let stopped = false;
  let inFlight = false;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNextRun(delayMs = appConfig.leaderboardSnapshotIntervalMs) {
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
      const result = await refreshLeaderboardSnapshot(appConfig.leaderboardSnapshotPageSize);
      if (result.processed) {
        app.log.info(
          {
            snapshotAt: result.snapshotAt,
            totalEntries: result.totalEntries,
            currentPotSizeUi: result.currentPotSizeUi,
          },
          'leaderboard_snapshot.cycle_complete',
        );
      }
    } catch (error) {
      app.log.error({ err: error }, 'leaderboard_snapshot.cycle_failed');
    } finally {
      inFlight = false;
      scheduleNextRun();
    }
  }

  app.addHook('onReady', async () => {
    if (!appConfig.leaderboardSnapshotEnabled) {
      app.log.info('Leaderboard snapshot worker disabled');
      return;
    }

    if (!hasDatabase()) {
      app.log.warn('Leaderboard snapshot worker disabled because database is not configured');
      return;
    }

    app.log.info(
      {
        intervalMs: appConfig.leaderboardSnapshotIntervalMs,
        pageSize: appConfig.leaderboardSnapshotPageSize,
      },
      'Leaderboard snapshot worker started',
    );
    scheduleNextRun(1000);
  });

  app.addHook('onClose', async () => {
    stopped = true;
    clearTimer();
  });
}
