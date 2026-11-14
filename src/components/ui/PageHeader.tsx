// Consistent page heading: optional icon, title, description and actions.
// Stacks vertically on phones so action buttons never overflow.
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, icon, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div
            className="shrink-0 p-2.5 rounded-[var(--radius-md)] bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] break-words">
            {title}
          </h1>
          {description && <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0">{actions}</div>}
    </header>
  );
}
