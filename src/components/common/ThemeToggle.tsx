// Cycles the colour theme: system -> light -> dark.
import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

const LABELS = {
  system: 'Theme: match system',
  light: 'Theme: light',
  dark: 'Theme: dark',
} as const;

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { preference, cycle } = useThemeStore();
  const Icon = preference === 'system' ? Monitor : preference === 'light' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={cycle}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors ${className}`}
      aria-label={`${LABELS[preference]}. Click to change.`}
      title={LABELS[preference]}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
