import { useEffect, useState } from 'react';
import type { Map as LibreMap, GeoJSONSource } from 'maplibre-gl';
import { loadOfficialBuildings, type OfficialBuildingsResult } from '../api/officialBuildings';
import { publicAsset } from '../api/site';
import { createOfficialBuildingLayer, isOfficialBuildingMesh, type OfficialBuildingMesh } from './OfficialBuildingLayer';

export const OFFICIAL_BUILDING_SOURCE = 'parkpulse-official-buildings';
export const OFFICIAL_BUILDING_LAYER = 'parkpulse-3d-buildings';
const PILOT_LAYER = 'parkpulse-official-nts-model';
const PILOT_OBJECT_ID = 216947;
const EMPTY = { type: 'FeatureCollection' as const, features: [] };
const MIN_ZOOM = 14;
let cachedPilot: OfficialBuildingMesh | undefined;
const viewportCache = new Map<string, { result: OfficialBuildingsResult; savedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX_RECORDS = 12_000;

type BuildingsStatus = 'zoom' | 'loading' | 'ready' | 'partial' | 'error';
type Report = { status: BuildingsStatus; missingHeightCount: number; sourceCount: number; pilot: 'none' | 'loading' | 'ready' | 'error' };
const INITIAL: Report = { status: 'loading', missingHeightCount: 0, sourceCount: 0, pilot: 'none' };

async function loadPilot(signal: AbortSignal): Promise<OfficialBuildingMesh> {
  if (cachedPilot) return cachedPilot;
  const response = await fetch(publicAsset('data/official-3d/nts-police-mesh.json'), { signal, credentials: 'omit' });
  if (!response.ok) throw new Error(`Official model HTTP ${response.status}`);
  const value: unknown = await response.json();
  if (!isOfficialBuildingMesh(value)) throw new Error('Official model format is invalid');
  cachedPilot = value;
  return value;
}

function pilotFilter(map: LibreMap, loaded: boolean) {
  if (!map.getLayer(OFFICIAL_BUILDING_LAYER)) return;
  // Remove only this surveyed HQ footprint, not neighbouring buildings or the
  // entire OSM merged feature. The exact mesh retains its lower podium profile.
  map.setFilter(OFFICIAL_BUILDING_LAYER, loaded
    ? ['all', ['==', ['get', 'heightKnown'], true], ['!=', ['get', 'objectId'], PILOT_OBJECT_ID]]
    : ['==', ['get', 'heightKnown'], true]);
}

export function useOfficial3DBuildings(map: LibreMap | null, ready: boolean) {
  const [report, setReport] = useState<Report>(INITIAL);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!map || !ready) return;
    let disposed = false;
    let timer = 0;
    let sequence = 0;
    let controller: AbortController | undefined;
    const clearPilot = () => {
      if (map.getLayer(PILOT_LAYER)) map.removeLayer(PILOT_LAYER);
      pilotFilter(map, false);
    };
    const update = async () => {
      if (disposed) return;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      const currentSequence = ++sequence;
      if (map.getZoom() < MIN_ZOOM) {
        clearPilot();
        (map.getSource(OFFICIAL_BUILDING_SOURCE) as GeoJSONSource | undefined)?.setData(EMPTY);
        setReport({ ...INITIAL, status: 'zoom' });
        return;
      }
      const viewport = map.getBounds();
      const bounds = { west: Math.max(113.80, viewport.getWest()), east: Math.min(114.45, viewport.getEast()), south: Math.max(22.10, viewport.getSouth()), north: Math.min(22.60, viewport.getNorth()) };
      const current = () => !disposed && !signal.aborted && sequence === currentSequence;
      const includesPilot = bounds.west <= 114.1240 && bounds.east >= 114.1215 && bounds.south <= 22.3720 && bounds.north >= 22.3700;
      if (!includesPilot) clearPilot();
      setReport(previous => ({ ...previous, status: 'loading', pilot: includesPilot ? (map.getLayer(PILOT_LAYER) ? 'ready' : 'loading') : 'none' }));
      if (includesPilot) {
        // A tiny local attributed asset: no government demo key in production.
        void loadPilot(signal).then(mesh => {
          if (!current()) return;
          if (!map.getLayer(PILOT_LAYER)) {
            const label = map.getStyle().layers?.find(layer => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;
            map.addLayer(createOfficialBuildingLayer(mesh), label);
          }
          pilotFilter(map, true);
          setReport(previous => ({ ...previous, pilot: 'ready' }));
        }).catch(() => {
          if (!current()) return;
          clearPilot();
          setReport(previous => ({ ...previous, pilot: 'error' }));
        });
      }
      if (bounds.west >= bounds.east || bounds.south >= bounds.north) {
        (map.getSource(OFFICIAL_BUILDING_SOURCE) as GeoJSONSource | undefined)?.setData(EMPTY);
        setReport(previous => ({ ...previous, status: 'ready', missingHeightCount: 0, sourceCount: 0 }));
        return;
      }
      try {
        // Snap outward, never inward: each cached response covers every viewport
        // sharing its key. No localStorage or precise GPS position is persisted.
        const step = 0.002;
        const queryBounds = { west: Math.floor(bounds.west / step) * step, south: Math.floor(bounds.south / step) * step, east: Math.ceil(bounds.east / step) * step, north: Math.ceil(bounds.north / step) * step };
        const cacheKey = Object.values(queryBounds).map(value => value.toFixed(3)).join(',');
        const cached = viewportCache.get(cacheKey);
        const result = cached && Date.now() - cached.savedAt < CACHE_TTL
          ? cached.result : await loadOfficialBuildings(queryBounds, { signal });
        if (!current()) return;
        if (result.complete) {
          viewportCache.delete(cacheKey);
          viewportCache.set(cacheKey, { result, savedAt: Date.now() });
          while (viewportCache.size > 4 || [...viewportCache.values()].reduce((count, value) => count + value.result.sourceCount, 0) > CACHE_MAX_RECORDS) {
            viewportCache.delete(viewportCache.keys().next().value!);
          }
        }
        (map.getSource(OFFICIAL_BUILDING_SOURCE) as GeoJSONSource | undefined)?.setData(result.data);
        pilotFilter(map, Boolean(map.getLayer(PILOT_LAYER)));
        setReport(previous => ({ ...previous, status: result.complete ? 'ready' : 'partial', missingHeightCount: result.missingHeightCount, sourceCount: result.sourceCount }));
      } catch {
        if (!current()) return;
        // Never substitute an invented one-storey or uniform 5m 3D layer.
        (map.getSource(OFFICIAL_BUILDING_SOURCE) as GeoJSONSource | undefined)?.setData(EMPTY);
        setReport(previous => ({ ...previous, status: 'error', sourceCount: 0, missingHeightCount: 0 }));
      }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      controller?.abort();
      sequence += 1;
      timer = window.setTimeout(() => { void update(); }, 350);
    };
    map.on('moveend', schedule);
    map.on('resize', schedule);
    void update();
    return () => {
      disposed = true;
      controller?.abort();
      window.clearTimeout(timer);
      map.off('moveend', schedule);
      map.off('resize', schedule);
      // The map's own remove() also safely frees custom-layer GPU resources.
      try { clearPilot(); } catch { /* map may already have been destroyed */ }
    };
  }, [map, ready, retry]);
  return { ...report, retry: () => setRetry(value => value + 1) };
}
