import jwt from 'jsonwebtoken';
import { JWT_EXPIRES_IN_SECONDS } from '../config/constants.js';
import { env } from '../config/env.js';
import { AppError } from '../lib/app-error.js';

interface TokenPayload {
  email: string;
}

/** Sign a 7-day access token. The user id is the subject claim. */
export function signToken(id: string, email: string): string {
  const payload: TokenPayload = { email };
  return jwt.sign(payload, env.JWT_SECRET, { subject: id, expiresIn: JWT_EXPIRES_IN_SECONDS });
}

/** Verify a bearer token. Rejects query-string tokens before this is called. */
export function verifyToken(token: string): { id: string; email: string } {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
    throw new AppError(401, 'Authentication required');
  }
  return { id: payload.sub, email: payload.email };
}
