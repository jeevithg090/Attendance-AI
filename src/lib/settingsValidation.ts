// Client-side checks for the System Settings form. Ranges mirror
// settingsUpdateSchema in server/http/validation.ts so users see friendly
// messages before the API rejects a value.
import type { SystemSettings } from '../types';

type NumericKey =
  | 'faceMatchThreshold'
  | 'attendanceWindowMinutes'
  | 'lateThresholdMinutes'
  | 'minimumAttendancePercent'
  | 'campusLat'
  | 'campusLng'
  | 'campusRadius';

interface Rule {
  label: string;
  min: number;
  max: number;
  integer?: boolean;
}

export const SETTINGS_RULES: Record<NumericKey, Rule> = {
  faceMatchThreshold: { label: 'Face match threshold', min: 0, max: 1 },
  attendanceWindowMinutes: { label: 'Attendance window', min: 1, max: 600, integer: true },
  lateThresholdMinutes: { label: 'Late threshold', min: 0, max: 600, integer: true },
  minimumAttendancePercent: { label: 'Minimum attendance', min: 0, max: 100, integer: true },
  campusLat: { label: 'Latitude', min: -90, max: 90 },
  campusLng: { label: 'Longitude', min: -180, max: 180 },
  campusRadius: { label: 'Radius', min: 10, max: 100_000, integer: true },
};

export type SettingsErrors = Partial<Record<NumericKey, string>>;

export function validateSettings(settings: Pick<SystemSettings, NumericKey>): SettingsErrors {
  const errors: SettingsErrors = {};
  for (const [key, rule] of Object.entries(SETTINGS_RULES) as [NumericKey, Rule][]) {
    const value = settings[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors[key] = `${rule.label} is required.`;
    } else if (value < rule.min || value > rule.max) {
      errors[key] = `${rule.label} must be between ${rule.min} and ${rule.max}.`;
    } else if (rule.integer && !Number.isInteger(value)) {
      errors[key] = `${rule.label} must be a whole number.`;
    }
  }
  if (
    !errors.lateThresholdMinutes &&
    !errors.attendanceWindowMinutes &&
    settings.lateThresholdMinutes > settings.attendanceWindowMinutes
  ) {
    errors.lateThresholdMinutes = 'Late threshold cannot be longer than the attendance window.';
  }
  return errors;
}
