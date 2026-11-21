import { Router } from 'express';
import { loginHandler, meHandler, signupHandler } from '../controllers/auth-controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { credentialsSchema } from '../schemas/requests.js';

export const authRouter = Router();

authRouter.post('/signup', validateBody(credentialsSchema), signupHandler);
authRouter.post('/login', validateBody(credentialsSchema), loginHandler);
authRouter.get('/me', requireAuth, meHandler);
