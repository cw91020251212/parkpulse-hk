export const IMMD_BORDER_RESIDENTS_URL = 'https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeR.json';
export const IMMD_BORDER_VISITORS_URL = 'https://secure1.info.gov.hk/immd/mobileapps/2bb9ae17/data/CPQueueTimeV.json';
export const IMMD_BORDER_SOURCE_URL = 'https://data.gov.hk/en-data/dataset/hk-immd-set28-land-boundary-control-points-waiting-time';
export const LANDSD_LOCATION_SEARCH_URL = 'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch';
export const LANDSD_COORDINATE_TRANSFORM_URL = 'https://www.geodetic.gov.hk/transform/v2/';
export const LANDSD_LOCATION_SEARCH_SOURCE_URL = 'https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-location-search-api';
export const LANDSD_COORDINATE_TRANSFORM_SOURCE_URL = 'https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-coordinates-transformation-api';

const CONTROL_POINTS = [
  { code: 'HYW', nameTc: '香園圍管制站', nameEn: 'Heung Yuen Wai Control Point', query: '香園圍管制站', locationNameEn: 'Heung Yuen Wai Control Point' },
  { code: 'HZM', nameTc: '港珠澳大橋香港口岸', nameEn: 'Hong Kong-Zhuhai-Macao Bridge Hong Kong Port', query: '港珠澳大橋香港口岸', locationNameEn: 'Hong Kong-Zhuhai-Macao Bridge Hong Kong Port' },
  { code: 'LMC', nameTc: '落馬洲管制站', nameEn: 'Lok Ma Chau Control Point', query: '落馬洲管制站', locationNameEn: 'Lok Ma Chau Control Point' },
  { code: 'LSC', nameTc: '落馬洲支線管制站', nameEn: 'Lok Ma Chau Spur Line Control Point', query: '落馬洲支線管制站', locationNameEn: 'Lok Ma Chau Spur Line Control Point' },
  { code: 'LWS', nameTc: '羅湖管制站', nameEn: 'Lo Wu Control Point', query: '羅湖管制站', locationNameEn: 'Lo Wu Control Point' },
  { code: 'MKT', nameTc: '文錦渡管制站', nameEn: 'Man Kam To Control Point', query: '文錦渡管制站', locationNameEn: 'Man Kam To Control Point' },
  { code: 'SBC', nameTc: '深圳灣管制站', nameEn: 'Shenzhen Bay Control Point', query: '深圳灣管制站', locationNameEn: 'Shenzhen Bay Control Point' },
  { code: 'STK', nameTc: '沙頭角管制站', nameEn: 'Sha Tau Kok Control Point', query: '沙頭角管制站', locationNameEn: 'Sha Tau Kok Control Point' },
];

function compact(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function validCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= 22.13 && latitude <= 22.57
    && longitude >= 113.8 && longitude <= 114.5;
}

async function requestJson(url, query = {}) {
  const requestUrl = new URL(url);
  Object.entries(query).forEach(([key, value]) => requestUrl.searchParams.set(key, String(value)));
  const response = await fetch(requestUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${requestUrl} returned ${response.status}`);
  return response.json();
}

async function loadOfficialLocation(target) {
  const results = await requestJson(LANDSD_LOCATION_SEARCH_URL, { q: target.query, lang: 'zh-Hant' });
  if (!Array.isArray(results)) throw new Error(`LandsD returned no location array for ${target.nameTc}`);
  const location = results.find((result) => compact(result.nameEN).toLocaleLowerCase() === target.locationNameEn.toLocaleLowerCase());
  const x = Number(location?.x);
  const y = Number(location?.y);
  if (!location || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`LandsD returned no matching control-point location for ${target.nameTc}`);
  return { location, x, y };
}

async function transformToWgs84(target, e, n) {
  const payload = await requestJson(LANDSD_COORDINATE_TRANSFORM_URL, { inSys: 'hkgrid', outSys: 'wgsgeog', e, n });
  const latitude = Number(payload.wgsLat);
  const longitude = Number(payload.wgsLong);
  if (!validCoordinates(latitude, longitude)) throw new Error(`LandsD coordinate transform returned invalid coordinates for ${target.nameTc}`);
  return { latitude, longitude };
}

function queue(value) {
  const numeric = Number(value);
  return [0, 1, 2, 4, 99].includes(numeric) ? numeric : 4;
}

export async function buildBorderControlPoints(generatedAt = new Date().toISOString()) {
  const [residentsResponse, visitorsResponse] = await Promise.all([
    fetch(IMMD_BORDER_RESIDENTS_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) }),
    fetch(IMMD_BORDER_VISITORS_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) }),
  ]);
  if (!residentsResponse.ok || !visitorsResponse.ok) throw new Error('Immigration Department waiting-time service returned an error');
  const [residents, visitors] = await Promise.all([residentsResponse.json(), visitorsResponse.json()]);
  const missingCodes = CONTROL_POINTS
    .filter(({ code }) => !residents?.[code] || !visitors?.[code])
    .map(({ code }) => code);
  if (missingCodes.length) {
    throw new Error(`Immigration Department payload is missing supported control point(s): ${missingCodes.join(', ')}`);
  }
  const availableCodes = CONTROL_POINTS;

  const records = await Promise.all(availableCodes.map(async (target) => {
    const { location, x, y } = await loadOfficialLocation(target);
    const coordinates = await transformToWgs84(target, x, y);
    return {
      id: `immd-border-${target.code.toLowerCase()}`,
      kind: 'border',
      code: target.code,
      nameTc: target.nameTc,
      nameEn: target.nameEn,
      addressTc: compact(location.addressZH) || target.nameTc,
      addressEn: compact(location.addressEN) || target.nameEn,
      hkE: x,
      hkN: y,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      residents: { arrival: queue(residents[target.code].arrQueue), departure: queue(residents[target.code].depQueue) },
      visitors: { arrival: queue(visitors[target.code].arrQueue), departure: queue(visitors[target.code].depQueue) },
      source: '入境事務處陸路邊境管制站等候時間官方快照',
      sourceUrl: IMMD_BORDER_SOURCE_URL,
      locationSourceUrl: LANDSD_LOCATION_SEARCH_SOURCE_URL,
      coordinateTransformSourceUrl: LANDSD_COORDINATE_TRANSFORM_SOURCE_URL,
    };
  }));
  records.sort((left, right) => left.nameTc.localeCompare(right.nameTc, 'zh-Hant'));
  return {
    source: '入境事務處陸路邊境管制站等候時間官方快照',
    sourceUrl: IMMD_BORDER_SOURCE_URL,
    generatedAt,
    residentsLastModified: residentsResponse.headers.get('last-modified') ?? undefined,
    visitorsLastModified: visitorsResponse.headers.get('last-modified') ?? undefined,
    locationSourceUrl: LANDSD_LOCATION_SEARCH_SOURCE_URL,
    coordinateTransformSourceUrl: LANDSD_COORDINATE_TRANSFORM_SOURCE_URL,
    records,
  };
}
