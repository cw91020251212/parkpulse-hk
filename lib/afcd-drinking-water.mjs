import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const AFCD_WATER_SOURCE_URL = 'https://www.afcd.gov.hk/tc_chi/country/cou_vis/cou_vis_rec/cou_vis_wfs.html';
export const AFCD_WATER_SOURCE_EN_URL = 'https://www.afcd.gov.hk/english/country/cou_vis/cou_vis_rec/cou_vis_wfs.html';
export const AFCD_WATER_DATASET_ID = 'afcd_rcd_1635133835075_48993';
export const AFCD_WATER_DATASET_URL = `https://portal.csdi.gov.hk/csdi-webpage/dataset/${AFCD_WATER_DATASET_ID}`;
export const AFCD_WATER_FILE_LIST_URL = `https://portal.csdi.gov.hk/csdi-webpage/archivedDatasetFileList/${AFCD_WATER_DATASET_ID}`;
const HEADERS = { 'User-Agent': 'ParkPulse HK official AFCD water-station snapshot', Accept: '*/*' };
const text = (value) => String(value ?? '').replace(/\s+/gu, ' ').trim();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function officialUrl(value, host) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== host || url.username || url.password) {
    throw new Error(`Untrusted official-source URL: ${value}`);
  }
  return url.href;
}

