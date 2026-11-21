import cron from 'node-cron';
import { logger } from '../lib/logger.js';
import { runChecks } from '../services/monitor.js';

let task: cron.ScheduledTask | null = null;

/** Start the 5-minute monitor and run once immediately so a fresh server is not empty. */
export function startScheduler(): void {
  if (task) return;
  task = cron.schedule('*/5 * * * *', () => {
    void runChecks().catch((error: unknown) => {
      logger.error({ err: error }, 'Scheduled check run failed');
    });
  });
  void runChecks().catch((error: unknown) => {
    logger.error({ err: error }, 'Startup check run failed');
  });
}

export function stopScheduler(): void {
  task?.stop();
  task = null;
}
