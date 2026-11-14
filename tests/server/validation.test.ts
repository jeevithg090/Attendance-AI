import { describe, expect, it } from 'vitest';
import {
  clampInt,
  markAttendanceSchema,
  param,
  registerSchema,
  settingsUpdateSchema,
} from '../../server/http/validation';

const uuid = '3f1c2b4a-8d6e-4f7a-9b0c-1d2e3f4a5b6c';
const descriptor = Array.from({ length: 128 }, () => 0.1);

describe('markAttendanceSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = markAttendanceSchema.parse({
      sessionId: uuid,
      faceDescriptor: descriptor,
      latitude: 12.9,
      longitude: 77.5,
    });
    expect(parsed.sessionId).toBe(uuid);
  });

  it('rejects a client-supplied score instead of a descriptor', () => {
    expect(markAttendanceSchema.safeParse({ sessionId: uuid, faceMatchScore: 1 }).success).toBe(false);
  });

  it('rejects descriptors of the wrong length', () => {
    expect(markAttendanceSchema.safeParse({ sessionId: uuid, faceDescriptor: [0.1, 0.2] }).success).toBe(
      false,
    );
  });

  it('rejects out-of-range coordinates', () => {
    const result = markAttendanceSchema.safeParse({
      sessionId: uuid,
      faceDescriptor: descriptor,
      latitude: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe('settingsUpdateSchema', () => {
  it('accepts partial updates', () => {
    expect(settingsUpdateSchema.parse({ faceMatchThreshold: 0.6 })).toEqual({ faceMatchThreshold: 0.6 });
  });

  it('rejects unknown keys so arbitrary columns cannot be written', () => {
    expect(settingsUpdateSchema.safeParse({ foo: 'bar' }).success).toBe(false);
  });

  it('rejects out-of-range values', () => {
    expect(settingsUpdateSchema.safeParse({ faceMatchThreshold: 2 }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('normalises email casing', () => {
    const parsed = registerSchema.parse({
      email: '  Jane@Example.COM ',
      password: 'longenough',
      displayName: 'Jane',
      role: 'teacher',
      department: 'CSE',
    });
    expect(parsed.email).toBe('jane@example.com');
  });

  it('requires a password of at least 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.co',
      password: 'short',
      displayName: 'A',
      role: 'student',
      department: 'CSE',
    });
    expect(result.success).toBe(false);
  });
});

describe('query helpers', () => {
  it('param() takes the first element of array params', () => {
    expect(param(['a', 'b'])).toBe('a');
    expect(param(undefined)).toBe('');
  });

  it('clampInt() falls back and clamps', () => {
    expect(clampInt(undefined, 20, 1, 100)).toBe(20);
    expect(clampInt('abc', 20, 1, 100)).toBe(20);
    expect(clampInt('500', 20, 1, 100)).toBe(100);
    expect(clampInt('0', 20, 1, 100)).toBe(1);
  });
});
