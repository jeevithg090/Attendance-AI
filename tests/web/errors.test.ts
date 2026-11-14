import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it, vi } from 'vitest';

// The API client reads localStorage/window lazily inside interceptors only.
vi.stubGlobal('localStorage', { getItem: () => null, removeItem: () => undefined });
const { getErrorMessage } = await import('../../src/api/client');

function axiosError(status?: number, data?: unknown) {
  const config = { headers: new AxiosHeaders() };
  const response = status ? { status, statusText: '', headers: {}, config, data } : undefined;
  return new AxiosError('Request failed', 'ERR', config, undefined, response);
}

describe('getErrorMessage', () => {
  it('prefers the API error message', () => {
    expect(getErrorMessage(axiosError(409, { error: 'Already marked' }), 'fallback')).toBe('Already marked');
  });

  it('explains network failures', () => {
    expect(getErrorMessage(axiosError(), 'fallback')).toMatch(/Unable to reach the server/);
  });

  it('uses plain Error messages', () => {
    expect(getErrorMessage(new Error('No face detected'), 'fallback')).toBe('No face detected');
  });

  it('falls back for unknown values', () => {
    expect(getErrorMessage('weird', 'fallback')).toBe('fallback');
  });
});
