import { promises as dns } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import { CHECK_TIMEOUT_MS, MAX_REDIRECTS, USER_AGENT } from '../config/constants.js';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.internal',
]);

const blockedRanges = new BlockList();
const ipv4Ranges: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

for (const [address, prefix] of ipv4Ranges) {
  blockedRanges.addSubnet(address, prefix, 'ipv4');
}
blockedRanges.addAddress('::1', 'ipv6');
blockedRanges.addAddress('::', 'ipv6');
blockedRanges.addSubnet('fc00::', 7, 'ipv6');
blockedRanges.addSubnet('fe80::', 10, 'ipv6');
blockedRanges.addSubnet('ff00::', 8, 'ipv6');

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export type ResolveFn = (hostname: string) => Promise<ResolvedAddress[]>;

export interface ProbeRequest {
  url: URL;
  ip: string;
  family: 4 | 6;
  method: 'HEAD' | 'GET';
  timeoutMs: number;
}

export interface ProbeResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
}

export type RequestFn = (input: ProbeRequest) => Promise<ProbeResponse>;

export interface SafeTarget {
  url: URL;
  ip: string;
  family: 4 | 6;
}

export interface CheckOutcome {
  statusCode: number | null;
  latencyMs: number | null;
  isUp: boolean;
  error: string | null;
}

export class UrlRejectedError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'UrlRejectedError';
    this.code = code;
  }
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  return false;
}

function isIpv4Mapped(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized.startsWith('::ffff:') || normalized.startsWith('0:0:0:0:0:ffff:');
}

function isBlockedIp(address: string): boolean {
  if (isIpv4Mapped(address)) return true;
  const version = isIP(address);
  if (version === 0) return true;
  return blockedRanges.check(address, version === 6 ? 'ipv6' : 'ipv4');
}

/** Resolve a hostname to every A and AAAA record. IP literals are returned as-is. */
export async function defaultResolve(hostname: string): Promise<ResolvedAddress[]> {
  const literal = isIP(hostname);
  if (literal === 4) return [{ address: hostname, family: 4 }];
  if (literal === 6) return [{ address: hostname, family: 6 }];

  const ignored = (error: unknown): boolean => {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
    return code === 'ENODATA' || code === 'ENOTFOUND' || code === 'EAI_AGAIN';
  };

  let v4: string[] = [];
  let v6: string[] = [];
  try {
    v4 = await dns.resolve4(hostname);
  } catch (error) {
    if (!ignored(error)) throw error;
  }
  try {
    v6 = await dns.resolve6(hostname);
  } catch (error) {
    if (!ignored(error)) throw error;
  }
  if (v4.length === 0 && v6.length === 0) {
    throw new UrlRejectedError('DNS_FAILURE', 'URL hostname could not be resolved');
  }
  return [
    ...v4.map((address) => ({ address, family: 4 as const })),
    ...v6.map((address) => ({ address, family: 6 as const })),
  ];
}

/** Reject schemes, credentials, internal hostnames, and non-public resolved addresses. */
export async function validateUrl(raw: string, resolve: ResolveFn = defaultResolve): Promise<SafeTarget> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new UrlRejectedError('INVALID_URL', 'URL is invalid');
  }
  url.hash = '';
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UrlRejectedError('INVALID_URL', 'Only http and https URLs are allowed');
  }
  if (url.username !== '' || url.password !== '') {
    throw new UrlRejectedError('BLOCKED_TARGET', 'URLs with credentials are not allowed');
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (isBlockedHostname(hostname)) {
    throw new UrlRejectedError('BLOCKED_TARGET', 'URL hostname is not allowed');
  }

  const literal = isIP(hostname);
  let addresses: ResolvedAddress[];
  if (literal === 4 || literal === 6) {
    addresses = [{ address: hostname, family: literal }];
  } else {
    try {
      addresses = await resolve(hostname);
    } catch (error) {
      if (error instanceof UrlRejectedError) throw error;
      throw new UrlRejectedError('DNS_FAILURE', 'URL hostname could not be resolved');
    }
  }
  if (addresses.length === 0) {
    throw new UrlRejectedError('DNS_FAILURE', 'URL hostname could not be resolved');
  }
  for (const address of addresses) {
    if (isBlockedIp(address.address)) {
      throw new UrlRejectedError('BLOCKED_TARGET', 'URL resolves to a blocked address');
    }
  }
  const chosen = addresses[0];
  if (!chosen) {
    throw new UrlRejectedError('DNS_FAILURE', 'URL hostname could not be resolved');
  }
  return { url, ip: chosen.address, family: chosen.family };
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return '';
}

