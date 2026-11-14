// Pure attendance rules, kept free of I/O so they can be unit tested.
import { checkGeofence } from './geo';

export type MarkedStatus = 'present' | 'late' | 'proxy_detected';
export type AttendanceStatus = MarkedStatus | 'absent';

/** Statuses that count towards a student's attendance percentage. */
export const ATTENDED_STATUSES: readonly AttendanceStatus[] = ['present', 'late'];

export interface EvaluationInput {
  faceScore: number;
  faceThreshold: number;
  sessionStart: Date;
  now: Date;
  lateThresholdMinutes: number;
  location?: { lat: number; lng: number } | null;
  geofence?: { enabled: boolean; lat: number; lng: number; radius: number } | null;
}

export interface EvaluationResult {
  status: MarkedStatus;
  flagged: boolean;
  flagReasons: string[];
}

/**
 * Decide the status of an attendance attempt.
 *
 * - A face score below the threshold marks the attempt as a proxy.
 * - A location outside the campus geofence marks the attempt as a proxy.
 * - A missing location (when geofencing is enabled) flags the attempt for review.
 * - A genuine attempt after the late threshold is marked late.
 */
export function evaluateAttendance(input: EvaluationInput): EvaluationResult {
  const flagReasons: string[] = [];
  let proxy = false;

  if (input.faceScore < input.faceThreshold) {
    proxy = true;
    flagReasons.push(
      `Face match score ${input.faceScore.toFixed(2)} below threshold ${input.faceThreshold}`,
    );
  }

  if (input.geofence?.enabled) {
    if (!input.location) {
      flagReasons.push('GPS location not provided');
    } else {
      const geo = checkGeofence(input.location, input.geofence);
      if (!geo.withinBounds) {
        proxy = true;
        flagReasons.push(`Outside campus geofence. Distance: ${geo.distance}m (max: ${geo.radius}m)`);
      }
    }
  }

  let status: MarkedStatus = 'present';
  if (proxy) {
    status = 'proxy_detected';
  } else if (input.lateThresholdMinutes > 0) {
    const minutesPassed = (input.now.getTime() - input.sessionStart.getTime()) / 60_000;
    if (minutesPassed > input.lateThresholdMinutes) status = 'late';
  }

  return { status, flagged: flagReasons.length > 0, flagReasons };
}

/** Attendance percentage, rounded to an integer. No classes held yet counts as 100%. */
export function attendancePercentage(attended: number, totalClasses: number): number {
  if (totalClasses <= 0) return 100;
  return Math.min(100, Math.round((attended / totalClasses) * 100));
}

export function countsAsAttended(status: AttendanceStatus): boolean {
  return ATTENDED_STATUSES.includes(status);
}
