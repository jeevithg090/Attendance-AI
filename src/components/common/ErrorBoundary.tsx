// Catches render errors so a single broken page doesn't blank the whole app.
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-primary)]">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Something went wrong</h1>
          <p className="text-[var(--text-muted)]">
            An unexpected error occurred. Reloading the page usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
