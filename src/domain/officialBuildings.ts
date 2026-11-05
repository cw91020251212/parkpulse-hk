/** Lands Department Building blocks: BaseHeight/TopHeight are metres above HK Principal Datum. */
export type OfficialBuildingBounds = { west: number; south: number; east: number; north: number };
export type OfficialBuildingHeight = {
  baseHeight: number | null;
  topHeight: number | null;
  height: number;
  heightKnown: boolean;
};
export type OfficialBuildingProperties = OfficialBuildingHeight & {
  objectId: number;
  geoRefNo: string | null;
  blockType: string | null;
  nameEn: string | null;
  nameTc: string | null;
  status: 'Active';
  extrusionBase: 0;
  heightDatum: 'mPD';
  OBJECTID: number;
  GeoRefNo: string | null;
  BuildingBlockType: string | null;
  BuildingNameEN: string | null;
  BuildingNameTC: string | null;
  BaseHeight: number | null;
  TopHeight: number | null;
};
export type OfficialBuildingGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };
export type OfficialBuildingFeature = {
  type: 'Feature'; id: number; geometry: OfficialBuildingGeometry; properties: OfficialBuildingProperties;
};
export type OfficialBuildingCollection = { type: 'FeatureCollection'; features: OfficialBuildingFeature[] };
export type NormalizedOfficialBuildings = {
  data: OfficialBuildingCollection;
  sourceCount: number;
  missingHeightCount: number;
  rejectedCount: number;
};

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const optionalText = (value: unknown): string | null => typeof value === 'string' ? value : null;

/** Never coerce null, numeric strings or storeys into surveyed metres. */
export function normalizeOfficialBuildingHeight(base: unknown, top: unknown): OfficialBuildingHeight {
  const baseHeight = finiteNumber(base) ? base : null;
  const topHeight = finiteNumber(top) ? top : null;
  const difference = baseHeight !== null && topHeight !== null ? topHeight - baseHeight : NaN;
  const heightKnown = Number.isFinite(difference) && difference >= 0;
  return { baseHeight, topHeight, height: heightKnown ? difference : 0, heightKnown };
}

// A geographic HK screening envelope, not a land-boundary mask (offshore buildings are valid).
function validPosition(value: unknown): value is number[] {
  return Array.isArray(value) && value.length === 2 && value.every(finiteNumber)
    && value[0] >= 113.8 && value[0] <= 114.5 && value[1] >= 22.1 && value[1] <= 22.6;
}
function validRing(value: unknown): value is number[][] {
  if (!Array.isArray(value) || value.length < 4 || !value.every(validPosition)) return false;
  const first = value[0];
  const last = value[value.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return false;
  // Reject collapsed rings, while retaining holes and either winding order.
  const area = value.slice(1).reduce((sum, position, i) =>
    sum + (value[i][0] - first[0]) * (position[1] - first[1])
      - (position[0] - first[0]) * (value[i][1] - first[1]), 0);
  return Number.isFinite(area) && area !== 0;
}
function validPolygon(value: unknown): value is number[][][] {
  return Array.isArray(value) && value.length > 0 && value.every(validRing);
}
function normalizeGeometry(value: unknown): OfficialBuildingGeometry | null {
  if (!record(value)) return null;
  if (value.type === 'Polygon' && validPolygon(value.coordinates)) {
    return { type: 'Polygon', coordinates: value.coordinates };
  }
  if (value.type === 'MultiPolygon' && Array.isArray(value.coordinates)
    && value.coordinates.length > 0 && value.coordinates.every(validPolygon)) {
    return { type: 'MultiPolygon', coordinates: value.coordinates };
  }
  return null;
}

export function normalizeOfficialBuildingFeature(value: unknown): OfficialBuildingFeature | null {
  if (!record(value) || value.type !== 'Feature' || !record(value.properties)) return null;
  const properties = value.properties;
  const objectId = properties.OBJECTID;
  if (!finiteNumber(objectId) || !Number.isSafeInteger(objectId) || objectId <= 0 || properties.Status !== 'Active') return null;
  const geometry = normalizeGeometry(value.geometry);
  if (!geometry) return null;
  const height = normalizeOfficialBuildingHeight(properties.BaseHeight, properties.TopHeight);
  const geoRefNo = optionalText(properties.GeoRefNo);
  const blockType = optionalText(properties.BuildingBlockType);
  const nameEn = optionalText(properties.BuildingNameEN);
  const nameTc = optionalText(properties.BuildingNameTC);
  return {
    type: 'Feature', id: objectId, geometry,
    properties: {
      ...height, objectId, geoRefNo, blockType, nameEn, nameTc, status: 'Active',
      // Block thickness only. Podium/tower overlap needs separate treatment by the renderer;
      // absolute mPD must NOT be used as a ground-relative extrusion base.
      extrusionBase: 0, heightDatum: 'mPD',
      OBJECTID: objectId, GeoRefNo: geoRefNo, BuildingBlockType: blockType,
      BuildingNameEN: nameEn, BuildingNameTC: nameTc,
      BaseHeight: height.baseHeight, TopHeight: height.topHeight,
    },
  };
}
export const normalizeOfficialBuilding = normalizeOfficialBuildingFeature;

/** A malformed/error response is not an empty, successful official dataset. */
export function normalizeOfficialBuildings(value: unknown): NormalizedOfficialBuildings {
  if (!record(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
    throw new TypeError('Official buildings response must be a GeoJSON FeatureCollection');
  }
  const features: OfficialBuildingFeature[] = [];
  let missingHeightCount = 0;
  let rejectedCount = 0;
  for (const raw of value.features) {
    const feature = normalizeOfficialBuildingFeature(raw);
    if (!feature) { rejectedCount++; continue; }
    features.push(feature);
    if (!feature.properties.heightKnown) missingHeightCount++;
  }
  return { data: { type: 'FeatureCollection', features }, sourceCount: value.features.length, missingHeightCount, rejectedCount };
}
