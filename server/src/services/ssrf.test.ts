import { describe, expect, it, vi } from 'vitest';
import { checkUrl, validateUrl, type ResolvedAddress, type ResolveFn, type RequestFn, type ProbeResponse } from './ssrf.js';

function mockResolve(addresses: ResolvedAddress[]): ResolveFn {
  return vi.fn().mockResolvedValue(addresses);
}

function mockResolveFailing(error: Error): ResolveFn {
  return vi.fn().mockRejectedValue(error);
}

function publicIp(): ResolveFn {
  return mockResolve([{ address: '93.184.216.34', family: 4 }]);
}

function okResponse(): RequestFn {
  return vi.fn().mockResolvedValue({ statusCode: 200, headers: {} });
}

describe('validateUrl', () => {
  it('rejects non-http/https schemes', async () => {
    await expect(validateUrl('ftp://example.com')).rejects.toThrow('Only http and https URLs are allowed');
  });

  it('rejects URLs with embedded credentials', async () => {
    await expect(validateUrl('http://admin:pass@example.com', publicIp())).rejects.toThrow(
      'URLs with credentials are not allowed',
    );
  });

  it('rejects localhost', async () => {
    await expect(validateUrl('http://localhost:3000', publicIp())).rejects.toThrow('URL hostname is not allowed');
  });

  it('rejects 127.0.0.1', async () => {
    await expect(validateUrl('http://127.0.0.1')).rejects.toThrow('URL resolves to a blocked address');
  });

  it('rejects 169.254.169.254 (AWS metadata)', async () => {
    await expect(validateUrl('http://169.254.169.254')).rejects.toThrow('URL resolves to a blocked address');
  });

  it('rejects 10.x private range', async () => {
    const resolve = mockResolve([{ address: '10.0.0.1', family: 4 }]);
    await expect(validateUrl('http://internal.corp', resolve)).rejects.toThrow('URL resolves to a blocked address');
  });

  it('rejects 192.168.x private range', async () => {
    const resolve = mockResolve([{ address: '192.168.1.1', family: 4 }]);
    await expect(validateUrl('http://router.local', resolve)).rejects.toThrow();
  });

  it('rejects 172.16.x private range', async () => {
    const resolve = mockResolve([{ address: '172.16.0.1', family: 4 }]);
    await expect(validateUrl('http://internal.example.com', resolve)).rejects.toThrow(
      'URL resolves to a blocked address',
    );
  });

  it('rejects IPv6 loopback ::1', async () => {
    await expect(validateUrl('http://[::1]')).rejects.toThrow('URL resolves to a blocked address');
  });

  it('rejects IPv4-mapped IPv6', async () => {
    const resolve = mockResolve([{ address: '::ffff:127.0.0.1', family: 6 }]);
    await expect(validateUrl('http://evil.example.com', resolve)).rejects.toThrow(
      'URL resolves to a blocked address',
    );
  });

  it('rejects hostname resolving to private IP', async () => {
    const resolve = mockResolve([{ address: '192.168.0.1', family: 4 }]);
    await expect(validateUrl('http://looks-public.example.com', resolve)).rejects.toThrow(
      'URL resolves to a blocked address',
    );
  });

  it('rejects CGNAT range 100.64.0.0/10', async () => {
    const resolve = mockResolve([{ address: '100.100.0.1', family: 4 }]);
    await expect(validateUrl('http://cgnat.example.com', resolve)).rejects.toThrow(
      'URL resolves to a blocked address',
    );
  });

  it('rejects 0.0.0.0/8', async () => {
    await expect(validateUrl('http://0.0.0.0')).rejects.toThrow('URL resolves to a blocked address');
  });

  it('rejects fc00::/7 (unique local)', async () => {
    const resolve = mockResolve([{ address: 'fd12:3456:789a::1', family: 6 }]);
    await expect(validateUrl('http://ipv6.example.com', resolve)).rejects.toThrow(
      'URL resolves to a blocked address',
    );
  });

  it('rejects fe80::/10 (link-local IPv6)', async () => {
    const resolve = mockResolve([{ address: 'fe80::1', family: 6 }]);
    await expect(validateUrl('http://link-local.example.com', resolve)).rejects.toThrow(
      'URL resolves to a blocked address',
    );
  });

  it('rejects DNS failure', async () => {
    const error = new Error('DNS failed') as NodeJS.ErrnoException;
    error.code = 'ENOTFOUND';
    const resolve = mockResolveFailing(error);
    await expect(validateUrl('http://nonexistent.example.com', resolve)).rejects.toThrow(
      'URL hostname could not be resolved',
    );
  });

  it('allows a valid public URL', async () => {
    const resolve = publicIp();
    const target = await validateUrl('http://example.com', resolve);
    expect(target.ip).toBe('93.184.216.34');
    expect(target.family).toBe(4);
    expect(target.url.hostname).toBe('example.com');
  });

  it('strips the hash fragment', async () => {
    const resolve = publicIp();
    const target = await validateUrl('http://example.com/page#section', resolve);
    expect(target.url.hash).toBe('');
  });

  it('rejects .local domains', async () => {
    await expect(validateUrl('http://mybox.local')).rejects.toThrow('URL hostname is not allowed');
  });

  it('rejects metadata.google.internal', async () => {
    await expect(validateUrl('http://metadata.google.internal')).rejects.toThrow(
      'URL hostname is not allowed',
    );
  });
});

