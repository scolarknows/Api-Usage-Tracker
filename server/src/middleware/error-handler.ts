import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';

function isBodySyntaxError(err: unknown): boolean {
  return err instanceof SyntaxError && 'body' in err;
}

function isTooLarge(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'type' in err && err.type === 'entity.too.large';
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request' });
    return;
  }
  if (isBodySyntaxError(err)) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }
  if (isTooLarge(err)) {
    res.status(413).json({ error: 'Request body is too large' });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : 'Internal server error';
  res.status(500).json({ error: message });
};
