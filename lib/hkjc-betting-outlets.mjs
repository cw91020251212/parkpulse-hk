export const LANDSD_LOCATION_SEARCH_URL = 'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch';
export const LANDSD_COORDINATE_TRANSFORM_URL = 'https://www.geodetic.gov.hk/transform/v2/';
export const LANDSD_LOCATION_SOURCE_URL = 'https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-location-search-api';
export const LANDSD_COORDINATE_SOURCE_URL = 'https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-coordinates-transformation-api';

function compact(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return compact(value).normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '').toLocaleLowerCase();
}

function editDistance(left, right) {
  const a = Array.from(normalize(left));
  const b = Array.from(normalize(right));
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

export function addressMatchScore(expected, actual) {
  const left = normalize(expected);
  const right = normalize(actual);
  if (!left || !right) return 0;
  return 1 - editDistance(left, right) / Math.max(left.length, right.length);
}

export function selectHkjcLocation(record, results) {
  const targetName = record.locationNameTc ?? '香港賽馬會';
  const candidates = (Array.isArray(results) ? results : []).filter((item) => compact(item.nameZH) === targetName && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)));
  if (!candidates.length) throw new Error(`地政總署未回傳「${targetName}」位置：${record.nameTc}`);

  const ranked = candidates.map((location) => ({ location, score: addressMatchScore(record.addressTc, location.addressZH) })).sort((left, right) => right.score - left.score);
  const best = ranked[0];
  if (best.score < 0.34) throw new Error(`地政總署地址相似度過低（${best.score.toFixed(3)}）：${record.nameTc}`);
  if (ranked.length > 1 && best.score - ranked[1].score < 0.06) throw new Error(`地政總署回傳多個相近位置，無法安全選擇：${record.nameTc}`);
  return { location: best.location, addressMatchScore: Number(best.score.toFixed(3)) };
}

async function requestJson(baseUrl, query, label) {
  const url = new URL(baseUrl);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', Referer: 'https://www.map.gov.hk/gm/', 'User-Agent': 'ParkPulse HK official location snapshot' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw new Error(`${label} 請求失敗：${lastError instanceof Error ? lastError.message : lastError}`);
}

function validHongKongCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= 22.13 && latitude <= 22.57
    && longitude >= 113.8 && longitude <= 114.5;
}

async function withConcurrency(items, limit, worker) {
  const output = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  }));
  return output;
}

async function buildRecord(record, directory) {
  const searchQuery = record.locationQueryTc ?? record.addressTc;
  const locations = await requestJson(LANDSD_LOCATION_SEARCH_URL, { q: searchQuery, lang: 'zh-Hant', n: 50 }, `Location Search ${record.id}`);
  if (!Array.isArray(locations)) throw new Error(`地政總署位置搜尋沒有回傳陣列：${record.id}`);
  const { location, addressMatchScore: score } = selectHkjcLocation(record, locations);
  const hkE = Number(location.x);
  const hkN = Number(location.y);
  const transformed = await requestJson(LANDSD_COORDINATE_TRANSFORM_URL, { inSys: 'hkgrid', outSys: 'wgsgeog', e: hkE, n: hkN }, `座標轉換 ${record.id}`);
  const latitude = Number(transformed.wgsLat);
  const longitude = Number(transformed.wgsLong);
  if (!validHongKongCoordinates(latitude, longitude)) throw new Error(`地政總署回傳香港範圍以外座標：${record.id}`);
  return {
    id: record.id,
    kind: 'hkjc',
    nameTc: record.nameTc,
    nameEn: record.nameEn,
    addressTc: record.addressTc,
    addressEn: record.addressEn,
    latitude,
    longitude,
    hkE,
    hkN,
    locationNameTc: compact(location.nameZH),
    locationAddressTc: compact(location.addressZH),
    locationDistrictTc: compact(location.districtZH),
    locationPrecision: record.locationPrecision ?? 'outlet',
    ...(record.locationNoteTc ? { locationNoteTc: record.locationNoteTc } : {}),
    ...(record.locationNoteEn ? { locationNoteEn: record.locationNoteEn } : {}),
    addressMatchScore: score,
    directoryUpdatedAt: directory.directoryUpdatedAt,
    sourceCheckedAt: directory.sourceCheckedAt,
    sourceUrl: directory.sourceUrl,
    sourcePdfTc: directory.sourcePdfTc,
    sourcePdfEn: directory.sourcePdfEn,
    locationSourceUrl: directory.locationSourceUrl ?? LANDSD_LOCATION_SOURCE_URL,
    coordinateTransformSourceUrl: directory.coordinateTransformSourceUrl ?? LANDSD_COORDINATE_SOURCE_URL,
  };
}

export async function buildHkjcBettingOutlets(directory, generatedAt = new Date().toISOString(), onProgress = () => {}) {
  const records = directory?.records;
  if (!Array.isArray(records) || records.length !== 83) throw new Error(`賽馬會官方來源目錄應有 83 間分店，實際為 ${records?.length ?? 0}`);
  const ids = new Set();
  for (const record of records) {
    if (!record.id || ids.has(record.id)) throw new Error(`賽馬會分店 ID 缺漏或重複：${record.id ?? '(empty)'}`);
    ids.add(record.id);
    if (!record.nameTc || !record.nameEn || !record.addressTc || !record.addressEn) throw new Error(`賽馬會分店名稱或地址不完整：${record.id}`);
  }
  const outlets = await withConcurrency(records, 4, async (record, index) => {
    const outlet = await buildRecord(record, directory);
    onProgress(index + 1, records.length, outlet);
    return outlet;
  });
  const outletPoints = outlets.filter((record) => record.locationPrecision === 'outlet').length;
  const buildingPoints = outlets.filter((record) => record.locationPrecision === 'building').length;
  if (outletPoints !== 82 || buildingPoints !== 1) throw new Error(`位置精度預期為 82 個分店點及 1 個大廈點，實際 ${outletPoints}/${buildingPoints}`);
  return {
    source: { 'zh-Hant': '香港賽馬會官方場外投注處名錄', en: 'Hong Kong Jockey Club official off-course betting outlet directory' },
    generatedAt,
    directoryUpdatedAt: directory.directoryUpdatedAt,
    sourceCheckedAt: directory.sourceCheckedAt,
    sourceUrl: directory.sourceUrl,
    sourcePdfTc: directory.sourcePdfTc,
    sourcePdfEn: directory.sourcePdfEn,
    locationSourceUrl: directory.locationSourceUrl ?? LANDSD_LOCATION_SOURCE_URL,
    coordinateTransformSourceUrl: directory.coordinateTransformSourceUrl ?? LANDSD_COORDINATE_SOURCE_URL,
    records: outlets,
  };
}
