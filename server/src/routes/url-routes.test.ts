import { describe, expect, it, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../app.js';
import { resetAuthRateLimit } from '../middleware/rate-limit.js';

const app = createApp();
const request = supertest(app);

let tokenA: string;
let tokenB: string;

async function signupAndGetToken(user: { email: string; password: string }): Promise<string> {
  const res = await request.post('/api/auth/signup').send(user);
  return res.body.token as string;
}

async function addUrl(token: string, url: string, name?: string): Promise<supertest.Response> {
  const body: Record<string, string> = { url };
  if (name) body.name = name;
  return request.post('/api/urls').set('Authorization', `Bearer ${token}`).send(body);
}

beforeEach(async () => {
  resetAuthRateLimit();
  tokenA = await signupAndGetToken({ email: `a-${Date.now()}-${Math.random()}@example.com`, password: 'password123' });
  tokenB = await signupAndGetToken({ email: `b-${Date.now()}-${Math.random()}@example.com`, password: 'password456' });
});


describe('POST /api/urls', () => {
  it('adds a URL successfully', async () => {
    const res = await addUrl(tokenA, 'https://example.com');
    expect(res.status).toBe(201);
    expect(res.body.url).toBeDefined();
    expect(res.body.url.url).toBe('https://example.com/');
    expect(res.body.url.lastStatus).toBe('pending');
  });

  it('defaults name to hostname when no name given', async () => {
    const res = await addUrl(tokenA, 'https://example.com');
    expect(res.body.url.name).toBe('example.com');
  });

  it('uses the provided name', async () => {
    const res = await addUrl(tokenA, 'https://example.com', 'My Site');
    expect(res.body.url.name).toBe('My Site');
  });

  it('rejects the 6th URL with 400', async () => {
    const domains = ['google.com', 'github.com', 'cloudflare.com', 'microsoft.com', 'apple.com'];
    for (const domain of domains) {
      const res = await addUrl(tokenA, `https://${domain}`);
      expect(res.status).toBe(201);
    }
    const sixth = await addUrl(tokenA, 'https://mozilla.org');
    expect(sixth.status).toBe(400);
    expect(sixth.body.error).toMatch(/at most 5/i);
  });

  it('rejects duplicate URL for same user with 409', async () => {
    await addUrl(tokenA, 'https://example.com/dup');
    const res = await addUrl(tokenA, 'https://example.com/dup');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already monitored/i);
  });

  it('allows different users to add the same URL', async () => {
    const resA = await addUrl(tokenA, 'https://example.com/shared');
    const resB = await addUrl(tokenB, 'https://example.com/shared');
    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
  });

  it('rejects SSRF-blocked localhost URL', async () => {
    const res = await addUrl(tokenA, 'http://localhost:3000');
    expect(res.status).toBe(400);
  });

  it('rejects SSRF-blocked 169.254.169.254', async () => {
    const res = await addUrl(tokenA, 'http://169.254.169.254');
    expect(res.status).toBe(400);
  });

  it('rejects SSRF-blocked 127.0.0.1', async () => {
    const res = await addUrl(tokenA, 'http://127.0.0.1:8080');
    expect(res.status).toBe(400);
  });

  it('rejects non-http schemes', async () => {
    const res = await addUrl(tokenA, 'ftp://example.com/file');
    expect(res.status).toBe(400);
  });

  it('rejects request without auth', async () => {
    const res = await request.post('/api/urls').send({ url: 'https://example.com' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/urls', () => {
  it('lists only the authenticated user URLs', async () => {
    await addUrl(tokenA, 'https://example.com/a-only');
    await addUrl(tokenB, 'https://example.com/b-only');

    const resA = await request.get('/api/urls').set('Authorization', `Bearer ${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.urls).toHaveLength(1);
    expect(resA.body.urls[0].url).toBe('https://example.com/a-only');

    const resB = await request.get('/api/urls').set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(200);
    expect(resB.body.urls).toHaveLength(1);
    expect(resB.body.urls[0].url).toBe('https://example.com/b-only');
  });

  it('returns empty array when no URLs', async () => {
    const res = await request.get('/api/urls').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.urls).toHaveLength(0);
  });
});

describe('DELETE /api/urls/:id', () => {
  it('deletes own URL with 204', async () => {
    const addRes = await addUrl(tokenA, 'https://example.com/deleteme');
    const urlId = addRes.body.url.id as string;

    const res = await request.delete(`/api/urls/${urlId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(204);

    const listRes = await request.get('/api/urls').set('Authorization', `Bearer ${tokenA}`);
    expect(listRes.body.urls).toHaveLength(0);
  });

  it('user A cannot delete user B URL (returns 404)', async () => {
    const addRes = await addUrl(tokenB, 'https://example.com/b-secret');
    const urlId = addRes.body.url.id as string;

    const res = await request.delete(`/api/urls/${urlId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent URL', async () => {
    const res = await request.delete('/api/urls/000000000000000000000000').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});

describe('GET /api/urls/:id/checks', () => {
  it('user A cannot read user B URL checks (returns 404)', async () => {
    const addRes = await addUrl(tokenB, 'https://example.com/b-checks');
    const urlId = addRes.body.url.id as string;

    const res = await request.get(`/api/urls/${urlId}/checks`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  it('returns check history for own URL', async () => {
    const addRes = await addUrl(tokenA, 'https://example.com/own-checks');
    const urlId = addRes.body.url.id as string;

    const res = await request.get(`/api/urls/${urlId}/checks?range=24h`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.range).toBe('24h');
    expect(res.body.points).toEqual([]);
  });
});
