import { describe, expect, it } from 'vitest';
import { nextPreference, parsePreference, resolveTheme } from '../../src/lib/theme';

describe('theme preference', () => {
  it('parses stored values and falls back to system', () => {
    expect(parsePreference('light')).toBe('light');
    expect(parsePreference('dark')).toBe('dark');
    expect(parsePreference(null)).toBe('system');
    expect(parsePreference('purple')).toBe('system');
  });

  it('resolves system preference from the OS setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('cycles system -> light -> dark -> system', () => {
    expect(nextPreference('system')).toBe('light');
    expect(nextPreference('light')).toBe('dark');
    expect(nextPreference('dark')).toBe('system');
  });
});
