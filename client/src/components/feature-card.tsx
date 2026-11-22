interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <article className="rounded-xl bg-white dark:bg-dark-card border border-mauve/20 dark:border-rose/20 p-6 text-left">
      <div className="text-3xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="font-story text-xl font-normal text-wine dark:text-rose mb-2">{title}</h3>
      <p className="text-mauve dark:text-rose/70 text-sm leading-relaxed">{description}</p>
    </article>
  );
}