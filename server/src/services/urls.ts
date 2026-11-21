import { MAX_NAME_LENGTH, MAX_URLS_PER_USER } from '../config/constants.js';
import { AppError } from '../lib/app-error.js';
import { checkRepository } from '../repositories/check-repository.js';
import { urlRepository } from '../repositories/url-repository.js';
import type { UrlSummary } from '../types/records.js';
import { UrlRejectedError, validateUrl, type ResolveFn } from './ssrf.js';
import { buildHistory, type CheckHistory } from './check-stats.js';

export interface AddUrlInput {
  userId: string;
  url: string;
  name?: string | undefined;
}

/** Trim, drop the fragment, and keep only http(s) URLs without credentials. */
export function normalizeUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new AppError(400, 'URL is invalid');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AppError(400, 'Only http and https URLs are allowed');
  }
  if (url.username !== '' || url.password !== '') {
    throw new AppError(400, 'URLs with credentials are not allowed');
  }
  url.hash = '';
  return url.toString();
}

/** Add a monitored URL after the SSRF check and the 5-URL cap. */
export async function addUrl(input: AddUrlInput, resolve?: ResolveFn): Promise<UrlSummary> {
  const url = normalizeUrl(input.url);
  const name = (input.name ?? '').trim();
  if (name.length > MAX_NAME_LENGTH) throw new AppError(400, 'Name must be at most 60 characters');
  try {
    await validateUrl(url, resolve);
  } catch (error) {
    if (error instanceof UrlRejectedError) throw new AppError(400, error.message);
    throw error;
  }
  const count = await urlRepository.countByUser(input.userId);
  if (count >= MAX_URLS_PER_USER) throw new AppError(400, 'You can monitor at most 5 URLs');
  const created = await urlRepository.create({
    userId: input.userId,
    url,
    name: name.length > 0 ? name : new URL(url).hostname,
  });
  if (!created) throw new AppError(409, 'This URL is already monitored');
  return { ...created, uptime24h: null };
}

/** List the caller's URLs with a 24-hour uptime percentage. */
export async function listUrls(userId: string, now: Date): Promise<UrlSummary[]> {
  const urls = await urlRepository.listByUser(userId);
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const summaries: UrlSummary[] = [];
  for (const url of urls) {
    const counts = await checkRepository.countWindow(url.id, since);
    const uptime24h = counts.total === 0 ? null : Math.round((counts.up / counts.total) * 1000) / 10;
    summaries.push({ ...url, uptime24h });
  }
  return summaries;
}

/** Delete a URL and its check history. Another user's id returns 404. */
export async function deleteUrl(userId: string, urlId: string): Promise<void> {
  const existing = await urlRepository.findByIdForUser(urlId, userId);
  if (!existing) throw new AppError(404, 'URL not found');
  await checkRepository.deleteByUrl(urlId);
  const deleted = await urlRepository.deleteForUser(urlId, userId);
  if (!deleted) throw new AppError(404, 'URL not found');
}

/** Load chart history for a URL the caller owns. */
export async function getCheckHistory(userId: string, urlId: string, range: '24h' | '7d', now: Date): Promise<CheckHistory> {
  const existing = await urlRepository.findByIdForUser(urlId, userId);
  if (!existing) throw new AppError(404, 'URL not found');
  const hours = range === '24h' ? 24 : 24 * 7;
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const checks = await checkRepository.listSince(urlId, since);
  return buildHistory(range, checks);
}
