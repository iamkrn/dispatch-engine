import type { GeoPoint } from '@dispatch/shared';

const METERS_PER_DEG_LAT = 111_320;

function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const midLat = (a.lat + b.lat) / 2;
  const dy = (b.lat - a.lat) * METERS_PER_DEG_LAT;
  const dx = (b.lng - a.lng) * metersPerDegLng(midLat);
  return Math.hypot(dx, dy);
}

// Compass bearing: 0 = North, 90 = East, 180 = South, 270 = West
export function bearingDeg(from: GeoPoint, to: GeoPoint): number {
  const midLat = (from.lat + to.lat) / 2;
  const dy = (to.lat - from.lat) * METERS_PER_DEG_LAT;
  const dx = (to.lng - from.lng) * metersPerDegLng(midLat);
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function moveToward(
  from: GeoPoint,
  to: GeoPoint,
  meters: number,
): GeoPoint {
  const dist = distanceMeters(from, to);
  if (dist === 0 || meters >= dist) return { lat: to.lat, lng: to.lng };
  const f = meters / dist;
  return {
    lat: from.lat + (to.lat - from.lat) * f,
    lng: from.lng + (to.lng - from.lng) * f,
  };
}