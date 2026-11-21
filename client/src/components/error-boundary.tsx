import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface dark:bg-dark-bg text-wine dark:text-rose">
          <div className="max-w-md w-full p-6 rounded-xl border border-rose/40 bg-surface/50 dark:bg-dark-card shadow-lg text-center">
            <h1 className="font-story text-3xl mb-2 font-bold">Something went wrong</h1>
            <p className="text-sm mb-4 opacity-80">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 min-h-[44px] rounded-lg bg-wine text-surface font-medium hover:bg-wine/90 dark:bg-rose dark:text-dark-bg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
