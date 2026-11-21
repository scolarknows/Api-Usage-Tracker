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
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN }));
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
