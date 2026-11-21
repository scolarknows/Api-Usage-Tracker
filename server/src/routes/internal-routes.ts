import { Router } from 'express';
import { runChecksHandler } from '../controllers/internal-controller.js';

export const internalRouter = Router();

internalRouter.post('/run-checks', runChecksHandler);
