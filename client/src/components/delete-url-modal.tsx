import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../api/client.ts';
import type { MonitoredUrl } from '../types/api.ts';

interface DeleteUrlModalProps {
  url: MonitoredUrl | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteUrlModal({ url, onClose, onSuccess }: DeleteUrlModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!url) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/urls/${url.id}`);
      toast.success(`Deleted ${url.name}`);
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to delete URL');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-sm p-6 rounded-2xl border border-rose/30 bg-surface dark:bg-dark-card shadow-2xl">
        <h2 className="font-story text-2xl font-bold mb-2 text-wine dark:text-rose">Delete URL</h2>
        <p className="text-sm text-wine/80 dark:text-rose/80 mb-6">
          Are you sure you want to delete <strong className="font-mono">{url.name}</strong>? This
          will also permanently delete all historical check data.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 min-h-[44px] rounded-lg border border-rose/40 hover:bg-rose/10 text-wine dark:text-rose text-sm font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="px-4 py-2 min-h-[44px] rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-sm font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Trash2 size={16} />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
