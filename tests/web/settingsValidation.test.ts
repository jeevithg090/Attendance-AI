import { describe, expect, it } from 'vitest';
import { validateSettings } from '../../src/lib/settingsValidation';

const valid = {
  faceMatchThreshold: 0.5,
  attendanceWindowMinutes: 30,
  lateThresholdMinutes: 10,
  minimumAttendancePercent: 75,
  campusLat: 12.94,
  campusLng: 77.56,
  campusRadius: 200,
};

describe('validateSettings', () => {
  it('accepts the default settings', () => {
    expect(validateSettings(valid)).toEqual({});
  });

  it('reports empty (NaN) fields as required', () => {
    expect(validateSettings({ ...valid, campusRadius: NaN }).campusRadius).toMatch(/required/);
  });

  it('enforces the same ranges as the API', () => {
    expect(validateSettings({ ...valid, faceMatchThreshold: 1.2 }).faceMatchThreshold).toMatch(
      /between 0 and 1/,
    );
    expect(validateSettings({ ...valid, campusLat: -91 }).campusLat).toBeDefined();
    expect(validateSettings({ ...valid, campusRadius: 5 }).campusRadius).toBeDefined();
  });

  it('requires whole numbers for minute and percent fields', () => {
    expect(validateSettings({ ...valid, attendanceWindowMinutes: 12.5 }).attendanceWindowMinutes).toMatch(
      /whole number/,
    );
  });

  it('rejects a late threshold longer than the attendance window', () => {
    expect(validateSettings({ ...valid, lateThresholdMinutes: 45 }).lateThresholdMinutes).toMatch(
      /cannot be longer/,
    );
  });
});
