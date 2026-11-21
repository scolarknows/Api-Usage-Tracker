export type UrlStatus = 'up' | 'down' | 'pending';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UrlRecord {
  id: string;
  userId: string;
  url: string;
  name: string;
  isActive: boolean;
  lastStatus: UrlStatus;
  lastLatencyMs: number | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
}

export interface CheckRecord {
  id: string;
  urlId: string;
  timestamp: Date;
  statusCode: number | null;
  latencyMs: number | null;
  isUp: boolean;
  error: string | null;
}

export interface NewCheck {
  urlId: string;
  timestamp: Date;
  statusCode: number | null;
  latencyMs: number | null;
  isUp: boolean;
  error: string | null;
}

export interface UrlSummary extends UrlRecord {
  uptime24h: number | null;
}
