import { describe, expect, it } from 'vitest';
import { average, percentile, downsampleChecks, buildHistory } from './check-stats.js';
import type { CheckRecord } from '../types/records.js';

function makeCheck(overrides: Partial<CheckRecord> = {}): CheckRecord {
  return {
    id: '000000000000000000000001',
    urlId: '000000000000000000000010',
    timestamp: new Date(),
    statusCode: 200,
    latencyMs: 100,
    isUp: true,
    error: null,
    ...overrides,
  };
}

describe('average', () => {
  it('returns null for empty array', () => {
    expect(average([])).toBeNull();
  });

  it('returns average rounded to nearest integer', () => {
    expect(average([10, 20, 30])).toBe(20);
    expect(average([33, 34])).toBe(34); // 33.5 rounds to 34
  });
});

describe('percentile', () => {
  it('returns null for empty array', () => {
    expect(percentile([], 95)).toBeNull();
  });

  it('returns p95 of a sorted set', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(values, 95)).toBe(95);
  });

  it('works with a single value', () => {
    expect(percentile([42], 95)).toBe(42);
  });
});

describe('downsampleChecks', () => {
  it('returns all checks when under the limit', () => {
    const checks = [makeCheck(), makeCheck()];
    const result = downsampleChecks(checks, 300);
    expect(result).toHaveLength(2);
  });

  it('limits to maxPoints', () => {
    const checks = Array.from({ length: 500 }, (_, i) =>
      makeCheck({ timestamp: new Date(Date.now() + i * 1000) }),
    );
    const result = downsampleChecks(checks, 300);
    expect(result.length).toBeLessThanOrEqual(300);
  });

  it('preserves failures in downsampled output', () => {
    const checks: CheckRecord[] = [
      ...Array.from({ length: 400 }, (_, i) =>
        makeCheck({ timestamp: new Date(Date.now() + i * 1000) }),
      ),
      makeCheck({
        isUp: false,
        statusCode: 500,
        latencyMs: null,
        error: 'HTTP_ERROR',
        timestamp: new Date(Date.now() + 500000),
      }),
    ];
    const result = downsampleChecks(checks, 300);
    const failures = result.filter((c) => !c.isUp);
    expect(failures).toHaveLength(1);
  });
});

describe('buildHistory', () => {
  it('returns null stats for empty checks', () => {
    const result = buildHistory('24h', []);
    expect(result.uptimePercent).toBeNull();
    expect(result.averageLatencyMs).toBeNull();
    expect(result.p95LatencyMs).toBeNull();
    expect(result.points).toHaveLength(0);
    expect(result.recentFailures).toHaveLength(0);
  });

  it('computes uptime and latency stats', () => {
    const checks = [
      makeCheck({ latencyMs: 100 }),
      makeCheck({ latencyMs: 200 }),
      makeCheck({ isUp: false, latencyMs: null, statusCode: 500, error: 'HTTP_ERROR' }),
    ];
    const result = buildHistory('24h', checks);
    expect(result.uptimePercent).toBeCloseTo(66.7, 0);
    expect(result.averageLatencyMs).toBe(150);
    expect(result.recentFailures).toHaveLength(1);
  });

  it('uses null latency for failed checks in points', () => {
    const checks = [
      makeCheck({ isUp: false, latencyMs: null, statusCode: null, error: 'TIMEOUT' }),
    ];
    const result = buildHistory('24h', checks);
    expect(result.points[0]?.latencyMs).toBeNull();
  });
});
