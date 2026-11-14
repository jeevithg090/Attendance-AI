// Inline error panel with an optional retry action.
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this data. Check your connection and try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center px-6 py-10 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-surface)] ${className}`}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-rose-500/15 text-rose-400"
        aria-hidden="true"
      >
        <AlertTriangle size={26} />
      </div>
      <p className="font-medium text-[var(--text-primary)]">{title}</p>
      <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          icon={<RefreshCw size={14} />}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
