import { describe, expect, it } from 'vitest';
import { checkGeofence, haversineDistance } from '../../server/lib/geo';

describe('haversineDistance', () => {
  it('is zero for identical points', () => {
    expect(haversineDistance(12.94, 77.56, 12.94, 77.56)).toBe(0);
  });

  it('matches a known distance (~111 km per degree of latitude)', () => {
    const d = haversineDistance(0, 0, 1, 0);
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('is symmetric', () => {
    const a = haversineDistance(12.9416, 77.5668, 12.95, 77.58);
    const b = haversineDistance(12.95, 77.58, 12.9416, 77.5668);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('checkGeofence', () => {
  const campus = { lat: 12.9416151, lng: 77.5668099, radius: 200 };

  it('accepts a point inside the radius', () => {
    const result = checkGeofence({ lat: 12.9417, lng: 77.5669 }, campus);
    expect(result.withinBounds).toBe(true);
    expect(result.radius).toBe(200);
  });

  it('rejects a point outside the radius and reports a rounded distance', () => {
    const result = checkGeofence({ lat: 12.9516, lng: 77.5668 }, campus); // ~1.1 km north
    expect(result.withinBounds).toBe(false);
    expect(Number.isInteger(result.distance)).toBe(true);
    expect(result.distance).toBeGreaterThan(1000);
  });
});