function htmlText(value) {
  return text(String(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(
      code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&apos;|&#39;/gi, "'")
    .replace(/&quot;/gi, '"').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>'));
}

// AFCD's Chinese HTML deliberately spaces out individual Chinese characters.
function pageText(value, language) {
  const result = htmlText(value);
  return language === 'zh-Hant' ? result.replace(/\s+/gu, '') : result;
}

export function parseAfcdWaterFillingPage(html, { language = 'zh-Hant', sourceUrl = AFCD_WATER_SOURCE_URL } = {}) {
  const stations = [];
  for (const row of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
    if (cells.length !== 2 || !/^\d+$/.test(htmlText(cells[0]))) continue;
    const number = Number(htmlText(cells[0]));
    const map = cells[1].match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/i);
    if (!map) throw new Error(`AFCD station ${number} has no official location map`);
    const firstParagraph = cells[1].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? cells[1];
    const name = pageText(firstParagraph.split(/<a\b/i)[0], language);
    const label = pageText(cells[1], language);
    const closureText = language === 'zh-Hant' ? '[暫時關閉]' : '[Temporarily Closed]';
    const mapUrl = officialUrl(new URL(map[1].replace(/&amp;/g, '&'), sourceUrl).href, 'www.afcd.gov.hk');
    if (!name || !/\.(?:png|jpe?g)$/i.test(new URL(mapUrl).pathname)) throw new Error(`Invalid AFCD station ${number}`);
    stations.push({ number, name, label, mapUrl, temporaryClosed: label.includes(closureText), closureText });
  }
  if (!stations.length || new Set(stations.map((station) => station.number)).size !== stations.length) {
    throw new Error('AFCD current station list is empty or has duplicate numbers');
  }
  stations.sort((a, b) => a.number - b.number);
  if (stations.some((station, index) => station.number !== index + 1)) throw new Error('AFCD station numbering is not contiguous');
  const body = pageText(html, language);
  const hasFilterMaintenance = language === 'zh-Hant'
    ? /定期.*保養/.test(body) && body.includes('更換濾心') && body.includes('水質檢查')
    : /regular maintenance/i.test(body) && /replacement of filters/i.test(body) && /water quality testing/i.test(body);
  // The AFCD footer exposes the page's update date; this is not the retrieval date.
  const date = String(html).match(/\b(20\d{2})\/(\d{2})\/(\d{2})\b/);
  return { stations, hasFilterMaintenance, updatedAt: date ? `${date[1]}-${date[2]}-${date[3]}` : null };
}

function stationKey(value) {
  return text(value).normalize('NFKC').replace(/加水站|water filling station/gi, '')
    // Ignore named trail context, but retain (1)/(2) for the two Wan Tsai toilets.
    .replace(/\(([^()]*)\)/g, (match, content) => /^\s*\d+\s*$/.test(content) ? match : '')
    .toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function chineseStationKey(value) {
  const key = stationKey(value);
  // Exact published wording difference: web no. 27 says 場3號; CSDI says 場地3號.
  return key === '石崗燒烤場3號' ? '石崗燒烤場地3號' : key;
}

export function latestAfcdWaterGeoJsonFile(payload) {
  const format = payload?.archivedDatasetFileFormatListVO?.convertedFormat
    ?.find((item) => String(item.fileType).toUpperCase() === 'GEOJSON');
  if (!Number.isInteger(format?.pos)) throw new Error('CSDI AFCD water dataset has no GeoJSON format');
  const versions = (payload.archivedDatasetVersionList ?? [])
    .filter((version) => Number.isInteger(version.year) && Number.isInteger(version.quarter)
      && version.quarter >= 1 && version.quarter <= 4 && Array.isArray(version.fileList))
    .sort((a, b) => b.year - a.year || b.quarter - a.quarter);
  // Never silently fall back to an old quarter if the newest version lacks GeoJSON.
  const latest = versions[0];
  const file = latest?.fileList.find((item) => item.pos === format.pos && item.sourceFormat === false);
  if (!file) throw new Error('Latest CSDI AFCD water version has no converted GeoJSON download');
  return { url: officialUrl(file.url, 'static.csdi.gov.hk'), year: latest.year, quarter: latest.quarter };
}

export function parseAfcdDrinkingWater(geojson, tcPage, enPage, {
  generatedAt = new Date().toISOString(), coordinateSourceUrl, year, quarter,
} = {}) {
  if (geojson?.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) throw new Error('AFCD water source is not a GeoJSON FeatureCollection');
  officialUrl(coordinateSourceUrl, 'static.csdi.gov.hk');
  if (!Number.isInteger(year) || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) throw new Error('Missing CSDI coordinate period');
  if (!tcPage?.stations?.length || tcPage.stations.length !== enPage?.stations?.length) throw new Error('AFCD bilingual station lists differ');
  if (geojson.features.length !== tcPage.stations.length) throw new Error('CSDI point count differs from the current AFCD list; manual source review required');
  const matched = new Set();
  const ids = new Set();
  const records = tcPage.stations.map((tc) => {
    const en = enPage.stations.find((entry) => entry.number === tc.number);
    if (!en || en.temporaryClosed !== tc.temporaryClosed) throw new Error(`AFCD bilingual closure mismatch for station ${tc.number}`);
    const candidates = geojson.features.filter((feature) => {
      const properties = feature?.properties ?? {};
      return chineseStationKey(properties.FACILITY_NAME_TC) === chineseStationKey(tc.name)
        && stationKey(properties.FACILITY_NAME_EN) === stationKey(en.name);
    });
    if (candidates.length !== 1 || matched.has(candidates[0])) throw new Error(`No unique bilingual CSDI match for AFCD station ${tc.number}: ${tc.name}`);
    const feature = candidates[0];
    const p = feature.properties;
    const coordinates = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : null;
    const [longitude, latitude] = Array.isArray(coordinates) ? coordinates : [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < 22.13 || latitude > 22.57 || longitude < 113.8 || longitude > 114.5) {
      throw new Error(`Invalid official Hong Kong point for ${tc.name}`);
    }
    if (!/^[a-z\d]+\/WS\/\d+$/i.test(text(p.FAC_ID))) throw new Error(`Invalid AFCD facility ID for ${tc.name}`);
    const id = `afcd-water-${p.FAC_ID.toLowerCase().replaceAll('/', '-')}`;
    if (ids.has(id)) throw new Error(`Duplicate AFCD water ID: ${id}`);
    ids.add(id);
    matched.add(feature);
    const locationTc = text(p.LOCATION_TC) || tc.name;
    const locationEn = text(p.LOCATION_EN) || en.name;
    const period = `${year}-Q${quarter}`;
    const temporaryClosed = tc.temporaryClosed;
    const filterStatus = tcPage.hasFilterMaintenance && enPage.hasFilterMaintenance ? 'confirmed' : 'notPublished';
    const remarksTc = [
      temporaryClosed ? tc.closureText : '',
      filterStatus === 'confirmed' ? '漁護署公布會定期保養、更換濾心及進行水質檢查；非逐站即時水質保證。' : '',
      `座標、一般服務時間及水溫採用 CSDI ${period} 官方資料；最新網頁的暫時關閉提示優先。座標為官方加水站點，非經實地核實的出水口精確定位。`,
    ].filter(Boolean).join(' ');
    const remarksEn = [
      temporaryClosed ? en.closureText : '',
      filterStatus === 'confirmed' ? 'AFCD publishes regular maintenance, filter replacement and water quality testing; this is not a real-time water-quality guarantee for each station.' : '',
      `Coordinates, normal service hours and temperature are from official CSDI ${period} data; temporary closures on the current webpage take precedence. These are official station points, not field-verified exact outlet positions.`,
    ].filter(Boolean).join(' ');
    return {
      id, provider: 'afcd', nameTc: tc.name, nameEn: en.name,
      // Official locations, not invented postal addresses or geocoded park centres.
      addressTc: locationTc, addressEn: locationEn, latitude, longitude, locationTc, locationEn,
      typeTc: text(p.TYPE_OF_WATER_DISPENSER_TC), typeEn: text(p.TYPE_OF_WATER_DISPENSER_EN),
      unitCount: null,
      indoorOutdoor: /^(outdoor|室外)$/i.test(text(p.TYPE_OF_VENUE_EN) || text(p.TYPE_OF_VENUE_TC)) ? 'outdoor'
        : /^(indoor|室內)$/i.test(text(p.TYPE_OF_VENUE_EN) || text(p.TYPE_OF_VENUE_TC)) ? 'indoor' : 'unknown',
      serviceHoursTc: temporaryClosed ? '暫時關閉' : text(p.SERVICE_HOUR),
      serviceHoursEn: temporaryClosed ? 'Temporarily Closed' : text(p.SERVICE_HOUR),
      temperatureTc: text(p.WATER_TEMPERATURE_TC), temperatureEn: text(p.WATER_TEMPERATURE_EN),
      remarksTc, remarksEn, sourceUrl: AFCD_WATER_SOURCE_URL, coordinateSourceUrl,
      officialMapUrl: tc.mapUrl, filterStatus,
      accessTc: temporaryClosed ? tc.closureText : '供公眾使用；請自備水樽。',
      accessEn: temporaryClosed ? en.closureText : 'For public use; bring your own water bottle.',
      temporaryClosed,
    };
  });
  return {
    generatedAt,
    source: {
      'zh-Hant': '漁農自然護理署最新加水站名錄及 CSDI 官方空間資料',
      en: 'AFCD current water filling station list and official CSDI spatial data',
    },
    sourceUrl: AFCD_WATER_SOURCE_URL,
    sourceEnUrl: AFCD_WATER_SOURCE_EN_URL,
    sourceUpdatedAt: tcPage.updatedAt,
    coordinateSource: {
      datasetId: AFCD_WATER_DATASET_ID, datasetUrl: AFCD_WATER_DATASET_URL,
      fileListUrl: AFCD_WATER_FILE_LIST_URL, downloadUrl: coordinateSourceUrl,
      year, quarter, featureCount: geojson.features.length,
    },
    records,
  };
}

async function request(url) {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`AFCD/CSDI request returned ${response.status}: ${url}`);
  return response;
}

function extractGeoJson(archive) {
  const directory = mkdtempSync(path.join(tmpdir(), 'parkpulse-afcd-water-'));
  const archivePath = path.join(directory, 'official-water-stations.zip');
  try {
    writeFileSync(archivePath, archive);
    const entries = execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 })
      .split(/\r?\n/).filter((entry) => /\.geojson$/i.test(entry));
    if (entries.length !== 1) throw new Error(`Expected one AFCD water GeoJSON, got ${entries.length}`);
    return execFileSync('unzip', ['-p', archivePath, entries[0]], { maxBuffer: 20 * 1024 * 1024 });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export async function buildAfcdDrinkingWater() {
  const [index, tcHtml, enHtml] = await Promise.all([
    request(AFCD_WATER_FILE_LIST_URL).then((response) => response.json()),
    request(AFCD_WATER_SOURCE_URL).then((response) => response.text()),
    request(AFCD_WATER_SOURCE_EN_URL).then((response) => response.text()),
  ]);
  const file = latestAfcdWaterGeoJsonFile(index);
  const archive = Buffer.from(await (await request(file.url)).arrayBuffer());
  const geojsonBytes = extractGeoJson(archive);
  const tcPage = parseAfcdWaterFillingPage(tcHtml);
  const enPage = parseAfcdWaterFillingPage(enHtml, { language: 'en', sourceUrl: AFCD_WATER_SOURCE_EN_URL });
  if (tcPage.updatedAt !== enPage.updatedAt) throw new Error('AFCD bilingual page update dates differ');
  const snapshot = parseAfcdDrinkingWater(JSON.parse(geojsonBytes.toString('utf8')), tcPage, enPage, {
    coordinateSourceUrl: file.url, year: file.year, quarter: file.quarter,
  });
  snapshot.coordinateSource.archiveSha256 = sha256(archive);
  snapshot.coordinateSource.geoJsonSha256 = sha256(geojsonBytes);
  snapshot.sourceEvidence = { tcPageSha256: sha256(tcHtml), enPageSha256: sha256(enHtml) };
  return snapshot;
}
