import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runChecks, type Probe } from './monitor.js';
import { urlRepository } from '../repositories/url-repository.js';
import { checkRepository } from '../repositories/check-repository.js';
import type { UrlRecord, CheckRecord } from '../types/records.js';
import type { CheckOutcome } from './ssrf.js';

function fakeUrl(overrides: Partial<UrlRecord> = {}): UrlRecord {
  return {
    id: '000000000000000000000001',
    userId: '000000000000000000000099',
    url: 'https://example.com',
    name: 'Example',
    isActive: true,
    lastStatus: 'pending',
    lastLatencyMs: null,
    lastCheckedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('runChecks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('records an up check for a 200 response', async () => {
    vi.spyOn(urlRepository, 'listActive').mockResolvedValue([fakeUrl()]);
    const insertSpy = vi.spyOn(checkRepository, 'insert').mockResolvedValue({} as CheckRecord);
    vi.spyOn(urlRepository, 'updateLast').mockResolvedValue();

    const probe: Probe = vi.fn().mockResolvedValue({
      statusCode: 200,
      latencyMs: 42,
      isUp: true,
      error: null,
    } satisfies CheckOutcome);

    const result = await runChecks(probe);
    expect(result.ran).toBe(true);
    expect(result.checked).toBe(1);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isUp: true, statusCode: 200 }),
    );
  });

  it('records a down check for a timeout', async () => {
    vi.spyOn(urlRepository, 'listActive').mockResolvedValue([fakeUrl()]);
    const insertSpy = vi.spyOn(checkRepository, 'insert').mockResolvedValue({} as CheckRecord);
    vi.spyOn(urlRepository, 'updateLast').mockResolvedValue();

    const probe: Probe = vi.fn().mockResolvedValue({
      statusCode: null,
      latencyMs: null,
      isUp: false,
      error: 'TIMEOUT',
    } satisfies CheckOutcome);

    await runChecks(probe);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isUp: false, error: 'TIMEOUT', statusCode: null }),
    );
  });

  it('records a down check for non-2xx status', async () => {
    vi.spyOn(urlRepository, 'listActive').mockResolvedValue([fakeUrl()]);
    const insertSpy = vi.spyOn(checkRepository, 'insert').mockResolvedValue({} as CheckRecord);
    vi.spyOn(urlRepository, 'updateLast').mockResolvedValue();

    const probe: Probe = vi.fn().mockResolvedValue({
      statusCode: 503,
      latencyMs: 100,
      isUp: false,
      error: 'HTTP_ERROR',
    } satisfies CheckOutcome);

    await runChecks(probe);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ isUp: false, statusCode: 503, error: 'HTTP_ERROR' }),
    );
  });

  it('continues checking when one URL probe throws', async () => {
    const url1 = fakeUrl({ id: '000000000000000000000001', url: 'https://one.com' });
    const url2 = fakeUrl({ id: '000000000000000000000002', url: 'https://two.com' });
    vi.spyOn(urlRepository, 'listActive').mockResolvedValue([url1, url2]);
    const insertSpy = vi.spyOn(checkRepository, 'insert').mockResolvedValue({} as CheckRecord);
    vi.spyOn(urlRepository, 'updateLast').mockResolvedValue();

    let callCount = 0;
    const probe: Probe = vi.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) throw new Error('Unexpected crash');
      return Promise.resolve({
        statusCode: 200,
        latencyMs: 50,
        isUp: true,
        error: null,
      } satisfies CheckOutcome);
    });

    const result = await runChecks(probe);
    expect(result.ran).toBe(true);
    // Even if probe throws, it records an unexpectedFailure check result
    expect(result.checked).toBe(2);
    expect(insertSpy).toHaveBeenCalledTimes(2);
  });

  it('skips when already running', async () => {
    // Simulate a long-running check
    vi.spyOn(urlRepository, 'listActive').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([fakeUrl()]), 100)),
    );
    vi.spyOn(checkRepository, 'insert').mockResolvedValue({} as CheckRecord);
    vi.spyOn(urlRepository, 'updateLast').mockResolvedValue();

    const probe: Probe = vi.fn().mockResolvedValue({
      statusCode: 200,
      latencyMs: 10,
      isUp: true,
      error: null,
    } satisfies CheckOutcome);

    const first = runChecks(probe);
    const second = await runChecks(probe);
    expect(second.ran).toBe(false);
    await first;
  });

  it('reports checked=0 when there are no active URLs', async () => {
    vi.spyOn(urlRepository, 'listActive').mockResolvedValue([]);
    const probe: Probe = vi.fn();
    const result = await runChecks(probe);
    expect(result.ran).toBe(true);
    expect(result.checked).toBe(0);
    expect(probe).not.toHaveBeenCalled();
  });
});
