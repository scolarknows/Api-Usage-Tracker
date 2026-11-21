import bcrypt from 'bcrypt';
import { BCRYPT_COST } from '../config/constants.js';
import { AppError } from '../lib/app-error.js';
import { userRepository } from '../repositories/user-repository.js';
import { signToken } from './token.js';

const LOGIN_ERROR = 'Invalid email or password';
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO.1n1nQhQhQhQhQhQhQhQhQhQhQhQhQ';

export interface AuthResult {
  token: string;
  user: { id: string; email: string };
}

/** Create an account and return a JWT. Email is stored lowercase. */
export async function signup(email: string, password: string): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await userRepository.create(normalized, passwordHash);
  if (!user) throw new AppError(409, 'Email is already registered');
  return { token: signToken(user.id, user.email), user: { id: user.id, email: user.email } };
}

/** Verify credentials. The error does not reveal whether the email exists. */
export async function login(email: string, password: string): Promise<AuthResult> {
  const normalized = email.trim().toLowerCase();
  const user = await userRepository.findByEmail(normalized);
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const matches = await bcrypt.compare(password, hash);
  if (!user || !matches) throw new AppError(401, LOGIN_ERROR);
  return { token: signToken(user.id, user.email), user: { id: user.id, email: user.email } };
}

/** Return the current user when the account still exists. */
export async function currentUser(id: string): Promise<{ id: string; email: string }> {
  const user = await userRepository.findById(id);
  if (!user) throw new AppError(401, 'Authentication required');
  return { id: user.id, email: user.email };
}
