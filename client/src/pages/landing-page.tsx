import { Link, useNavigate } from 'react-router-dom';
import { HeroStatusRow } from '../components/hero-status-row';
import { FeatureCard } from '../components/feature-card';
import { useAuth } from '../context/auth-context';
import { useEffect } from 'react';

export function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-wine dark:bg-dark-bg dark:text-rose">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-wine border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-wine dark:bg-dark-bg dark:text-rose font-sans antialiased">
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-mauve/20 dark:border-rose/20">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-story text-2xl text-wine dark:text-rose">Uptime</span>
              <span className="hidden sm:block text-sm text-mauve dark:text-rose/70">Monitor</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-medium text-mauve dark:text-rose/70 hover:text-wine dark:hover:text-rose transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-wine px-4 py-2 text-sm font-medium text-white hover:bg-mauve transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg"
              >
                Create account
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8" aria-labelledby="hero-heading">
          <div className="mx-auto max-w-7xl">
            <div className="text-center max-w-3xl mx-auto">
              <h1
                id="hero-heading"
                className="font-story text-4xl sm:text-5xl lg:text-6xl font-normal text-wine dark:text-rose tracking-tight"
              >
                API uptime & latency, <br />monitored every 5 minutes
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-mauve dark:text-rose/70 max-w-2xl mx-auto">
                Add up to 5 endpoints. Get status badges, uptime percentages, and latency charts —
                all on a clean dashboard. No infrastructure to manage.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/signup"
                  className="w-full sm:w-auto rounded-lg bg-wine px-8 py-3.5 text-base font-medium text-white hover:bg-mauve transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg"
                >
                  Create account — free
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto rounded-lg border-2 border-mauve dark:border-rose/30 px-8 py-3.5 text-base font-medium text-wine dark:text-rose hover:bg-mauve/10 dark:hover:bg-rose/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg"
                >
                  Log in
                </Link>
              </div>
            </div>

            <div className="mt-16" aria-label="Live status examples">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto" role="list">
                <HeroStatusRow
                  method="GET"
                  path="/api/users"
                  status={200}
                  latency={42}
                  state="up"
                />
                <HeroStatusRow
                  method="POST"
                  path="/webhooks"
                  status={500}
                  latency={1240}
                  state="down"
                />
                <HeroStatusRow
                  method="GET"
                  path="/health"
                  status={200}
                  latency={18}
                  state="up"
                />
              </div>
              <p className="mt-6 text-center text-sm text-mauve/70 dark:text-rose/50">
                Simulated live checks — your dashboard updates every 60 seconds
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-mauve/10 dark:bg-rose/5" aria-labelledby="what-heading">
          <div className="mx-auto max-w-7xl">
            <header className="text-center max-w-2xl mx-auto mb-16">
              <h2
                id="what-heading"
                className="font-story text-3xl sm:text-4xl font-normal text-wine dark:text-rose"
              >
                What it monitors
              </h2>
              <p className="mt-4 text-lg text-mauve dark:text-rose/70">
                Three metrics that tell you if your APIs are healthy
              </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <FeatureCard
                title="Uptime %"
                description="Percentage of successful checks over 24h and 7d windows. Green when healthy, red when degraded."
                icon="📊"
              />
              <FeatureCard
                title="Latency (ms)"
                description="Monotonic-clock measured response time. Track average and p95. Failed checks show as gaps — never zero."
                icon="⏱️"
              />
              <FeatureCard
                title="7-day history"
                description="Interactive Recharts line charts with 24h/7d range selector. Recent failures table with status codes and errors."
                icon="📈"
              />
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="how-heading">
          <div className="mx-auto max-w-7xl">
            <header className="text-center max-w-2xl mx-auto mb-16">
              <h2
                id="how-heading"
                className="font-story text-3xl sm:text-4xl font-normal text-wine dark:text-rose"
              >
                How it works
              </h2>
              <p className="mt-4 text-lg text-mauve dark:text-rose/70">
                From signup to dashboard in three steps
              </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <article className="relative text-center">
                <div className="absolute -left-4 top-0 hidden md:block w-8 h-8">
                  <div className="w-full h-full rounded-full bg-wine/10 dark:bg-rose/10 flex items-center justify-center text-wine dark:text-rose font-mono text-lg font-bold">1</div>
                </div>
                <h3 className="font-story text-2xl font-normal text-wine dark:text-rose mb-3">Add your URL</h3>
                <p className="text-mauve dark:text-rose/70">Paste any HTTP/HTTPS endpoint. We validate against SSRF (block private IPs, cloud metadata, localhost).</p>
              </article>
              <article className="relative text-center">
                <div className="absolute -left-4 top-0 hidden md:block w-8 h-8 ml-4">
                  <div className="w-full h-full rounded-full bg-wine/10 dark:bg-rose/10 flex items-center justify-center text-wine dark:text-rose font-mono text-lg font-bold">2</div>
                </div>
                <h3 className="font-story text-2xl font-normal text-wine dark:text-rose mb-3">Checks run every 5 min</h3>
                <p className="text-mauve dark:text-rose/70">HEAD request with 10s timeout, GET fallback on 405/501. Max 3 redirects, each re-validated. Bounded to 10 concurrent.</p>
              </article>
              <article className="relative text-center">
                <div className="absolute -left-4 top-0 hidden md:block w-8 h-8 ml-4">
                  <div className="w-full h-full rounded-full bg-wine/10 dark:bg-rose/10 flex items-center justify-center text-wine dark:text-rose font-mono text-lg font-bold">3</div>
                </div>
                <h3 className="font-story text-2xl font-normal text-wine dark:text-rose mb-3">Read the dashboard</h3>
                <p className="text-mauve dark:text-rose/70">Table on desktop, cards on mobile. Status badges, 24h uptime, latency, last checked. Click for detail charts.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-mauve/10 dark:bg-rose/5" aria-labelledby="limits-heading">
          <div className="mx-auto max-w-3xl">
            <header className="text-center mb-12">
              <h2
                id="limits-heading"
                className="font-story text-3xl sm:text-4xl font-normal text-wine dark:text-rose"
              >
                Current limits (Free tier)
              </h2>
            </header>
            <dl className="space-y-6 text-mauve dark:text-rose/70">
              <div className="flex items-start gap-4">
                <dt className="font-medium text-wine dark:text-rose min-w-[140px] font-mono">5 URLs</dt>
                <dd>Maximum monitored endpoints per account. Delete one to add another.</dd>
              </div>
              <div className="flex items-start gap-4">
                <dt className="font-medium text-wine dark:text-rose min-w-[140px] font-mono">5 min interval</dt>
                <dd>Checks run on a fixed schedule via external cron (cron-job.org / UptimeRobot).</dd>
              </div>
              <div className="flex items-start gap-4">
                <dt className="font-medium text-wine dark:text-rose min-w-[140px] font-mono">Dashboard only</dt>
                <dd>No alerting, no webhooks, no API access. Built for portfolio demonstration.</dd>
              </div>
              <div className="flex items-start gap-4">
                <dt className="font-medium text-wine dark:text-rose min-w-[140px] font-mono">7-day retention</dt>
                <dd>Check history auto-expires via MongoDB TTL index. ~1,440 checks per 5 URLs over 7 days.</dd>
              </div>
            </dl>
            <p className="mt-8 text-center text-sm text-mauve/70 dark:text-rose/50">
              This is a portfolio project — no paid tiers exist. The code is open source on GitHub.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-mauve/20 dark:border-rose/20 py-12 px-4 sm:px-6 lg:px-8" role="contentinfo">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-mauve/70 dark:text-rose/50">
            Built with React, Express, MongoDB, and Tailwind CSS v4
          </p>
          <a
            href="https://github.com/scolarknows/Api-Usage-Tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-wine dark:text-rose hover:text-mauve dark:hover:text-rose/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg rounded"
          >
            View source on GitHub →
          </a>
        </div>
      </footer>
    </div>
  );
}