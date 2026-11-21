import { describe, expect, it, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app.js';
import { resetAuthRateLimit } from '../middleware/rate-limit.js';

const app = createApp();
const request = supertest(app);

const TEST_USER = { email: 'auth-test@example.com', password: 'securepass123' };
let token: string;

beforeEach(() => {
  resetAuthRateLimit();
});

describe('POST /api/auth/signup', () => {
  it('creates an account and returns a token', async () => {
    const res = await request.post('/api/auth/signup').send(TEST_USER);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user.id).toBeDefined();
    token = res.body.token as string;
  });

  it('rejects duplicate email with 409', async () => {
    await request.post('/api/auth/signup').send(TEST_USER);
    const res = await request.post('/api/auth/signup').send(TEST_USER);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('rejects short password with 400', async () => {
    const res = await request.post('/api/auth/signup').send({ email: 'short@test.com', password: '1234' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8/i);
  });

  it('rejects invalid email with 400', async () => {
    const res = await request.post('/api/auth/signup').send({ email: 'not-an-email', password: 'securepass123' });
    expect(res.status).toBe(400);
  });

  it('rejects empty body with 400', async () => {
    const res = await request.post('/api/auth/signup').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request.post('/api/auth/signup').send(TEST_USER);
  });

  it('returns a token for valid credentials', async () => {
    const res = await request.post('/api/auth/login').send(TEST_USER);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  it('returns 401 for wrong password with generic message', async () => {
    const res = await request.post('/api/auth/login').send({ email: TEST_USER.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 401 for non-existent email with same generic message', async () => {
    const res = await request
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'anypassword123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(async () => {
    const res = await request.post('/api/auth/signup').send(TEST_USER);
    token = res.body.token as string;
  });

  it('returns current user with valid token', async () => {
    const res = await request.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user.id).toBeDefined();
  });

  it('returns 401 without a token', async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await request.get('/api/auth/me').set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed Authorization header', async () => {
    const res = await request.get('/api/auth/me').set('Authorization', 'Token abc');
    expect(res.status).toBe(401);
  });
});

