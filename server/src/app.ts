import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { apiLimiter, authLimiter } from './middleware/rate-limit.js';
import { requireAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth-routes.js';
import { healthRouter } from './routes/health-routes.js';
import { internalRouter } from './routes/internal-routes.js';
import { urlRouter } from './routes/url-routes.js';

export function createApp(): express.Express {
  const app = express();
  app.enable('trust proxy'); // Trust X-Forwarded-For from Render/Vercel proxy
  app.disable('x-powered-by');
  app.use(helmet());
  const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          (origin.endsWith('.vercel.app') && allowedOrigins.some((o) => o.includes('vercel.app')))
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(mongoSanitize());
  app.use('/api', apiLimiter);
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/urls', requireAuth, urlRouter);
  app.use('/api/internal', internalRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
