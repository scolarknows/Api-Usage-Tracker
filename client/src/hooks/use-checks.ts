import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../api/client.ts';
import type { CheckHistory } from '../types/api.ts';

export function useChecks(urlId: string, range: '24h' | '7d') {
  const [history, setHistory] = useState<CheckHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const res = await apiClient.get<CheckHistory>(`/urls/${urlId}/checks`, {
          params: { range },
          signal: abortControllerRef.current.signal,
        });
        setHistory(res.data);
        setError(null);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setError('Failed to fetch check history');
        }
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [urlId, range],
  );

  useEffect(() => {
    void fetchHistory(true);
    const interval = setInterval(() => {
      void fetchHistory(false);
    }, 60_000);
    return () => {
      clearInterval(interval);
      abortControllerRef.current?.abort();
    };
  }, [fetchHistory]);

  return { history, loading, error, refresh: () => fetchHistory(false) };
}
