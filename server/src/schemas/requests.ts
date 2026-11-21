import { z } from 'zod';
import { MAX_NAME_LENGTH } from '../config/constants.js';

export const credentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

export const createUrlSchema = z.object({
  url: z.string().trim().min(1, 'URL is required').max(2048),
  name: z.string().trim().max(MAX_NAME_LENGTH, 'Name must be at most 60 characters').optional(),
});

export const rangeSchema = z.object({
  range: z.enum(['24h', '7d']).default('24h'),
});
