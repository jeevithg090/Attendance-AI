// ═══════════════════════════════════════════════════════════
// AttendAI — StatCard Component (with count-up animation)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info';
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export default function StatCard({
  title,
  value,
  suffix = '',
  prefix = '',
  icon,
  variant = 'primary',
  trend,
  className = '',
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplayValue(value);
      return;
    }

    hasAnimated.current = true;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const iconBgColors: Record<string, string> = {
    primary: 'bg-indigo-500/15 text-indigo-400',
    success: 'bg-emerald-500/15 text-emerald-400',
    danger: 'bg-rose-500/15 text-rose-400',
    warning: 'bg-amber-500/15 text-amber-400',
    info: 'bg-sky-500/15 text-sky-400',
  };

  return (
    <div className={`stat-card ${variant} animate-fade-in-up ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-[var(--radius-md)] ${iconBgColors[variant]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-[var(--text-muted)] text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight" style={{ fontFamily: 'var(--font-mono)' }}>
          {prefix}{displayValue.toLocaleString()}{suffix}
        </p>
      </div>
    </div>
  );
}
