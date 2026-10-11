import type { Coordinates, ManualToiletPosition } from '../types';

export type ManualToiletPositionMap = Record<string, Coordinates>;

export function parseManualToiletPositions(value: unknown): ManualToiletPositionMap {
  if (!value || typeof value !== 'object' || !('positions' in value) || !Array.isArray(value.positions)) return {};
  const positions: ManualToiletPositionMap = {};
  for (const item of value.positions) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Partial<ManualToiletPosition>;
    if (typeof record.toiletId !== 'string' || !record.toiletId || record.toiletId.length > 200) continue;
    if (typeof record.latitude !== 'number' || !Number.isFinite(record.latitude) || record.latitude < 21 || record.latitude > 24) continue;
    if (typeof record.longitude !== 'number' || !Number.isFinite(record.longitude) || record.longitude < 112 || record.longitude > 116) continue;
    positions[record.toiletId] = { lat: record.latitude, lng: record.longitude };
  }
  return positions;
}

export function manualToiletPositionDocument(positions: ManualToiletPositionMap) {
  return {
    version: 1,
    positions: Object.entries(positions).map(([toiletId, { lat, lng }]) => ({ toiletId, latitude: lat, longitude: lng })),
  };
}
