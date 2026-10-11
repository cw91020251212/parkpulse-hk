export const HA_AE_WAITING_TC_URL = 'https://www.ha.org.hk/opendata/aed/aedwtdata2-tc.json';
export const HA_AE_WAITING_EN_URL = 'https://www.ha.org.hk/opendata/aed/aedwtdata2-en.json';
export const HA_AE_WAITING_SOURCE_URL = 'https://data.gov.hk/en-data/dataset/hospital-hadata-ae-waiting-time';
export const LANDSD_LOCATION_SEARCH_URL = 'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch';
export const LANDSD_COORDINATE_TRANSFORM_URL = 'https://www.geodetic.gov.hk/transform/v2/';
export const LANDSD_LOCATION_SEARCH_SOURCE_URL = 'https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-location-search-api';
export const LANDSD_COORDINATE_TRANSFORM_SOURCE_URL = 'https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-coordinates-transformation-api';

const HOSPITALS = [
  { id: 'ahmlnh', nameTc: '雅麗氏何妙齡那打素醫院', nameEn: 'Alice Ho Miu Ling Nethersole Hospital', e: 836056, n: 835459 },
  { id: 'caritas', nameTc: '明愛醫院', nameEn: 'Caritas Medical Centre', e: 833914, n: 822522 },
  { id: 'kwong-wah', nameTc: '廣華醫院', nameEn: 'Kwong Wah Hospital', e: 835760, n: 819534 },
  { id: 'north-district', nameTc: '北區醫院', nameEn: 'North District Hospital', e: 830844, n: 839695 },
  { id: 'north-lantau', nameTc: '北大嶼山醫院', nameEn: 'North Lantau Hospital', e: 811779, n: 815939 },
  { id: 'pamela-youde', nameTc: '東區尤德夫人那打素醫院', nameEn: 'Pamela Youde Nethersole Eastern Hospital', e: 842425, n: 814588 },
  { id: 'pok-oi', nameTc: '博愛醫院', nameEn: 'Pok Oi Hospital', e: 822322, n: 834003 },
  { id: 'prince-of-wales', nameTc: '威爾斯親王醫院', nameEn: 'Prince of Wales Hospital', e: 838848, n: 826722 },
  { id: 'princess-margaret', nameTc: '瑪嘉烈醫院', nameEn: 'Princess Margaret Hospital', e: 831924, n: 822425 },
  { id: 'queen-elizabeth', nameTc: '伊利沙伯醫院', nameEn: 'Queen Elizabeth Hospital', e: 836091, n: 818885 },
  { id: 'queen-mary', nameTc: '瑪麗醫院', nameEn: 'Queen Mary Hospital', e: 831487, n: 814622 },
  { id: 'ruttonjee', nameTc: '律敦治醫院', nameEn: 'Ruttonjee Hospital', e: 836078, n: 815183 },
  { id: 'st-john', nameTc: '長洲醫院', nameEn: 'St. John Hospital', haNameEn: 'St John Hospital', e: 821280, n: 807717 },
  { id: 'tin-shui-wai', nameTc: '天水圍醫院', nameEn: 'Tin Shui Wai Hospital', e: 817618, n: 835449 },
  { id: 'tseung-kwan-o', nameTc: '將軍澳醫院', nameEn: 'Tseung Kwan O Hospital', e: 845883, n: 819921 },
  { id: 'tuen-mun', nameTc: '屯門醫院', nameEn: 'Tuen Mun Hospital', e: 815634, n: 830014 },
  { id: 'united-christian', nameTc: '基督教聯合醫院', nameEn: 'United Christian Hospital', e: 841525, n: 820360 },
  { id: 'yan-chai', nameTc: '仁濟醫院', nameEn: 'Yan Chai Hospital', e: 830385, n: 825607 },
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
  const results = await requestJson(LANDSD_LOCATION_SEARCH_URL, { q: target.nameTc, lang: 'zh-Hant' });
  if (!Array.isArray(results)) throw new Error(`LandsD returned no location array for ${target.nameTc}`);
  const location = results.find((result) => compact(result.nameZH) === target.nameTc && compact(result.nameEN).toLocaleLowerCase() === target.nameEn.toLocaleLowerCase());
  if (!location) throw new Error(`LandsD returned no exact hospital location for ${target.nameTc}`);
  const x = Number(location.x);
  const y = Number(location.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x - target.e, y - target.n) > 50) throw new Error(`LandsD hospital grid point mismatch for ${target.nameTc}`);
  return location;
}

async function transformToWgs84(target) {
  const payload = await requestJson(LANDSD_COORDINATE_TRANSFORM_URL, { inSys: 'hkgrid', outSys: 'wgsgeog', e: target.e, n: target.n });
  const latitude = Number(payload.wgsLat);
  const longitude = Number(payload.wgsLong);
  if (!validCoordinates(latitude, longitude)) throw new Error(`LandsD coordinate transform returned an invalid coordinate for ${target.nameTc}`);
  return { latitude, longitude };
}

export async function buildEmergencyDepartments(generatedAt = new Date().toISOString()) {
  const records = await Promise.all(HOSPITALS.map(async (target) => {
    const [location, coordinates] = await Promise.all([loadOfficialLocation(target), transformToWgs84(target)]);
    return {
      id: `ha-ae-${target.id}`,
      kind: 'emergency',
      nameTc: target.nameTc,
      nameEn: target.nameEn,
      addressTc: compact(location.addressZH) || target.nameTc,
      addressEn: compact(location.addressEN) || target.nameEn,
      districtTc: compact(location.districtZH),
      districtEn: compact(location.districtEN),
      haNameTc: target.nameTc,
      haNameEn: target.haNameEn ?? target.nameEn,
      hkE: target.e,
      hkN: target.n,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      source: '醫院管理局急症室等候時間 · 地政總署官方地圖位置',
      sourceUrl: HA_AE_WAITING_SOURCE_URL,
      locationSourceUrl: LANDSD_LOCATION_SEARCH_SOURCE_URL,
      coordinateTransformSourceUrl: LANDSD_COORDINATE_TRANSFORM_SOURCE_URL,
    };
  }));
  records.sort((left, right) => left.nameTc.localeCompare(right.nameTc, 'zh-Hant'));
  if (records.length !== HOSPITALS.length) throw new Error(`Expected ${HOSPITALS.length} emergency departments, got ${records.length}`);
  return {
    source: '醫院管理局急症室等候時間 · 地政總署官方地圖位置',
    sourceUrl: HA_AE_WAITING_SOURCE_URL,
    locationSourceUrl: LANDSD_LOCATION_SEARCH_SOURCE_URL,
    coordinateTransformSourceUrl: LANDSD_COORDINATE_TRANSFORM_SOURCE_URL,
    generatedAt,
    records,
  };
}
