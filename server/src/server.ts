import { createServer, type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/connection.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';
import { logger } from './lib/logger.js';

const app = createApp();
const server: Server = createServer(app);
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  stopScheduler();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  await disconnectMongo();
  process.exit(0);
}

function registerProcessHandlers(): void {
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

export async function start(): Promise<void> {
  registerProcessHandlers();
  await connectMongo();
  startScheduler();
  await new Promise<void>((resolve) => {
    server.listen(env.PORT, () => resolve());
  });
  logger.info({ port: env.PORT }, 'Server listening');
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  start().catch((error: unknown) => {
    logger.error({ err: error }, 'Server failed to start');
    process.exit(1);
  });
}
