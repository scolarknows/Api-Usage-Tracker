import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../api/client.ts';
import type { MonitoredUrl } from '../types/api.ts';

interface AddUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentCount: number;
}

export function AddUrlModal({ isOpen, onClose, onSuccess, currentCount }: AddUrlModalProps) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post<{ url: MonitoredUrl }>('/urls', {
        url,
        name: name.trim() || undefined,
      });
      toast.success('URL added for monitoring');
      setUrl('');
      setName('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        'Failed to add URL';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md p-6 rounded-2xl border border-rose/30 bg-surface dark:bg-dark-card shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-wine/70 dark:text-rose/70 hover:text-wine dark:hover:text-rose min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <X size={20} />
        </button>
        <h2 className="font-story text-2xl font-bold mb-1 text-wine dark:text-rose">Add New URL</h2>
        <p className="text-xs text-wine/70 dark:text-rose/70 mb-4">
          Monitor status and response latency every 5 minutes ({currentCount}/5 used)
        </p>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="url-input">
              URL *
            </label>
            <input
              id="url-input"
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-rose/40 bg-surface/50 dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-wine dark:focus:ring-rose text-wine dark:text-rose text-sm font-mono"
              placeholder="https://api.example.com/health"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="name-input">
              Friendly Name (Optional, max 60 chars)
            </label>
            <input
              id="name-input"
              type="text"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-rose/40 bg-surface/50 dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-wine dark:focus:ring-rose text-wine dark:text-rose text-sm"
              placeholder="Primary Production API"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[44px] rounded-lg border border-rose/40 hover:bg-rose/10 text-wine dark:text-rose text-sm font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || currentCount >= 5}
              className="px-4 py-2 min-h-[44px] rounded-lg bg-wine text-surface hover:bg-wine/90 dark:bg-rose dark:text-dark-bg dark:hover:bg-rose/90 text-sm font-medium flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Plus size={16} />
              {submitting ? 'Adding...' : 'Add URL'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
