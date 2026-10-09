export const MOTORCYCLE_ROADSIDE_WFS_URL = 'https://www.hkemobility.gov.hk/api/drss/layer/map/?typeName=DRSS%3AVW_ON_STREET_PARKING&service=WFS&version=1.0.0&request=GetFeature&outputFormat=application%2Fjson&srsName=EPSG%3A4326&CQL_FILTER=VEHICLE_TYPE%20%3D%20%27Motor%20Cycles%27';
export const MOTORCYCLE_ROADSIDE_SOURCE = '運輸署／香港出行易官方電單車路邊泊位圖層';

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function common(values) {
  const counts = new Map();
  for (const value of values.map(text).filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

export function buildMotorcycleRoadside(payload, generatedAt = new Date().toISOString()) {
  const records = Array.isArray(payload?.features) ? payload.features.filter((feature) => {
    const [longitude, latitude] = feature?.geometry?.coordinates ?? [];
    return feature?.geometry?.type === 'Point'
      && feature?.properties?.VEHICLE_TYPE === 'Motor Cycles'
      && Number.isFinite(longitude)
      && Number.isFinite(latitude);
  }) : [];

  if (records.length < 10_000) throw new Error('HKeMobility returned too few motorcycle roadside spaces');

  const groups = new Map();
  for (const record of records) {
    const properties = record.properties;
    const name = text(properties.STREET_NAME_TC) || text(properties.STREET_NAME_EN) || '電單車路邊泊位';
    const nameEn = text(properties.STREET_NAME_EN) || name;
    const key = `${name}\u0000${nameEn}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  const roadsideGroups = [...groups.entries()].map(([key, members]) => {
    const first = members[0];
    const name = text(first.properties.STREET_NAME_TC) || text(first.properties.STREET_NAME_EN) || '電單車路邊泊位';
    const nameEn = text(first.properties.STREET_NAME_EN) || name;
    const total = members.length;
    return {
      id: `motorcycle:${encodeURIComponent(key)}`,
      kind: 'motorcycle',
      name,
      nameEn,
      address: name,
      addressEn: nameEn,
      sections: [name],
      latitude: members.reduce((sum, item) => sum + item.geometry.coordinates[1], 0) / total,
      longitude: members.reduce((sum, item) => sum + item.geometry.coordinates[0], 0) / total,
      total,
      vacant: 0,
      occupied: 0,
      unavailable: 0,
      occupancy: 'unavailable',
      operatingPeriod: common(members.map((item) => item.properties.HOUR_TC)),
      operatingPeriodEn: common(members.map((item) => item.properties.HOUR_EN)),
      vehicleType: 'Motor Cycles',
      source: MOTORCYCLE_ROADSIDE_SOURCE,
      sourceUrl: MOTORCYCLE_ROADSIDE_WFS_URL,
      snapshot: true,
      static: true,
      metered: members.some((item) => Number(item.properties.METER) === 1),
    };
  }).sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'));

  return {
    source: MOTORCYCLE_ROADSIDE_SOURCE,
    sourceUrl: MOTORCYCLE_ROADSIDE_WFS_URL,
    generatedAt,
    recordCount: records.length,
    groups: roadsideGroups,
  };
}
