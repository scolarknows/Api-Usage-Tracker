import type { Response } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { currentUser, login, signup, type AuthResult } from '../services/auth.js';
import type { AuthRequest } from '../types/auth-request.js';
import type { credentialsSchema } from '../schemas/requests.js';
import type { z } from 'zod';

type Credentials = z.infer<typeof credentialsSchema>;

function sendAuth(res: Response, result: AuthResult): void {
  res.status(200).json(result);
}

export const signupHandler = asyncHandler(async (req, res) => {
  const body = req.body as Credentials;
  const result = await signup(body.email, body.password);
  res.status(201).json(result);
});

export const loginHandler = asyncHandler(async (req, res) => {
  const body = req.body as Credentials;
  sendAuth(res, await login(body.email, body.password));
});

export const meHandler = asyncHandler(async (req, res) => {
  const { user } = req as AuthRequest;
  const current = await currentUser(user.id);
  res.json({ user: current });
});
