import type { Coordinates } from '../types';

const EARTH_RADIUS_KM = 6371;
const radians = (value: number) => (value * Math.PI) / 180;

export function distanceInKm(from: Coordinates, to: Coordinates) {
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(distanceKm: number) {
  return distanceKm < 1 ? `${Math.max(10, Math.round(distanceKm * 1000 / 10) * 10)} m` : `${distanceKm.toFixed(1)} km`;
}
