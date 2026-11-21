import type { RequestHandler } from 'express';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';
import { verifyToken } from '../services/token.js';
import type { AuthRequest } from '../types/auth-request.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'Authentication required'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token || header.includes('?token=')) {
    next(new AppError(401, 'Authentication required'));
    return;
  }
  try {
    (req as AuthRequest).user = verifyToken(token);
    next();
  } catch (error) {
    logger.warn({ err: error }, 'Rejected bearer token');
    next(new AppError(401, 'Authentication required'));
  }
};
