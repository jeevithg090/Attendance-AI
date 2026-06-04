// ═══════════════════════════════════════════════════════════
// AttendAI — Loading Spinner Component
// ═══════════════════════════════════════════════════════════

import React from 'react';
import { Loader2, ScanFace } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  variant?: 'spinner' | 'face' | 'skeleton';
}

export default function LoadingSpinner({ size = 'md', message, variant = 'spinner' }: LoadingSpinnerProps) {
  const sizes = { sm: 20, md: 32, lg: 48 };
  const iconSize = sizes[size];

  if (variant === 'skeleton') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-1/3 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 animate-fade-in">
      {variant === 'face' ? (
        <div className="relative">
          <ScanFace size={iconSize} className="text-[var(--accent-primary)] animate-pulse" />
          <div className="absolute inset-0 rounded-full animate-pulse-glow" />
        </div>
      ) : (
        <Loader2 size={iconSize} className="text-[var(--accent-primary)] animate-spin" />
      )}
      {message && (
        <p className="text-sm text-[var(--text-muted)]">{message}</p>
      )}
    </div>
  );
}
