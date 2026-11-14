// Geospatial helpers used for campus geofencing.

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two coordinates, in meters (haversine formula). */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeofenceResult {
  withinBounds: boolean;
  /** Rounded distance from the fence centre, in meters. */
  distance: number;
  radius: number;
}

export function checkGeofence(
  point: { lat: number; lng: number },
  fence: { lat: number; lng: number; radius: number },
): GeofenceResult {
  const distance = haversineDistance(point.lat, point.lng, fence.lat, fence.lng);
  return {
    withinBounds: distance <= fence.radius,
    distance: Math.round(distance),
    radius: fence.radius,
  };
}
