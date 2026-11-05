import { normalizeOfficialBuildings } from '../domain/officialBuildings.ts';
import type { OfficialBuildingBounds, OfficialBuildingCollection } from '../domain/officialBuildings.ts';

export const OFFICIAL_BUILDINGS_SOURCE_URL = 'https://portal.csdi.gov.hk/server/rest/services/common/landsd_rcd_1637211194312_35158/FeatureServer/0/query';
export const OFFICIAL_BUILDINGS_ATTRIBUTION = 'Buildings: © HKSAR Government, Lands Department — CSDI Portal';
export const OFFICIAL_BUILDINGS_PAGE_SIZE = 1000;
export const OFFICIAL_BUILDINGS_MAX_FEATURES = 10_000;
const QUERY_TIMEOUT_MS = 15_000;
const MAX_QUERIES = 32;

export type OfficialBuildingsResult = {
  data: OfficialBuildingCollection;
  complete: boolean;
  missingHeightCount: number;
  /** Valid official footprints returned, including those without height. */
  sourceCount: number;
  /** Raw source records received; this count drives pagination rather than valid footprints. */
  queriedCount: number;
  rejectedCount: number;
  generatedAt: string;
  sourceUrl: string;
  attribution: string;
  bounds: OfficialBuildingBounds;
};
export type LoadOfficialBuildingsOptions = { signal?: AbortSignal; maxFeatures?: number };

function validateBounds(bounds: OfficialBuildingBounds): void {
  if (!bounds || ![bounds.west, bounds.south, bounds.east, bounds.north]
    .every(value => typeof value === 'number' && Number.isFinite(value))
    || bounds.west < -180 || bounds.east > 180 || bounds.south < -90 || bounds.north > 90
    || bounds.west >= bounds.east || bounds.south >= bounds.north) {
    throw new TypeError('Official buildings require a finite, ordered WGS84 envelope');
  }
}
export function buildOfficialBuildingsUrl(bounds: OfficialBuildingBounds, resultOffset = 0, resultRecordCount = OFFICIAL_BUILDINGS_PAGE_SIZE): string {
  validateBounds(bounds);
  if (!Number.isSafeInteger(resultOffset) || resultOffset < 0
    || !Number.isSafeInteger(resultRecordCount) || resultRecordCount < 1 || resultRecordCount > OFFICIAL_BUILDINGS_PAGE_SIZE) {
    throw new TypeError('Invalid official buildings pagination');
  }
  const url = new URL(OFFICIAL_BUILDINGS_SOURCE_URL);
  url.search = new URLSearchParams({
    f: 'geojson', where: "Status='Active'",
    geometry: JSON.stringify({ xmin: bounds.west, ymin: bounds.south, xmax: bounds.east, ymax: bounds.north, spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryEnvelope', inSR: '4326', outSR: '4326',
    spatialRel: 'esriSpatialRelIntersects', returnGeometry: 'true',
    outFields: 'OBJECTID,GeoRefNo,BuildingBlockType,Status,BuildingNameEN,BuildingNameTC,BaseHeight,TopHeight',
    orderByFields: 'OBJECTID ASC', resultOffset: String(resultOffset), resultRecordCount: String(resultRecordCount),
  }).toString();
  return url.href;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException('Official buildings request aborted', 'AbortError');
}
async function queryPage(url: string, signal?: AbortSignal): Promise<unknown> {
  throwIfAborted(signal);
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason ?? new DOMException('Official buildings request aborted', 'AbortError'));
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Official buildings query timed out', 'TimeoutError')), QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
    throwIfAborted(controller.signal);
    if (!response.ok) throw new Error(`Official buildings returned HTTP ${response.status}`);
    const body: unknown = await response.json();
    throwIfAborted(controller.signal);
    if (typeof body === 'object' && body !== null && 'error' in body) throw new Error('Official buildings service returned an ArcGIS error');
    return body;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/** No backend, API key, invented-height fallback, automatic retry or shared abortable promise. */
export async function loadOfficialBuildings(bounds: OfficialBuildingBounds, options: LoadOfficialBuildingsOptions = {}): Promise<OfficialBuildingsResult> {
  validateBounds(bounds);
  const maxFeatures = options.maxFeatures === undefined ? OFFICIAL_BUILDINGS_MAX_FEATURES : options.maxFeatures;
  if (!Number.isSafeInteger(maxFeatures) || maxFeatures < 1 || maxFeatures > OFFICIAL_BUILDINGS_MAX_FEATURES) {
    throw new TypeError('Official buildings maxFeatures must be an integer from 1 to 10000');
  }
  throwIfAborted(options.signal);
  const requestedBounds = { west: bounds.west, south: bounds.south, east: bounds.east, north: bounds.north };
  const data: OfficialBuildingCollection = { type: 'FeatureCollection', features: [] };
  const seen = new Set<number>();
  let sourceCount = 0;
  let missingHeightCount = 0;
  let rejectedCount = 0;
  let complete = false;
  let queryCount = 0;
  while (sourceCount < maxFeatures && queryCount < MAX_QUERIES) {
    throwIfAborted(options.signal);
    const requestedCount = Math.min(OFFICIAL_BUILDINGS_PAGE_SIZE, maxFeatures - sourceCount);
    const body = await queryPage(buildOfficialBuildingsUrl(requestedBounds, sourceCount, requestedCount), options.signal);
    queryCount++;
    const page = normalizeOfficialBuildings(body);
    const transferLimited = (body as { exceededTransferLimit?: unknown; properties?: { exceededTransferLimit?: unknown } }).exceededTransferLimit === true
      || (body as { properties?: { exceededTransferLimit?: unknown } }).properties?.exceededTransferLimit === true;
    // Some ArcGIS servers return more than requested, up to their 3000-record cap.
    // Count/offset by actual records, but never expose more than our own total cap.
    const remaining = maxFeatures - sourceCount;
    const raw = (body as { features: unknown[] }).features;
    const accepted = page.sourceCount > remaining
      ? normalizeOfficialBuildings({ type: 'FeatureCollection', features: raw.slice(0, remaining) }) : page;
    for (const feature of accepted.data.features) {
      if (seen.has(feature.id)) throw new Error('Official buildings pagination repeated an OBJECTID');
      seen.add(feature.id);
      data.features.push(feature);
    }
    sourceCount += page.sourceCount;
    missingHeightCount += accepted.missingHeightCount;
    rejectedCount += accepted.rejectedCount;
    if (page.sourceCount === 0) {
      // An empty page that still advertises truncation cannot establish completeness.
      complete = !transferLimited;
      break;
    }
    if (page.sourceCount < requestedCount && !transferLimited) { complete = true; break; }
    // A full page is NEVER proof that pagination finished, even without a transfer flag.
    // Hitting the bounded cap leaves complete=false rather than silently omitting records.
  }
  throwIfAborted(options.signal);
  return {
    data, complete: complete && rejectedCount === 0, missingHeightCount,
    sourceCount: data.features.length, queriedCount: sourceCount, rejectedCount,
    generatedAt: new Date().toISOString(), sourceUrl: OFFICIAL_BUILDINGS_SOURCE_URL,
    attribution: OFFICIAL_BUILDINGS_ATTRIBUTION, bounds: requestedBounds,
  };
}
