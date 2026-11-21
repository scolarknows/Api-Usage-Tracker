import { CHART_MAX_POINTS } from '../config/constants.js';
import type { CheckRecord } from '../types/records.js';

export interface ChartPoint {
  timestamp: string;
  latencyMs: number | null;
  isUp: boolean;
  statusCode: number | null;
  error: string | null;
}

export interface CheckHistory {
  range: '24h' | '7d';
  uptimePercent: number | null;
  averageLatencyMs: number | null;
  p95LatencyMs: number | null;
  points: ChartPoint[];
  recentFailures: ChartPoint[];
}

export function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

/** Nearest-rank percentile. Empty input returns null. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.min(sorted.length - 1, Math.max(0, rank));
  return sorted[index] ?? null;
}

function sampleEvenly<T>(items: readonly T[], maxPoints: number): T[] {
  if (items.length <= maxPoints) return [...items];
  const picked: T[] = [];
  const step = items.length / maxPoints;
  for (let index = 0; index < maxPoints; index += 1) {
    const item = items[Math.min(items.length - 1, Math.floor(index * step))];
    if (item !== undefined) picked.push(item);
  }
  return picked;
}

/** Keep failures visible and cap the series near 300 points. */
export function downsampleChecks(checks: readonly CheckRecord[], maxPoints: number): CheckRecord[] {
  if (checks.length <= maxPoints) return [...checks];
  const failures = checks.filter((check) => !check.isUp);
  const successes = checks.filter((check) => check.isUp);
  if (failures.length >= maxPoints) return sampleEvenly(checks, maxPoints);
  const sampled = sampleEvenly(successes, maxPoints - failures.length);
  return [...failures, ...sampled].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
}

function toPoint(check: CheckRecord): ChartPoint {
  return {
    timestamp: check.timestamp.toISOString(),
    latencyMs: check.isUp ? check.latencyMs : null,
    isUp: check.isUp,
    statusCode: check.statusCode,
    error: check.error,
  };
}

export function buildHistory(range: '24h' | '7d', checks: readonly CheckRecord[]): CheckHistory {
  const up = checks.filter((check) => check.isUp).length;
  const latencies = checks.flatMap((check) => (check.isUp && check.latencyMs !== null ? [check.latencyMs] : []));
  const points = downsampleChecks(checks, CHART_MAX_POINTS).map(toPoint);
  const recentFailures = checks
    .filter((check) => !check.isUp)
    .slice(-10)
    .reverse()
    .map(toPoint);
  return {
    range,
    uptimePercent: checks.length === 0 ? null : Math.round((up / checks.length) * 1000) / 10,
    averageLatencyMs: average(latencies),
    p95LatencyMs: percentile(latencies, 95),
    points,
    recentFailures,
  };
}
