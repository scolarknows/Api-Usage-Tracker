import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { useUrls } from '../hooks/use-urls.ts';
import { StatusBadge } from '../components/status-badge.tsx';
import { AddUrlModal } from '../components/add-url-modal.tsx';
import { DeleteUrlModal } from '../components/delete-url-modal.tsx';
import { formatRelativeTime } from '../lib/date.ts';
import type { MonitoredUrl } from '../types/api.ts';

export function DashboardPage() {
  const { urls, loading, error, refresh } = useUrls();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<MonitoredUrl | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-story text-3xl sm:text-4xl font-bold text-wine dark:text-rose">
            Monitored URLs
          </h1>
          <p className="text-sm text-wine/70 dark:text-rose/70 mt-1">
            Background checks run every 5 minutes. {urls.length}/5 slots used.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative inline-flex items-center justify-center rounded-lg border border-rose/40 hover:bg-rose/10 text-wine dark:text-rose cursor-pointer">
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 11a9 9 0 0 1 9-9h.01m5.97-4.59A2.97 2.97 0 0 1 12 2.94a2.97 2.97 0 0 1 2.06 1.43l2.12 2.12m15.73-8.27a2.97 2.97 0 0 1 0 4.24l-2.12 2.12m0 0a2.97 2.97 0 0 1-4.24 0l-2.12-2.12m2.12 5.75h.01m6.36-9.37a3 3 0 1 0 0 6a3 3 0 0 0-6 0" />
            </svg>
            <span className="absolute -inset-0.5 rounded-lg border-2 border-transparent bg-rose/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            disabled={urls.length >= 5}
            className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] rounded-lg bg-wine text-surface hover:bg-wine/90 dark:bg-rose dark:text-dark-bg dark:hover:bg-rose/90 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Plus size={18} />
            Add URL
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-rose/20 bg-surface/30 dark:bg-dark-card/50 animate-pulse"
            />
          ))}
        </div>
      ) : urls.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-rose/40 bg-surface/20 dark:bg-dark-card/30">
          <h3 className="font-story text-2xl font-bold mb-2">No URLs yet</h3>
          <p className="text-sm text-wine/70 dark:text-rose/70 mb-6 max-w-sm mx-auto">
            Add your first API endpoint or website to start tracking uptime and latency.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-5 py-2.5 min-h-[44px] rounded-lg bg-wine text-surface hover:bg-wine/90 dark:bg-rose dark:text-dark-bg dark:hover:bg-rose/90 text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            Add your first URL
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-rose/30 bg-surface/40 dark:bg-dark-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-rose/20 bg-rose/5 dark:bg-dark-surface/50 text-xs font-semibold uppercase tracking-wider text-wine/80 dark:text-rose/80">
                <tr>
                  <th className="px-6 py-4">Name & URL</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Latency</th>
                  <th className="px-6 py-4">24h Uptime</th>
                  <th className="px-6 py-4">Last Checked</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose/20">
                {urls.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-rose/5 dark:hover:bg-dark-surface/30 transition-colors"
                    style={{ borderWidth: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                  >
                    <td className="px-6 py-4">
                      <Link to={`/urls/${u.id}`} className="block group">
                        <div className="font-semibold text-wine dark:text-rose group-hover:underline">
                          {u.name}
                        </div>
                        <div className="text-xs font-mono text-wine/60 dark:text-rose/60 truncate max-w-xs">
                          {u.url}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={u.lastStatus} />
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {u.lastLatencyMs !== null ? `${u.lastLatencyMs} ms` : '—'}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {u.uptime24h !== null ? `${u.uptime24h}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-wine/70 dark:text-rose/70 font-mono">
                      {formatRelativeTime(u.lastCheckedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/urls/${u.id}`}
                          aria-label={`View ${u.name} details`}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-rose/10 text-wine dark:text-rose cursor-pointer"
                        >
                          <ExternalLink size={16} />
                        </Link>
                        <button
                          onClick={() => setDeletingUrl(u)}
                          aria-label={`Delete ${u.name}`}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden space-y-4">
            {urls.map((u) => (
              <div
                key={u.id}
                className="p-5 rounded-xl border-2 border-rose/30 bg-surface/50 dark:bg-dark-card shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/urls/${u.id}`} className="block flex-1 min-w-0">
                    <h3 className="font-semibold text-wine dark:text-rose truncate hover:underline text-base">
                      {u.name}
                    </h3>
                    <p className="text-xs font-mono text-wine/60 dark:text-rose/60 truncate mt-0.5">
                      {u.url}
                    </p>
                  </Link>
                  <StatusBadge status={u.lastStatus} />
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-rose/20 text-xs font-mono">
                  <div>
                    <span className="block text-wine/60 dark:text-rose/60 text-[10px] uppercase">
                      Latency
                    </span>
                    <span className="font-semibold">
                      {u.lastLatencyMs !== null ? `${u.lastLatencyMs}ms` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-wine/60 dark:text-rose/60 text-[10px] uppercase">
                      24h Uptime
                    </span>
                    <span className="font-semibold">
                      {u.uptime24h !== null ? `${u.uptime24h}%` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-wine/60 dark:text-rose/60 text-[10px] uppercase">
                      Checked
                    </span>
                    <span>{formatRelativeTime(u.lastCheckedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Link
                    to={`/urls/${u.id}`}
                    className="flex-1 py-2 px-3 min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg border border-rose/40 hover:bg-rose/10 text-xs font-medium text-wine dark:text-rose"
                  >
                    <ExternalLink size={14} />
                    View Details
                  </Link>
                  <button
                    onClick={() => setDeletingUrl(u)}
                    aria-label={`Delete ${u.name}`}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AddUrlModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => refresh()}
        currentCount={urls.length}
      />

      <DeleteUrlModal
        url={deletingUrl}
        onClose={() => setDeletingUrl(null)}
        onSuccess={() => refresh()}
      />
    </div>
  );
}
