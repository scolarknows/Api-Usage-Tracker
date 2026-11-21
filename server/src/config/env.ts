import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).trim(),
  JWT_SECRET: z.string().min(16).trim(),
  CLIENT_ORIGIN: z.string().url().trim(),
  CRON_SECRET: z.string().min(16).trim(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

/** Fail fast when required environment variables are missing or invalid. */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'env').join(', ');
    throw new Error(`Invalid environment: ${fields}`);
  }
  return parsed.data;
}

export const env: Env = parseEnv(process.env);
