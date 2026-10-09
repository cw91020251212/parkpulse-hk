const GPA_CARPARKS_URL = 'https://www.gpa.gov.hk/doc/psi/ds/psi-t-cp_TC.json';
const GPA_DATASET_URL = 'https://data.gov.hk/tc-data/dataset/hk-gpa-msd-gpa-psi-t-cp';
const LOCATION_SEARCH_URL = 'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch';
const COORDINATE_TRANSFORM_URL = 'https://www.geodetic.gov.hk/transform/v2/';

const VEHICLE_KEYS = {
  privateCar: 'P',
  motorCycle: 'M',
};

function parseJsonWithLiteralNewlines(raw) {
  let escaped = false;
  let insideString = false;
  let repaired = '';

  for (const character of raw.replace(/^\uFEFF/, '')) {
    if (insideString && (character === '\n' || character === '\r')) {
      if (character === '\n') repaired += '\\n';
      continue;
    }
    repaired += character;
    if (character === '"' && !escaped) insideString = !insideString;
    escaped = character === '\\' && !escaped;
    if (character !== '\\') escaped = false;
  }

  return JSON.parse(repaired);
}

function asPositiveNumber(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function spaceCount(value, code) {
  const match = String(value ?? '').match(new RegExp(`(\\d[\\d,]*)\\s*\\(${code}\\)`, 'i'));
  return match ? asPositiveNumber(match[1]) : undefined;
}

function minimumHeight(value) {
  const values = String(value ?? '').match(/\d+(?:\.\d+)?/g)?.map(Number).filter((height) => height > 0) ?? [];
  return values.length ? Math.min(...values) : undefined;
}

function sourceNote(record) {
  const vehicleType = String(record['車輛類型'] ?? '');
  const prices = String(record['停車收費資料'] ?? '').trim();
  if (!prices) return undefined;
  const vehiclePrefix = vehicleType.includes('汽車') ? '私家車\n' : '';
  return `${vehiclePrefix}${prices}`;
}

async function requestJson(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

async function coordinatesFor(record, signal) {
  const search = new URL(LOCATION_SEARCH_URL);
  search.searchParams.set('q', record['停車場名稱']);
  search.searchParams.set('n', '10');
  const matches = await requestJson(search, signal);
  const match = matches.find((item) => item.nameZH === record['停車場名稱']) ?? matches[0];
  if (!match || !Number.isFinite(match.x) || !Number.isFinite(match.y)) {
    throw new Error(`Lands Department could not locate ${record['停車場名稱']}`);
  }

  const transform = new URL(COORDINATE_TRANSFORM_URL);
  transform.searchParams.set('inSys', 'hkgrid');
  transform.searchParams.set('outSys', 'wgsgeog');
  transform.searchParams.set('n', String(match.y));
  transform.searchParams.set('e', String(match.x));
  const location = await requestJson(transform, signal);
  if (!Number.isFinite(location.wgsLat) || !Number.isFinite(location.wgsLong)) {
    throw new Error(`Lands Department could not transform ${record['停車場名稱']}`);
  }

  return {
    latitude: location.wgsLat,
    longitude: location.wgsLong,
    district: match.districtZH || record['區域'] || '',
  };
}

function normaliseRecord(record, index, coordinates) {
  const privateCarSpaces = spaceCount(record['停車場規模(含殘疾人士停車位)'], VEHICLE_KEYS.privateCar);
  const motorcycleSpaces = spaceCount(record['停車場規模(含殘疾人士停車位)'], VEHICLE_KEYS.motorCycle);
  const disabledSpaces = asPositiveNumber(record['殘疾人士停車位數量']);
  const height = minimumHeight(record['高度限制(米)']);
  const note = sourceNote(record);

  return {
    park_Id: `gpa-${index + 1}`,
    name: record['停車場名稱'],
    displayAddress: record['停車場地址'],
    district: coordinates.district,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    contactNo: record['停車場查詢熱線(如適用)'] === '無法提供' ? undefined : record['停車場查詢熱線(如適用)'],
    website: record['停車場網站(如適用)'] === '無法提供' ? undefined : record['停車場網站(如適用)'],
    opening_status: 'UNKNOWN',
    openingHours: String(record['開放時間'] ?? '').trim() || undefined,
    heightLimits: height || note ? [{ ...(height ? { height } : {}), ...(note ? { remark: note } : {}) }] : undefined,
    facilities: disabledSpaces ? ['disabilities'] : undefined,
    privateCar: privateCarSpaces || disabledSpaces ? { ...(privateCarSpaces ? { space: privateCarSpaces } : {}), ...(disabledSpaces ? { spaceDIS: disabledSpaces } : {}) } : undefined,
    motorCycle: motorcycleSpaces ? { space: motorcycleSpaces } : undefined,
    officialSource: {
      availability: 'not-provided',
      sourceUrl: GPA_DATASET_URL,
      sourceLabel: { 'zh-Hant': '政府產業署官方基本資料', en: 'Government Property Agency official basic data' },
    },
  };
}

export async function buildGpaCarparks({ fetchImpl = fetch, signal } = {}) {
  const response = await fetchImpl(GPA_CARPARKS_URL, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Government Property Agency car-park data returned ${response.status}`);
  const sourceRecords = parseJsonWithLiteralNewlines(await response.text());
  if (!Array.isArray(sourceRecords) || sourceRecords.length < 15) throw new Error('Government Property Agency returned too few car parks');

  const records = [];
  for (const [index, record] of sourceRecords.entries()) {
    const coordinates = await coordinatesFor(record, signal);
    records.push(normaliseRecord(record, index, coordinates));
  }

  return {
    source: '政府產業署轄下供公眾使用的政府停車場',
    sourceUrl: GPA_DATASET_URL,
    generatedAt: new Date().toISOString(),
    recordCount: records.length,
    records,
  };
}

export { GPA_CARPARKS_URL, GPA_DATASET_URL, parseJsonWithLiteralNewlines };
