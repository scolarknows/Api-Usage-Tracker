import { cn } from '../lib/utils.ts';
import type { UrlStatus } from '../types/api.ts';

interface StatusBadgeProps {
  status: UrlStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const configs: Record<UrlStatus, { text: string; bg: string; dot: string }> = {
    up: {
      text: 'Online',
      bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    down: {
      text: 'Offline',
      bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
      dot: 'bg-rose-500',
    },
    pending: {
      text: 'Pending',
      bg: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/30',
      dot: 'bg-stone-400',
    },
  };

  const config = configs[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border font-mono',
        config.bg,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.text}
    </span>
  );
}
