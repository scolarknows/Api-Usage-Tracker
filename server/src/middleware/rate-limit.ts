import type { RequestHandler } from 'express';
import { MemoryStore, rateLimit } from 'express-rate-limit';
import { API_RATE_LIMIT, AUTH_RATE_LIMIT, AUTH_WINDOW_MS } from '../config/constants.js';

const authStore = new MemoryStore();

function tooMany(_req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]): void {
  res.status(429).json({ error: 'Too many requests' });
}

export const apiLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  limit: API_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
});

export const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  limit: AUTH_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  store: authStore,
  handler: tooMany,
});

export function resetAuthRateLimit(): void {
  authStore.resetAll();
}
