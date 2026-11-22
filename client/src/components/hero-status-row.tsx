import { motion } from 'framer-motion';

interface HeroStatusRowProps {
  method: string;
  path: string;
  status: number;
  latency: number;
  state: 'up' | 'down';
}

const statusConfig = {
  up: {
    label: 'Online',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    statusClass: 'text-emerald-700 dark:text-emerald-400',
  },
  down: {
    label: 'Offline',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    statusClass: 'text-rose-700 dark:text-rose-400',
  },
};

export function HeroStatusRow({ method, path, status, latency, state }: HeroStatusRowProps) {
  const config = statusConfig[state];
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 }}
      className="rounded-xl bg-white dark:bg-dark-card border border-mauve/20 dark:border-rose/20 p-4 text-left"
      role="listitem"
      style={prefersReducedMotion ? { opacity: 1, transform: 'none' } : undefined}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-mauve/10 dark:bg-rose/10 text-wine dark:text-rose">
          {method}
        </span>
        <span className="font-mono text-sm text-mauve dark:text-rose/70 truncate">{path}</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${config.dotClass}`} aria-hidden="true" />
          <span className={`font-medium ${config.badgeClass} px-2 py-0.5 rounded-full`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-mauve dark:text-rose/70">
          <span className="font-mono" aria-label={`Status code ${status}`}>{status}</span>
          <span className="font-mono" aria-label={`Latency ${latency} milliseconds`}>{latency}ms</span>
        </div>
      </div>
    </motion.article>
  );
}