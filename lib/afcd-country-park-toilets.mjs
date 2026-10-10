import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const AFCD_DATASET_ID = 'afcd_rcd_1635136427551_29173';
export const AFCD_DATASET_URL = `https://portal.csdi.gov.hk/csdi-webpage/dataset/${AFCD_DATASET_ID}`;
const FILE_LIST_URL = `https://portal.csdi.gov.hk/csdi-webpage/archivedDatasetFileList/${AFCD_DATASET_ID}`;
const BOUNDS = { minLat: 21.5, maxLat: 23, minLng: 113.7, maxLng: 114.6 };
const HEADERS = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 ParkPulse HK official-data snapshot' };

function isHongKongCoordinate(latitude, longitude) {
  return latitude >= BOUNDS.minLat && latitude <= BOUNDS.maxLat
    && longitude >= BOUNDS.minLng && longitude <= BOUNDS.maxLng;
}

function text(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function safeId(value) {
  return String(value ?? '').trim().replace(/[^a-z\d_-]/gi, '-') || '';
}

export function parseAfcdCountryParkToilets(geojson, { generatedAt = new Date().toISOString(), year, quarter, sourceUrl = AFCD_DATASET_URL } = {}) {
  if (geojson?.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) throw new Error('AFCD GeoJSON is not a FeatureCollection');
  const records = new Map();
  for (const feature of geojson.features) {
    const properties = feature?.properties ?? {};
    const coordinates = feature?.geometry?.type === 'Point' ? feature.geometry.coordinates : undefined;
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isHongKongCoordinate(latitude, longitude)) continue;
    const name = text(properties.FACILITY_NAME_TC) || text(properties.FACILITY_NAME_EN);
    const nameEn = text(properties.FACILITY_NAME_EN);
    const facilityId = text(properties.FAC_ID) || String(properties.OBJECTID ?? '').trim();
    if (!name || !facilityId) continue;
    const countryPark = text(properties.COUNTRY_PARK_TC);
    const countryParkEn = text(properties.COUNTRY_PARK_EN);
    const accessible = String(properties.BARRIER_FREE_FAC ?? '').trim().toUpperCase() === 'Y';
    const type = text(properties.TYPE_TC);
    const typeEn = text(properties.TYPE_EN);
    const remarks = [type, accessible ? '暢通易達洗手間' : ''].filter(Boolean).join('；');
    const remarksEn = [typeEn, accessible ? 'Accessible toilet' : ''].filter(Boolean).join('; ');
    const record = {
      id: `afcd-country-park-${safeId(facilityId)}`,
      name,
      ...(nameEn ? { nameEn } : {}),
      ...(countryPark ? { address: countryPark } : {}),
      ...(countryParkEn ? { addressEn: countryParkEn } : {}),
      ...(remarks ? { remarks } : {}),
      ...(remarksEn ? { remarksEn } : {}),
      updatedAt: generatedAt,
      latitude,
      longitude,
      kind: 'afcdCountryParkToilet',
      source: '漁農自然護理署（CSDI）',
      sourceUrl,
      category: '郊野公園公廁',
      ...(countryPark ? { countryPark } : {}),
      ...(countryParkEn ? { countryParkEn } : {}),
      facilityId,
      toiletType: type || typeEn,
      toiletTypeEn: typeEn || type,
      barrierFree: accessible,
      ...(Number.isInteger(year) && Number.isInteger(quarter) ? { sourcePeriod: `${year}-Q${quarter}` } : {}),
    };
    if (!records.has(record.id)) records.set(record.id, record);
  }
  return [...records.values()].sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant'));
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`AFCD/CSDI request returned ${response.status}: ${url}`);
  return response.json();
}

function latestGeoJsonFile(payload) {
  const geojsonFormat = payload?.archivedDatasetFileFormatListVO?.convertedFormat?.find((item) => String(item.fileType).toUpperCase() === 'GEOJSON');
  if (!Number.isInteger(geojsonFormat?.pos)) throw new Error('CSDI dataset has no converted GeoJSON format');
  const versions = Array.isArray(payload.archivedDatasetVersionList) ? payload.archivedDatasetVersionList : [];
  const latest = versions
    .filter((version) => Number.isInteger(version.year) && Number.isInteger(version.quarter) && Array.isArray(version.fileList))
    .sort((left, right) => right.year - left.year || right.quarter - left.quarter)
    .find((version) => version.fileList.some((file) => file.pos === geojsonFormat.pos && file.sourceFormat !== true && /^https:\/\//.test(file.url ?? '')));
  const file = latest?.fileList.find((item) => item.pos === geojsonFormat.pos && item.sourceFormat !== true);
  if (!latest || !file) throw new Error('CSDI dataset has no latest converted GeoJSON file');
  return { ...file, year: latest.year, quarter: latest.quarter };
}

function extractGeoJson(zipBuffer) {
  const directory = mkdtempSync(path.join(tmpdir(), 'parkpulse-afcd-'));
  const archivePath = path.join(directory, 'country-park-toilets.zip');
  try {
    writeFileSync(archivePath, zipBuffer);
    const entries = execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })
      .split(/\r?\n/).map((entry) => entry.trim()).filter((entry) => entry.toLowerCase().endsWith('.geojson'));
    if (entries.length !== 1) throw new Error(`Expected one GeoJSON in AFCD archive, found ${entries.length}`);
    const content = execFileSync('unzip', ['-p', archivePath, entries[0]], { maxBuffer: 20 * 1024 * 1024 });
    return JSON.parse(content.toString('utf8'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export async function buildAfcdCountryParkToilets() {
  const index = await fetchJson(FILE_LIST_URL);
  const file = latestGeoJsonFile(index);
  const response = await fetch(file.url, { headers: { Accept: 'application/zip,application/octet-stream,*/*', 'User-Agent': HEADERS['User-Agent'] }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`CSDI AFCD GeoJSON returned ${response.status}`);
  const geojson = extractGeoJson(Buffer.from(await response.arrayBuffer()));
  if (geojson.features.length < 100) throw new Error(`AFCD country park toilet source unexpectedly small: ${geojson.features.length}`);
  const generatedAt = new Date().toISOString();
  const facilities = parseAfcdCountryParkToilets(geojson, { generatedAt, year: file.year, quarter: file.quarter });
  if (facilities.length < 100) throw new Error(`AFCD country park toilet snapshot unexpectedly small: ${facilities.length}`);
  return {
    source: '漁農自然護理署郊野公園公廁（CSDI 官方空間資料）',
    sourceUrl: AFCD_DATASET_URL,
    generatedAt,
    dataYear: file.year,
    dataQuarter: file.quarter,
    records: facilities.length,
    facilities,
  };
}
