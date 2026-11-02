import type { Coordinates, MapViewport, SearchScope } from '../types';

export const MAP_RETURN_KEY = 'parkpulse:3d-map-return:v1';
export const OPEN_3D_EVENT = 'parkpulse:open-official-3d';
export const CAPTURE_3D_EVENT = 'parkpulse:capture-map-3d';
export type LiveMapCapture = { viewport: MapViewport | null };
export function captureLiveMap(fallback: MapViewport | null): MapViewport | null {
  const capture: LiveMapCapture = { viewport: fallback };
  window.dispatchEvent(new CustomEvent(CAPTURE_3D_EVENT, { detail: capture }));
  return capture.viewport;
}
export type MapReturnState = {
  savedAt: number;
  position: Coordinates;
  view: { center: Coordinates; zoom: number };
  searchScope: SearchScope;
  hasGpsPosition: boolean;
  hasManualMapMarker: boolean;
  areaName: string;
  waterEnvironment: 'all' | 'indoor' | 'outdoor';
};
export function isHkPoint(point: Coordinates) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng) && point.lat >= 22 && point.lat <= 23 && point.lng >= 113 && point.lng <= 115;
}
export function official3dUrl(point: Coordinates, language: string): string {
  if (!isHkPoint(point)) throw new Error('Official HK 3D link requires a Hong Kong coordinate');
  // Open3Dhk public application parseLookAt() accepts latitude,longitude,height[c].
  // i=false keeps the target pin without opening a second identify popup; default type=b is oblique 3D.
  const url = new URL('https://3d.map.gov.hk/');
  url.searchParams.set('lookat', `${point.lat.toFixed(6)},${point.lng.toFixed(6)},500c`);
  url.searchParams.set('i', 'false');
  url.searchParams.set('l', language === 'en' ? 'en-US' : 'zh-HK');
  return url.href;
}
export function readMapReturn(storage?: Pick<Storage, 'getItem'>, now = Date.now()): MapReturnState | null {
  try {
    const value = JSON.parse((storage ?? window.sessionStorage).getItem(MAP_RETURN_KEY) || 'null') as MapReturnState;
    if (!value || !Number.isFinite(value.savedAt) || now < value.savedAt || now - value.savedAt > 2 * 60 * 60 * 1000) return null;
    if (!isHkPoint(value.position) || !isHkPoint(value.view?.center) || !Number.isFinite(value.view.zoom) || value.view.zoom < 8 || value.view.zoom > 22) return null;
    if (!['radius', 'viewport'].includes(value.searchScope) || !['all', 'indoor', 'outdoor'].includes(value.waterEnvironment)) return null;
    if (typeof value.hasGpsPosition !== 'boolean' || typeof value.hasManualMapMarker !== 'boolean' || typeof value.areaName !== 'string') return null;
    return value;
  } catch { return null; }
}
export function saveMapReturn(state: MapReturnState, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? window.sessionStorage).setItem(MAP_RETURN_KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export function returnViewport(viewport: MapViewport | null, position: Coordinates): MapReturnState['view'] {
  return { center: viewport?.center ?? position, zoom: viewport?.zoom ?? 14 };
}
