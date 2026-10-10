import { createHash } from 'node:crypto';

const CATALOG_URL = 'https://data.gov.hk/api/v1/datasets';
const CATALOG_PAGE_SIZE = 50;
const DATASET_PREFIX = 'hk-lcsd-facility-facility-';
const LCSD_FILE_ROOT = 'https://www.lcsd.gov.hk/datagovhk/facility/';
const CATALOG_REFERRER = 'https://data.gov.hk/en-datasets/provider/hk-lcsd';
const CATALOG_HEADERS = {
  Accept: 'application/json',
  Origin: 'https://data.gov.hk',
  Referer: CATALOG_REFERRER,
  'User-Agent': 'Mozilla/5.0 ParkPulse HK official-data snapshot',
};
const LCSD_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 ParkPulse HK official-data snapshot',
};
const OUTDOOR_NAME = /公園|遊樂場|花園|運動場|休憩處|球場|泳灘|緩跑徑|健身徑|海濱|露天|郊野|playground|\bpark\b|garden|sports ground|recreation ground|leisure ground|sports field|beach|outdoor|open space|waterfront|promenade|trail/i;
const PET_TOILET_ZH = /(?:寵物|狗隻|狗狗|犬|狗)\s*(?:公廁|廁所|洗手間)/g;
const PET_TOILET_EN = /\b(?:pet|dog)(?:'s)?\s+(?:public\s+)?(?:toilets?|restrooms?|latrines?)\b/gi;
const HUMAN_TOILET_ZH = /洗手間|公廁|廁所/;
const HUMAN_TOILET_EN = /\b(?:toilets?|restrooms?|lavatories)\b/i;
const MAX_COORDINATE_BOUNDS = { minLat: 21.5, maxLat: 23.0, minLng: 113.7, maxLng: 114.6 };

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'");
}

export function lcsdPlainText(value) {
  return decodeEntities(String(value ?? ''))
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:li|p|div|ul|ol)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n+ */g, '\n')
    .trim();
}

export function parseLcsdCoordinate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  const decimal = Number(raw);
  if (raw && Number.isFinite(decimal)) return decimal;
  const match = raw.match(/^(-?\d{1,3})\s*[-°]\s*(\d{1,2})\s*[-'′:]\s*(\d{1,2}(?:\.\d+)?)\s*(?:["″])?$/);
  if (!match) return undefined;
  const degrees = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (minutes >= 60 || seconds >= 60) return undefined;
  const sign = degrees < 0 ? -1 : 1;
  return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
}

export function isLcsdOutdoorVenueName(name) {
  return OUTDOOR_NAME.test(lcsdPlainText(name));
}

export function hasHumanToilet(row) {
  const zh = lcsdPlainText(row?.Ancillary_facilities_cn).replace(PET_TOILET_ZH, '');
  const en = lcsdPlainText(row?.Ancillary_facilities_en).replace(PET_TOILET_EN, '');
  return HUMAN_TOILET_ZH.test(zh) || HUMAN_TOILET_EN.test(en);
}

function toiletRemarks(value) {
  const isChinese = /[\u3400-\u9fff]/.test(lcsdPlainText(value));
  const text = lcsdPlainText(value)
    .replace(PET_TOILET_ZH, '')
    .replace(PET_TOILET_EN, '');
  const lines = text.split(/[\n;；]+/).map((line) => line.trim()).filter(Boolean);
  const pattern = isChinese ? HUMAN_TOILET_ZH : HUMAN_TOILET_EN;
  return [...new Set(lines.filter((line) => pattern.test(line)))].join('；').slice(0, 500);
}

function isHongKongCoordinate(latitude, longitude) {
  return latitude >= MAX_COORDINATE_BOUNDS.minLat && latitude <= MAX_COORDINATE_BOUNDS.maxLat
    && longitude >= MAX_COORDINATE_BOUNDS.minLng && longitude <= MAX_COORDINATE_BOUNDS.maxLng;
}

function normalizeName(value) {
  return lcsdPlainText(value).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\p{S}]+/gu, '');
}

function stableVenueId(row, name, latitude, longitude) {
  const officialId = String(row?.GIHS ?? '').trim();
  const idPart = officialId || createHash('sha256').update(`${normalizeName(name)}:${latitude.toFixed(6)}:${longitude.toFixed(6)}`).digest('hex').slice(0, 14);
  return `lcsd-park-${idPart.replace(/[^a-z\d_-]/gi, '-')}`;
}

function scoreRecord(record) {
  return (record.remarks?.length ?? 0) + (record.remarksEn?.length ?? 0)
    + (record.openingHours ? 40 : 0)
    + (record.address ? 20 : 0)
    + (/暢通易達|accessible/i.test(record.remarks ?? '') ? 80 : 0);
}

