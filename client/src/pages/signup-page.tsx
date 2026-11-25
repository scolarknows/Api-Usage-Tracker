import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../api/client.ts';
import { useAuth } from '../context/auth-context.tsx';
import type { User } from '../types/api.ts';

function getMissingPasswordRequirements(password: string): string[] {
  const missing: string[] = [];
  if (password.length < 8) missing.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter');
  if (!/[a-z]/.test(password)) missing.push('a lowercase letter');
  if (!/[0-9]/.test(password)) missing.push('a number');
  if (!/[^A-Za-z0-9]/.test(password)) missing.push('a special character');
  return missing;
}

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const missingRequirements = getMissingPasswordRequirements(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (missingRequirements.length > 0) {
      setError(`Password is missing: ${missingRequirements.join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post<{ token: string; user: User }>('/auth/signup', {
        email,
        password,
      });
      setAuth(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
        'Failed to create account. Please try again.';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-2xl border border-rose/30 bg-surface/50 dark:bg-dark-card shadow-xl">
        <h1 className="font-story text-3xl font-bold mb-2 text-wine dark:text-rose text-center">
          Create Account
        </h1>
        <p className="text-sm text-center mb-6 text-wine/70 dark:text-rose/70">
          Start monitoring up to 5 URLs every 5 minutes for free
        </p>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-rose/40 bg-surface dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-wine dark:focus:ring-rose text-wine dark:text-rose text-sm font-mono"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">
              Password (min 8 characters)
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 rounded-lg border border-rose/40 bg-surface dark:bg-dark-surface focus:outline-none focus:ring-2 focus:ring-wine dark:focus:ring-rose text-wine dark:text-rose text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-wine/70 dark:text-rose/70 hover:text-wine dark:hover:text-rose cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && missingRequirements.length > 0 && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                Missing: {missingRequirements.join(', ')}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 min-h-[44px] rounded-lg bg-wine text-surface font-medium hover:bg-wine/90 dark:bg-rose dark:text-dark-bg dark:hover:bg-rose/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-wine/80 dark:text-rose/80">
          Already have an account?{' '}
          <Link to="/login" className="underline font-semibold hover:text-wine dark:hover:text-rose">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
