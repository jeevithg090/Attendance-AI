// ═══════════════════════════════════════════════════════════
// AttendAI — Card Component
// ═══════════════════════════════════════════════════════════

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  glass?: boolean;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  className = '',
  gradient = false,
  glass = false,
  hover = true,
  padding = 'md',
  onClick,
}: CardProps) {
  const baseClasses = `
    rounded-[var(--radius-xl)] transition-all duration-250
    ${paddingStyles[padding]}
    ${hover ? 'hover:translate-y-[-2px] hover:shadow-[var(--shadow-md)]' : ''}
    ${onClick ? 'cursor-pointer' : ''}
  `;

  if (glass) {
    return (
      <div className={`glass ${baseClasses} ${className}`} onClick={onClick}>
        {children}
      </div>
    );
  }

  if (gradient) {
    return (
      <div className={`gradient-border ${baseClasses} ${className}`} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`
        bg-[var(--bg-surface)] border border-[var(--border)]
        ${baseClasses} ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
