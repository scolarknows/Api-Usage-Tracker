import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['./src/test/setup.ts'],
    hookTimeout: 60000,
    testTimeout: 30000,
    env: {
      MONGODB_URI: 'mongodb://127.0.0.1:27017/test_uptime',
      JWT_SECRET: 'test-jwt-secret-at-least-16-chars',
      CLIENT_ORIGIN: 'http://localhost:5173',
      CRON_SECRET: 'test-cron-secret-at-least-16-chars',
      NODE_ENV: 'test',
    },
  },
});