function mapNetworkCode(code: string): string {
  if (code === 'TIMEOUT' || code === 'ETIMEDOUT' || code === 'ECONNABORTED') return 'TIMEOUT';
  if (code === 'ECONNREFUSED') return 'CONNECTION_REFUSED';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ENODATA' || code === 'DNS_FAILURE') return 'DNS_FAILURE';
  if (code === 'BLOCKED_TARGET' || code === 'INVALID_URL' || code === 'TOO_MANY_REDIRECTS') return code;
  return 'NETWORK_ERROR';
}

function outcome(started: number, statusCode: number | null, isUp: boolean, error: string | null): CheckOutcome {
  return {
    statusCode,
    latencyMs: Math.max(0, Math.round(performance.now() - started)),
    isUp,
    error,
  };
}

/** Perform one guarded request. The TCP connection uses the already validated IP. */
export function defaultRequest(input: ProbeRequest): Promise<ProbeResponse> {
  const isHttps = input.url.protocol === 'https:';
  const port = input.url.port === '' ? (isHttps ? 443 : 80) : Number(input.url.port);
  const options: https.RequestOptions = {
    host: input.ip,
    port,
    method: input.method,
    path: `${input.url.pathname}${input.url.search}`,
    headers: {
      Host: input.url.host,
      'User-Agent': USER_AGENT,
      Accept: '*/*',
      Connection: 'close',
    },
    timeout: input.timeoutMs,
    servername: isHttps ? input.url.hostname : undefined,
  };
  const transport = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(options, (res) => {
      res.resume();
      res.on('end', () => {
        resolve({ statusCode: res.statusCode ?? 0, headers: res.headers });
      });
    });
    req.setTimeout(input.timeoutMs, () => {
      const error = new Error('TIMEOUT') as NodeJS.ErrnoException;
      error.code = 'TIMEOUT';
      req.destroy(error);
    });
    req.on('error', reject);
    req.end();
  });
}

function headerValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

function isRedirect(statusCode: number): boolean {
  return statusCode === 301 || statusCode === 302 || statusCode === 303 || statusCode === 307 || statusCode === 308;
}

export interface CheckDeps {
  resolve?: ResolveFn;
  request?: RequestFn;
}

/**
 * Check a user-supplied URL. Redirects are followed only after each target is validated again.
 */
export async function checkUrl(raw: string, deps: CheckDeps = {}): Promise<CheckOutcome> {
  const started = performance.now();
  const resolve = deps.resolve ?? defaultResolve;
  const request = deps.request ?? defaultRequest;
  let current = raw;
  let method: 'HEAD' | 'GET' = 'HEAD';
  let usedGet = false;
  let redirects = 0;

  try {
    while (redirects <= MAX_REDIRECTS) {
      const target = await validateUrl(current, resolve);
      const response = await request({
        url: target.url,
        ip: target.ip,
        family: target.family,
        method,
        timeoutMs: CHECK_TIMEOUT_MS,
      });
      if ((response.statusCode === 405 || response.statusCode === 501) && method === 'HEAD' && !usedGet) {
        method = 'GET';
        usedGet = true;
        continue;
      }
      if (isRedirect(response.statusCode)) {
        const location = headerValue(response.headers.location);
        if (!location) return outcome(started, response.statusCode, false, 'BAD_REDIRECT');
        redirects += 1;
        if (redirects > MAX_REDIRECTS) return outcome(started, response.statusCode, false, 'TOO_MANY_REDIRECTS');
        current = new URL(location, target.url).toString();
        if (response.statusCode === 303) method = 'GET';
        continue;
      }
      const isUp = response.statusCode >= 200 && response.statusCode <= 399;
      return outcome(started, response.statusCode, isUp, isUp ? null : 'HTTP_ERROR');
    }
    return outcome(started, null, false, 'TOO_MANY_REDIRECTS');
  } catch (error) {
    if (error instanceof UrlRejectedError) {
      return outcome(started, null, false, error.code);
    }
    return outcome(started, null, false, mapNetworkCode(errorCode(error)));
  }
}
