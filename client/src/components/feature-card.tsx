import type { ReactNode } from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <article className="rounded-xl bg-white dark:bg-dark-card border border-mauve/20 dark:border-rose/20 p-6 text-left">
      <div className="mb-4 text-wine dark:text-rose" aria-hidden="true">{icon}</div>
      <h3 className="font-story text-xl font-normal text-wine dark:text-rose mb-2">{title}</h3>
      <p className="text-mauve dark:text-rose/70 text-sm leading-relaxed">{description}</p>
    </article>
  );
}