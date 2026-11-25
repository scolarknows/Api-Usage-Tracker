import { Link } from 'react-router-dom';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../context/auth-context.tsx';
import { useTheme } from '../context/theme-context.tsx';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b-2 border-rose/30 bg-surface/80 dark:bg-dark-bg/80 backdrop-blur sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-story text-2xl font-bold text-wine dark:text-rose tracking-wide">
            Uptime & Latency Monitor
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-rose/40 hover:bg-rose/10 transition-colors text-wine dark:text-rose cursor-pointer focus:outline-none focus:ring-2 focus:ring-wine dark:focus:ring-rose"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-rose/30">
              <span className="text-sm font-mono text-wine/80 dark:text-rose/80 hidden sm:inline">
                {user.email}
              </span>
              <button
                onClick={logout}
                aria-label="Log out"
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-rose/40 hover:bg-wine/10 dark:hover:bg-rose/10 text-wine dark:text-rose transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-wine dark:focus:ring-rose"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
