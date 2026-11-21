import { CHECK_CONCURRENCY } from '../config/constants.js';
import { logger } from '../lib/logger.js';
import { mapWithConcurrency } from '../lib/pool.js';
import { checkRepository } from '../repositories/check-repository.js';
import { urlRepository } from '../repositories/url-repository.js';
import { checkUrl, type CheckOutcome } from './ssrf.js';

export type Probe = (url: string) => Promise<CheckOutcome>;

export interface RunResult {
  ran: boolean;
  checked: number;
}

let running = false;

function unexpectedFailure(): CheckOutcome {
  return { statusCode: null, latencyMs: null, isUp: false, error: 'NETWORK_ERROR' };
}

/** Check every active URL. A run already in progress is skipped. */
export async function runChecks(probe: Probe = checkUrl): Promise<RunResult> {
  if (running) return { ran: false, checked: 0 };
  running = true;
  let checked = 0;
  try {
    const urls = await urlRepository.listActive();
    await mapWithConcurrency(urls, CHECK_CONCURRENCY, async (url) => {
      let result: CheckOutcome;
      try {
        result = await probe(url.url);
      } catch (error) {
        logger.error({ err: error, urlId: url.id }, 'URL check failed');
        result = unexpectedFailure();
      }
      try {
        const checkedAt = new Date();
        await checkRepository.insert({
          urlId: url.id,
          timestamp: checkedAt,
          statusCode: result.statusCode,
          latencyMs: result.latencyMs,
          isUp: result.isUp,
          error: result.error,
        });
        await urlRepository.updateLast(url.id, {
          lastStatus: result.isUp ? 'up' : 'down',
          lastLatencyMs: result.isUp ? result.latencyMs : result.latencyMs,
          lastCheckedAt: checkedAt,
        });
        checked += 1;
      } catch (error) {
        logger.error({ err: error, urlId: url.id }, 'Failed to store check');
      }
    });
    return { ran: true, checked };
  } finally {
    running = false;
  }
}
