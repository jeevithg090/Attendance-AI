// Light/dark theme preference, persisted in localStorage and applied as
// <html data-theme="...">. "system" follows prefers-color-scheme.
import { create } from 'zustand';
import {
  nextPreference,
  parsePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from '../lib/theme';

const darkQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function apply(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#0a0f1e' : '#f5f6fa');
}

interface ThemeState {
  preference: ThemePreference;
  theme: Theme;
  setPreference: (preference: ThemePreference) => void;
  cycle: () => void;
}

const initialPreference = readPreference();

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: initialPreference,
  theme: resolveTheme(initialPreference, darkQuery?.matches ?? true),
  setPreference: (preference) => {
    try {
      if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* storage unavailable (private mode); keep the in-memory preference */
    }
    const theme = resolveTheme(preference, darkQuery?.matches ?? true);
    apply(theme);
    set({ preference, theme });
  },
  cycle: () => get().setPreference(nextPreference(get().preference)),
}));

// Keep "system" in sync when the OS theme changes.
darkQuery?.addEventListener('change', (event) => {
  const { preference } = useThemeStore.getState();
  if (preference !== 'system') return;
  const theme: Theme = event.matches ? 'dark' : 'light';
  apply(theme);
  useThemeStore.setState({ theme });
});
