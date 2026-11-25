import { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useChecks } from '../hooks/use-checks.ts';
import { LatencyChart } from '../components/latency-chart.tsx';

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeParam = searchParams.get('range');
  const range = rangeParam === '7d' ? '7d' : '24h';

  const { history, loading, error, refresh } = useChecks(id || '', range);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const setRange = (newRange: '24h' | '7d') => {
    setSearchParams({ range: newRange });
  };

  if (!id) return <div>Invalid URL</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-wine/70 dark:text-rose/70 hover:text-wine dark:hover:text-rose mb-4"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="font-story text-3xl sm:text-4xl font-bold text-wine dark:text-rose">
            URL Performance Analytics
          </h1>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-rose/30 p-1 bg-surface/50 dark:bg-dark-card text-xs font-medium">
              <button
                onClick={() => setRange('24h')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                  range === '24h'
                    ? 'bg-wine text-surface dark:bg-rose dark:text-dark-bg'
                    : 'text-wine/70 dark:text-rose/70 hover:text-wine dark:hover:text-rose'
                }`}
              >
                Past 24h
              </button>
              <button
                onClick={() => setRange('7d')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                  range === '7d'
                    ? 'bg-wine text-surface dark:bg-rose dark:text-dark-bg'
                    : 'text-wine/70 dark:text-rose/70 hover:text-wine dark:hover:text-rose'
                }`}
              >
                Past 7d
              </button>
            </div>
            <button
              onClick={handleRefresh}
              aria-label="Refresh"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-rose/40 hover:bg-rose/10 text-wine dark:text-rose cursor-pointer"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-rose/20 bg-surface/30 dark:bg-dark-card/50 animate-pulse"
              />
            ))}
          </div>
          <div className="h-80 rounded-xl border border-rose/20 bg-surface/30 dark:bg-dark-card/50 animate-pulse" />
        </div>
      ) : (
        history && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-rose/30 bg-surface/50 dark:bg-dark-card">
                <span className="block text-xs uppercase font-mono text-wine/60 dark:text-rose/60 mb-1">
                  Uptime ({range})
                </span>
                <span className="text-3xl font-bold font-mono text-wine dark:text-rose">
                  {history.uptimePercent !== null ? `${history.uptimePercent}%` : '—'}
                </span>
              </div>
              <div className="p-5 rounded-xl border border-rose/30 bg-surface/50 dark:bg-dark-card">
                <span className="block text-xs uppercase font-mono text-wine/60 dark:text-rose/60 mb-1">
                  Average Latency
                </span>
                <span className="text-3xl font-bold font-mono text-wine dark:text-rose">
                  {history.averageLatencyMs !== null ? `${history.averageLatencyMs} ms` : '—'}
                </span>
              </div>
              <div className="p-5 rounded-xl border border-rose/30 bg-surface/50 dark:bg-dark-card">
                <span className="block text-xs uppercase font-mono text-wine/60 dark:text-rose/60 mb-1">
                  p95 Latency
                </span>
                <span className="text-3xl font-bold font-mono text-wine dark:text-rose">
                  {history.p95LatencyMs !== null ? `${history.p95LatencyMs} ms` : '—'}
                </span>
              </div>
            </div>

            {/* Latency Chart */}
            <div className="p-6 rounded-xl border border-rose/30 bg-surface/50 dark:bg-dark-card">
              <h2 className="font-story text-2xl font-bold text-wine dark:text-rose mb-1">
                Latency History
              </h2>
              <p className="text-xs text-wine/60 dark:text-rose/60 mb-4">
                Measured with monotonic precision clock. Failed checks produce gaps in the trend line.
              </p>
              <LatencyChart points={history.points} />
            </div>

            {/* Recent Failures */}
            <div className="p-6 rounded-xl border border-rose/30 bg-surface/50 dark:bg-dark-card">
              <h2 className="font-story text-2xl font-bold text-wine dark:text-rose mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v3m0 0h3m0-3h-3m-6 0a6 6 0 1 0 0 12a6 6 0 0 0 0-12z" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Recent Incidents & Failures
              </h2>
              {history.recentFailures.length === 0 ? (
                <p className="text-sm text-wine/60 dark:text-rose/60">
                  No incidents recorded in this timeframe. Everything is operating normally.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm font-mono">
                    <thead className="border-b border-rose/20 text-xs text-wine/60 dark:text-rose/60 uppercase">
                      <tr>
                        <th className="py-2 px-4">Time</th>
                        <th className="py-2 px-4">HTTP Status</th>
                        <th className="py-2 px-4">Error Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose/10">
                      {history.recentFailures.map((f, i) => (
                        <tr key={i} className="hover:bg-rose-500/5">
                          <td className="py-2 px-4 text-xs">
                            {new Date(f.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2 px-4 text-xs font-semibold text-rose-600 dark:text-rose-400">
                            {f.statusCode ?? '—'}
                          </td>
                          <td className="py-2 px-4 text-xs text-rose-600 dark:text-rose-400">
                            {f.error || 'Network Error'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
