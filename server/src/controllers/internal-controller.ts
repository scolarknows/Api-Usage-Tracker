import { env } from '../config/env.js';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/app-error.js';
import { secretsMatch } from '../lib/secret.js';
import { runChecks } from '../services/monitor.js';

export const runChecksHandler = asyncHandler(async (req, res) => {
  const provided = req.header('x-cron-secret') ?? req.query.cron_secret;
  if (!secretsMatch(provided as string | undefined, env.CRON_SECRET)) {
    throw new AppError(401, 'Unauthorized');
  }
  const result = await runChecks();
  res.json({ ok: true, ran: result.ran, checked: result.checked });
});
