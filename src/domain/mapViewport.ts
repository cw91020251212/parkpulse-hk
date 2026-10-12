import type { Coordinates, MapViewport, SearchScope } from '../types';

export function isCoordinateInViewport(point: Coordinates, viewport: MapViewport): boolean {
  if (![point.lat, point.lng, viewport.north, viewport.south, viewport.east, viewport.west].every(Number.isFinite)) return false;
  const insideLongitude = viewport.west <= viewport.east
    ? point.lng >= viewport.west && point.lng <= viewport.east
    : point.lng >= viewport.west || point.lng <= viewport.east;
  return point.lat >= viewport.south && point.lat <= viewport.north && insideLongitude;
}

export function isWithinSearchScope(point: Coordinates, distanceKm: number, scope: SearchScope, viewport: MapViewport | null, radiusKm: number): boolean {
  if (scope === 'viewport') return viewport ? isCoordinateInViewport(point, viewport) : false;
  return distanceKm <= radiusKm;
}