describe('checkUrl', () => {
  it('returns up for a 200 response', async () => {
    const resolve = publicIp();
    const request = okResponse();
    const result = await checkUrl('http://example.com', { resolve, request });
    expect(result.isUp).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.error).toBeNull();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns down for a 500 response', async () => {
    const resolve = publicIp();
    const request: RequestFn = vi.fn().mockResolvedValue({ statusCode: 500, headers: {} });
    const result = await checkUrl('http://example.com', { resolve, request });
    expect(result.isUp).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.error).toBe('HTTP_ERROR');
  });

  it('returns down on timeout', async () => {
    const resolve = publicIp();
    const timeoutError = new Error('TIMEOUT') as NodeJS.ErrnoException;
    timeoutError.code = 'TIMEOUT';
    const request: RequestFn = vi.fn().mockRejectedValue(timeoutError);
    const result = await checkUrl('http://example.com', { resolve, request });
    expect(result.isUp).toBe(false);
    expect(result.error).toBe('TIMEOUT');
    expect(result.statusCode).toBeNull();
  });

  it('falls back to GET on 405', async () => {
    const resolve = publicIp();
    const request: RequestFn = vi
      .fn()
      .mockResolvedValueOnce({ statusCode: 405, headers: {} } as ProbeResponse)
      .mockResolvedValueOnce({ statusCode: 200, headers: {} } as ProbeResponse);
    const result = await checkUrl('http://example.com', { resolve, request });
    expect(result.isUp).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('follows redirects and re-validates each target', async () => {
    const resolve = publicIp();
    const request: RequestFn = vi
      .fn()
      .mockResolvedValueOnce({
        statusCode: 301,
        headers: { location: 'http://example.com/new' },
      } as ProbeResponse)
      .mockResolvedValueOnce({ statusCode: 200, headers: {} } as ProbeResponse);
    const result = await checkUrl('http://example.com/old', { resolve, request });
    expect(result.isUp).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  it('blocks a redirect to a private IP', async () => {
    const resolve: ResolveFn = vi
      .fn()
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
      .mockResolvedValueOnce([{ address: '192.168.1.1', family: 4 }]);
    const request: RequestFn = vi.fn().mockResolvedValueOnce({
      statusCode: 302,
      headers: { location: 'http://internal.corp/' },
    } as ProbeResponse);
    const result = await checkUrl('http://example.com', { resolve, request });
    expect(result.isUp).toBe(false);
    expect(result.error).toBe('BLOCKED_TARGET');
  });

  it('returns error on too many redirects', async () => {
    const resolve = publicIp();
    const request: RequestFn = vi.fn().mockResolvedValue({
      statusCode: 301,
      headers: { location: 'http://example.com/loop' },
    } as ProbeResponse);
    const result = await checkUrl('http://example.com/start', { resolve, request });
    expect(result.isUp).toBe(false);
    expect(result.error).toBe('TOO_MANY_REDIRECTS');
  });

  it('returns DNS_FAILURE for blocked URL', async () => {
    const result = await checkUrl('http://localhost:3000');
    expect(result.isUp).toBe(false);
    expect(result.error).toBe('BLOCKED_TARGET');
  });

  it('returns CONNECTION_REFUSED on ECONNREFUSED', async () => {
    const resolve = publicIp();
    const connError = new Error('Connection refused') as NodeJS.ErrnoException;
    connError.code = 'ECONNREFUSED';
    const request: RequestFn = vi.fn().mockRejectedValue(connError);
    const result = await checkUrl('http://example.com', { resolve, request });
    expect(result.isUp).toBe(false);
    expect(result.error).toBe('CONNECTION_REFUSED');
  });

  it('never returns latencyMs as null for a successful check', async () => {
    const resolve = publicIp();
    const request = okResponse();
    const result = await checkUrl('http://example.com', { resolve, request });
    expect(result.latencyMs).not.toBeNull();
    expect(typeof result.latencyMs).toBe('number');
  });
});
