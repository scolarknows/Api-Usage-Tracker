export type UrlStatus = 'up' | 'down' | 'pending';

export interface User {
  id: string;
  email: string;
}

export interface MonitoredUrl {
  id: string;
  userId: string;
  url: string;
  name: string;
  isActive: boolean;
  lastStatus: UrlStatus;
  lastLatencyMs: number | null;
  lastCheckedAt: string | null;
  createdAt: string;
  uptime24h: number | null;
}

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
