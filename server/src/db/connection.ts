import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const MAX_ATTEMPTS = 5;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Connect to MongoDB, retrying transient startup failures. */
export async function connectMongo(): Promise<void> {
  mongoose.set('strictQuery', true);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      logger.info('MongoDB connected');
      return;
    } catch (error) {
      logger.error({ err: error, attempt }, 'MongoDB connection failed');
      if (attempt === MAX_ATTEMPTS) throw error;
      await delay(500 * attempt);
    }
  }
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}
