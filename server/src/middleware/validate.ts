import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../lib/app-error.js';

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request'));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request'));
      return;
    }
    res.locals.query = parsed.data;
    next();
  };
}
