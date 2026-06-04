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
  primary: 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white shadow-[var(--shadow-glow-primary)]',
  secondary: 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-2)] text-[var(--text-primary)] border border-[var(--border-light)]',
  danger: 'bg-[var(--accent-danger)] hover:opacity-90 text-white shadow-[var(--shadow-glow-danger)]',
  success: 'bg-[var(--accent-success)] hover:opacity-90 text-white shadow-[var(--shadow-glow-success)]',
  ghost: 'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  outline: 'bg-transparent border border-[var(--border-light)] hover:border-[var(--accent-primary)] text-[var(--text-primary)]',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-medium
        rounded-[var(--radius-md)] transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.97]
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
