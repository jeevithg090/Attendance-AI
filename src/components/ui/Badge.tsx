// ═══════════════════════════════════════════════════════════
// AttendAI — Badge Component
// ═══════════════════════════════════════════════════════════

import React from 'react';

interface BadgeProps {
  variant?: 'present' | 'absent' | 'late' | 'proxy' | 'primary' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<string, string> = {
  present: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  absent: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  late: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  proxy: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  primary: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  default: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

const dotColors: Record<string, string> = {
  present: 'bg-emerald-400',
  absent: 'bg-rose-400',
  late: 'bg-amber-400',
  proxy: 'bg-pink-400',
  primary: 'bg-indigo-400',
  warning: 'bg-amber-400',
  info: 'bg-sky-400',
  default: 'bg-gray-400',
};

export default function Badge({ variant = 'default', size = 'sm', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />
      )}
      {children}
    </span>
  );
}