export function parseLcsdParkWashrooms(sources, { generatedAt = new Date().toISOString() } = {}) {
  const venues = new Map();
  for (const source of sources) {
    if (!Array.isArray(source?.records)) continue;
    for (const row of source.records) {
      const name = lcsdPlainText(row?.Name_cn) || lcsdPlainText(row?.Name_en);
      const nameEn = lcsdPlainText(row?.Name_en);
      if (!name || !isLcsdOutdoorVenueName(`${name} ${nameEn}`) || !hasHumanToilet(row)) continue;
      const latitude = parseLcsdCoordinate(row?.Latitude);
      const longitude = parseLcsdCoordinate(row?.Longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isHongKongCoordinate(latitude, longitude)) continue;
      const remarks = toiletRemarks(row?.Ancillary_facilities_cn);
      const remarksEn = toiletRemarks(row?.Ancillary_facilities_en);
      if (!remarks && !remarksEn) continue;
      const officialId = String(row?.GIHS ?? '').trim();
      const venueKey = officialId || `${normalizeName(name)}:${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
      const address = lcsdPlainText(row?.Address_cn);
      const candidate = {
        id: stableVenueId(row, name, latitude, longitude),
        name,
        ...(nameEn ? { nameEn } : {}),
        ...(address ? { address } : {}),
        ...(lcsdPlainText(row?.Address_en) ? { addressEn: lcsdPlainText(row.Address_en) } : {}),
        ...(lcsdPlainText(row?.District_cn) ? { district: lcsdPlainText(row.District_cn) } : {}),
        ...(lcsdPlainText(row?.Opening_hours_cn) ? { openingHours: lcsdPlainText(row.Opening_hours_cn) } : {}),
        ...(lcsdPlainText(row?.Opening_hours_en) ? { openingHoursEn: lcsdPlainText(row.Opening_hours_en) } : {}),
        ...(remarks ? { remarks } : {}),
        ...(remarksEn ? { remarksEn } : {}),
        updatedAt: generatedAt,
        latitude,
        longitude,
        kind: 'lcsdParkToilet',
        source: '康樂及文化事務署',
        sourceUrl: source.url,
        category: '公園及戶外場地附屬洗手間',
      };
      const previous = venues.get(venueKey);
      if (!previous) {
        venues.set(venueKey, candidate);
        continue;
      }
      const combine = (left, right) => [...new Set(`${left ?? ''}；${right ?? ''}`.split(/[；\n]+/).map((line) => line.trim()).filter(Boolean))].join('；').slice(0, 500);
      const best = scoreRecord(candidate) > scoreRecord(previous) ? candidate : previous;
      venues.set(venueKey, { ...best, remarks: combine(previous.remarks, candidate.remarks), remarksEn: combine(previous.remarksEn, candidate.remarksEn) });
    }
  }
  return [...venues.values()].sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'));
}

async function fetchJson(url, headers, { attempts = 3, notFoundIsEmpty = false } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
      if (notFoundIsEmpty && response.status === 404) return null;
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function fetchFacilityCatalog() {
  const datasets = [];
  for (let offset = 0; offset < 1_000; offset += CATALOG_PAGE_SIZE) {
    const url = new URL(CATALOG_URL);
    url.search = new URLSearchParams({ limit: String(CATALOG_PAGE_SIZE), offset: String(offset), provider: 'hk-lcsd', lang: 'tc' }).toString();
    const payload = await fetchJson(url, CATALOG_HEADERS);
    if (!Array.isArray(payload?.datasets)) throw new Error('data.gov.hk returned an invalid LCSD catalog page');
    datasets.push(...payload.datasets);
    if (payload.datasets.length < CATALOG_PAGE_SIZE) break;
  }
  return datasets.filter((item) => String(item?.id ?? '').startsWith(DATASET_PREFIX));
}

async function mapLimit(items, limit, mapper) {
  const output = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(items[index]);
    }
  }));
  return output;
}

export async function buildLcsdParkWashrooms() {
  const datasets = await fetchFacilityCatalog();
  if (datasets.length < 40) throw new Error(`LCSD catalog has only ${datasets.length} facility datasets`);
  const sources = await mapLimit(datasets, 8, async (dataset) => {
    const filename = `${String(dataset.id).replace('hk-lcsd-facility-', '')}.json`;
    const url = new URL(filename, LCSD_FILE_ROOT).href;
    try {
      const payload = await fetchJson(url, LCSD_HEADERS, { attempts: 2, notFoundIsEmpty: true });
      return Array.isArray(payload) ? { datasetId: dataset.id, url, records: payload } : null;
    } catch {
      return null;
    }
  });
  const usableSources = sources.filter(Boolean);
  if (usableSources.length < 35) throw new Error(`Only ${usableSources.length}/${datasets.length} LCSD facility data files were readable`);
  const generatedAt = new Date().toISOString();
  const records = parseLcsdParkWashrooms(usableSources, { generatedAt });
  if (records.length < 250) throw new Error(`LCSD park washroom snapshot unexpectedly small: ${records.length}`);
  return {
    source: '康樂及文化事務署公園及戶外場地附屬洗手間（官方開放資料快照）',
    sourceUrl: CATALOG_REFERRER,
    generatedAt,
    datasetsInspected: datasets.length,
    datasetsLoaded: usableSources.length,
    records: records.length,
    facilities: records,
  };
}
