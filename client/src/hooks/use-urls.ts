import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../api/client.ts';
import type { MonitoredUrl } from '../types/api.ts';

export function useUrls() {
  const [urls, setUrls] = useState<MonitoredUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchUrls = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await apiClient.get<{ urls: MonitoredUrl[] }>('/urls', {
        signal: abortControllerRef.current.signal,
      });
      setUrls(res.data.urls);
      setError(null);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'CanceledError') {
        setError('Failed to fetch monitored URLs');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUrls(true);
    const interval = setInterval(() => {
      void fetchUrls(false);
    }, 60_000);
    return () => {
      clearInterval(interval);
      abortControllerRef.current?.abort();
    };
  }, [fetchUrls]);

  return { urls, loading, error, refresh: () => fetchUrls(false) };
}
