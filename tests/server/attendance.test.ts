import { describe, expect, it } from 'vitest';
import { attendancePercentage, countsAsAttended, evaluateAttendance } from '../../server/lib/attendance';

const start = new Date('2026-01-01T09:00:00Z');
const minutesAfter = (m: number) => new Date(start.getTime() + m * 60_000);
const campus = { enabled: true, lat: 12.9416151, lng: 77.5668099, radius: 200 };
const onCampus = { lat: 12.9417, lng: 77.5669 };
const offCampus = { lat: 13.0, lng: 77.6 };

const base = {
  faceScore: 0.8,
  faceThreshold: 0.5,
  sessionStart: start,
  now: minutesAfter(2),
  lateThresholdMinutes: 10,
  location: onCampus,
  geofence: campus,
};

describe('evaluateAttendance', () => {
  it('marks a genuine, on-time, on-campus attempt as present', () => {
    expect(evaluateAttendance(base)).toEqual({ status: 'present', flagged: false, flagReasons: [] });
  });

  it('marks a genuine attempt after the late threshold as late', () => {
    expect(evaluateAttendance({ ...base, now: minutesAfter(15) }).status).toBe('late');
  });

  it('does not mark late when the late threshold is disabled', () => {
    expect(evaluateAttendance({ ...base, now: minutesAfter(60), lateThresholdMinutes: 0 }).status).toBe('present');
  });

  it('flags a low face score as a proxy', () => {
    const result = evaluateAttendance({ ...base, faceScore: 0.3 });
    expect(result.status).toBe('proxy_detected');
    expect(result.flagged).toBe(true);
    expect(result.flagReasons[0]).toMatch(/below threshold/);
  });

  it('flags an off-campus location as a proxy', () => {
    const result = evaluateAttendance({ ...base, location: offCampus });
    expect(result.status).toBe('proxy_detected');
    expect(result.flagReasons[0]).toMatch(/Outside campus geofence/);
  });

  it('flags but does not reject a missing location', () => {
    const result = evaluateAttendance({ ...base, location: null });
    expect(result.status).toBe('present');
    expect(result.flagged).toBe(true);
    expect(result.flagReasons).toEqual(['GPS location not provided']);
  });

  it('ignores location entirely when geofencing is disabled', () => {
    const result = evaluateAttendance({ ...base, location: offCampus, geofence: { ...campus, enabled: false } });
    expect(result).toEqual({ status: 'present', flagged: false, flagReasons: [] });
  });

  it('reports every reason when multiple checks fail', () => {
    const result = evaluateAttendance({ ...base, faceScore: 0.1, location: offCampus });
    expect(result.status).toBe('proxy_detected');
    expect(result.flagReasons).toHaveLength(2);
  });

  it('treats a location at 0,0 as provided (not missing)', () => {
    const result = evaluateAttendance({ ...base, location: { lat: 0, lng: 0 } });
    expect(result.flagReasons[0]).toMatch(/Outside campus geofence/);
  });
});

describe('attendancePercentage', () => {
  it('is 100 when no classes have been held', () => {
    expect(attendancePercentage(0, 0)).toBe(100);
  });

  it('rounds to the nearest integer', () => {
    expect(attendancePercentage(2, 3)).toBe(67);
  });

  it('never exceeds 100', () => {
    expect(attendancePercentage(5, 4)).toBe(100);
  });
});

describe('countsAsAttended', () => {
  it('counts present and late only', () => {
    expect(countsAsAttended('present')).toBe(true);
    expect(countsAsAttended('late')).toBe(true);
    expect(countsAsAttended('absent')).toBe(false);
    expect(countsAsAttended('proxy_detected')).toBe(false);
  });
});
