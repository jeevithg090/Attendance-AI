// Friendly placeholder for lists and panels with no data yet.
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'success';
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'neutral',
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-10 ${className}`}>
      {icon && (
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-[var(--bg-elevated)] ${
            tone === 'success' ? 'text-emerald-400' : 'text-[var(--text-muted)]'
          }`}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <p className="font-medium text-[var(--text-primary)]">{title}</p>
      {description && <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
