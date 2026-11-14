// ═══════════════════════════════════════════════════════════
// AttendAI — Button Component
// ═══════════════════════════════════════════════════════════

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-[var(--accent-primary-solid)] hover:bg-[var(--accent-primary-solid-hover)] text-white shadow-[var(--shadow-glow-primary)]',
  secondary:
    'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-2)] text-[var(--text-primary)] border border-[var(--border-light)]',
  danger:
    'bg-[var(--accent-danger-solid)] hover:brightness-110 text-white shadow-[var(--shadow-glow-danger)]',
  success:
    'bg-[var(--accent-success-solid)] hover:brightness-110 text-white shadow-[var(--shadow-glow-success)]',
  ghost:
    'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  outline:
    'bg-transparent border border-[var(--border-light)] hover:border-[var(--accent-primary)] text-[var(--text-primary)]',
};

const sizeStyles: Record<string, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-sm gap-1.5',
  md: 'min-h-10 px-4 py-2 text-sm gap-2',
  lg: 'min-h-12 px-6 py-3 text-base gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium
        rounded-[var(--radius-md)] transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        enabled:active:scale-[0.97] whitespace-nowrap
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <Loader2
          className="animate-spin"
          aria-hidden="true"
          size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
        />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
