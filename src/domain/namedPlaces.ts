import type { Coordinates } from '../types';

export type XY = [number, number];
export type PlaceGeometry = { type: 'Polygon'; coordinates: XY[][] } | { type: 'MultiPolygon'; coordinates: XY[][][] };
export interface NamedPlace {
  id: string;
  nameTc: string;
  nameEn: string;
  addressTc?: string;
  addressEn?: string;
  kind: string;
  sourceUrl?: string;
  updatedAt?: string;
  geometry: PlaceGeometry;
  bbox: [number, number, number, number];
}
export interface NamedPlaceSnapshot {
  source: string;
  sourceUrl: string;
  generatedAt: string;
  updatedAt?: string;
  retrievalUrl?: string;
  places: NamedPlace[];
}
export interface PlaceMatch { place: NamedPlace; relation: 'inside' | 'nearby'; distanceMetres: number }

const EARTH_METRES_PER_DEGREE = 111_195;
const EPSILON = 1e-10;

function onSegment(p: XY, a: XY, b: XY) {
  const cross = (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (Math.abs(cross) > EPSILON * Math.max(length, EPSILON)) return false;
  return p[0] >= Math.min(a[0], b[0]) - EPSILON && p[0] <= Math.max(a[0], b[0]) + EPSILON
    && p[1] >= Math.min(a[1], b[1]) - EPSILON && p[1] <= Math.max(a[1], b[1]) + EPSILON;
}

export function insideRing(point: XY, ring: XY[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    if (onSegment(point, a, b)) return true;
    if ((a[1] > point[1]) !== (b[1] > point[1])
      && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function polygons(geometry: PlaceGeometry): XY[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

export function containsPlace(place: NamedPlace, point: Coordinates) {
  const [minX, minY, maxX, maxY] = place.bbox;
  if (point.lng < minX - EPSILON || point.lng > maxX + EPSILON || point.lat < minY - EPSILON || point.lat > maxY + EPSILON) return false;
  return polygons(place.geometry).some(([outer, ...holes]) =>
    !!outer && insideRing([point.lng, point.lat], outer) && !holes.some(hole => insideRing([point.lng, point.lat], hole)));
}

function areaOfRing(ring: XY[]) {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return Math.abs(area) / 2;
}

function areaOfPlace(place: NamedPlace) {
  return polygons(place.geometry).reduce((sum, [outer, ...holes]) => sum + areaOfRing(outer) - holes.reduce((a, ring) => a + areaOfRing(ring), 0), 0);
}

export function distanceToPlace(place: NamedPlace, point: Coordinates) {
  if (containsPlace(place, point)) return 0;
  const xScale = EARTH_METRES_PER_DEGREE * Math.cos(point.lat * Math.PI / 180);
  let shortest = Infinity;
  for (const poly of polygons(place.geometry)) for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const ax = (ring[j][0] - point.lng) * xScale, ay = (ring[j][1] - point.lat) * EARTH_METRES_PER_DEGREE;
      const bx = (ring[i][0] - point.lng) * xScale, by = (ring[i][1] - point.lat) * EARTH_METRES_PER_DEGREE;
      const dx = bx - ax, dy = by - ay, length2 = dx * dx + dy * dy;
      const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2));
      shortest = Math.min(shortest, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return shortest;
}

export function findNamedPlaces(places: NamedPlace[], point: Coordinates): PlaceMatch[] {
  const containing = places.filter(place => containsPlace(place, point)).sort((a, b) => areaOfPlace(a) - areaOfPlace(b));
  if (containing.length) return containing.slice(0, 3).map(place => ({ place, relation: 'inside', distanceMetres: 0 }));
  const dx = 120 / (EARTH_METRES_PER_DEGREE * Math.cos(point.lat * Math.PI / 180));
  const dy = 120 / EARTH_METRES_PER_DEGREE;
  return places.filter(({ bbox: [minX, minY, maxX, maxY] }) =>
    point.lng >= minX - dx && point.lng <= maxX + dx && point.lat >= minY - dy && point.lat <= maxY + dy)
    .map(place => ({ place, relation: 'nearby' as const, distanceMetres: distanceToPlace(place, point) }))
    .filter(match => match.distanceMetres <= 100)
    .sort((a, b) => a.distanceMetres - b.distanceMetres).slice(0, 2);
}
