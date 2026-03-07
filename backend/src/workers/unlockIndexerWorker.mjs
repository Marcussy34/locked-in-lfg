import { appConfig } from '../config.mjs';
import { hasDatabase } from '../lib/db.mjs';
import { hasLockVaultReadConfig } from '../lib/lockVault.mjs';
import { syncUnlockReceiptsFromChain } from '../modules/progress/repository.mjs';

export function registerUnlockIndexerWorker(app) {
  let timer = null;
  let stopped = false;
  let inFlight = false;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function scheduleNextRun(delayMs = appConfig.unlockIndexerIntervalMs) {
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
      const result = await syncUnlockReceiptsFromChain(appConfig.unlockIndexerScanLimit);
      if (result.scanned > 0 || result.recorded > 0 || result.skipped > 0) {
        app.log.info(
          {
            scanned: result.scanned,
            recorded: result.recorded,
            skipped: result.skipped,
            lastSignature: result.lastSignature ?? null,
          },
          'unlock_indexer.cycle_complete',
        );
      }
    } catch (error) {
      app.log.error({ err: error }, 'unlock_indexer.cycle_failed');
    } finally {
      inFlight = false;
      scheduleNextRun();
    }
  }

  app.addHook('onReady', async () => {
    if (!appConfig.unlockIndexerEnabled) {
      app.log.info('Unlock indexer worker disabled');
      return;
    }

    if (!hasDatabase()) {
      app.log.warn('Unlock indexer worker disabled because database is not configured');
      return;
    }

    if (!hasLockVaultReadConfig()) {
      app.log.warn('Unlock indexer worker disabled because LockVault read config is incomplete');
      return;
    }

    app.log.info(
      {
        intervalMs: appConfig.unlockIndexerIntervalMs,
        scanLimit: appConfig.unlockIndexerScanLimit,
      },
      'Unlock indexer worker started',
    );
    scheduleNextRun(1000);
  });

  app.addHook('onClose', async () => {
    stopped = true;
    clearTimer();
  });
}
