import { createHash } from 'node:crypto';

export const MTR_WATER_SOURCE_URL = 'https://www.mtr.com.hk/ch/customer/services/water_dispenser.html';
export const MTR_WATER_SOURCE_EN_URL = 'https://www.mtr.com.hk/en/customer/services/water_dispenser.html';
export const MTR_STATIONS_URL = 'https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv';
export const MTR_STATIONS_DATASET_URL = 'https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities';
export const LANDSD_LOCATION_SEARCH_URL = 'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch';
export const LANDSD_LOCATION_SOURCE_URL = 'https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-development-location-search-api';
export const LANDSD_TRANSFORM_URL = 'https://www.geodetic.gov.hk/transform/v2/';
export const LANDSD_TRANSFORM_SOURCE_URL = 'https://data.gov.hk/tc-data/dataset/hk-landsd-openmap-coordinates-transformation-api';
const HEADERS = { 'User-Agent': 'ParkPulse HK official MTR drinking-water snapshot', Accept: '*/*' };
const LINES = {
  EAL: ['東鐵綫', 'East Rail Line'], ISL: ['港島綫', 'Island Line'],
  KTL: ['觀塘綫', 'Kwun Tong Line'], SIL: ['南港島綫', 'South Island Line'],
  TCL: ['東涌綫', 'Tung Chung Line'], TKL: ['將軍澳綫', 'Tseung Kwan O Line'],
  TML: ['屯馬綫', 'Tuen Ma Line'], TWL: ['荃灣綫', 'Tsuen Wan Line'],
};
const compact = (value) => String(value ?? '').replace(/\s+/gu, ' ').trim();
const key = (value) => compact(value).normalize('NFKC').toLowerCase();
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
function htmlText(value) {
  return compact(String(value).replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, ' ')
    .replace(/&#(x[\da-f]+|\d+);?/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&apos;|&rsquo;|&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>'));
}
function csvRows(csv) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  const source = String(csv).replace(/^\uFEFF/, '');
  for (let i = 0; i <= source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || field === '') quoted = !quoted;
      else throw new Error('Malformed MTR CSV quoting');
    } else if (!quoted && (ch === ',' || ch === '\n' || ch === undefined)) {
      row.push(compact(field)); field = '';
      if (ch !== ',') { if (row.some(Boolean)) rows.push(row); row = []; }
    } else if (ch !== '\r' || quoted) field += ch;
  }
  if (quoted) throw new Error('Unclosed MTR CSV quote');
  return rows;
}
export function parseMtrStations(csv) {
  const [header, ...rows] = csvRows(csv);
  const required = ['Line Code', 'Station Code', 'Chinese Name', 'English Name'];
  if (!required.every((name) => header?.includes(name))) throw new Error('MTR station CSV schema changed');
  const stations = new Map();
  for (const row of rows) {
    if (row.length !== header.length) throw new Error('MTR station CSV row width differs');
    const p = Object.fromEntries(header.map((name, i) => [name, row[i]]));
    if (!/^[A-Z]{3}$/.test(p['Station Code']) || !p['Line Code'] || !p['Chinese Name'] || !p['English Name']) throw new Error('Invalid official MTR station identity');
    const code = p['Station Code']; const existing = stations.get(code);
    if (existing && (existing.nameTc !== p['Chinese Name'] || existing.nameEn !== p['English Name'])) throw new Error(`Inconsistent bilingual station name: ${code}`);
    const station = existing ?? { code, nameTc: p['Chinese Name'], nameEn: p['English Name'], lineCodes: [] };
    if (!station.lineCodes.includes(p['Line Code'])) station.lineCodes.push(p['Line Code']);
    stations.set(code, station);
  }
  if (!stations.size) throw new Error('Official MTR station CSV is empty');
  return [...stations.values()];
}
function stationName(value, language) {
  // The current English page literally says "Kai Tak Station Station" and "Mei Foo Station Station".
  return key(language === 'en' ? compact(value).replace(/(?:\s+Station)+$/i, '') : compact(value).replace(/站$/, ''));
}
export function parseMtrWaterPage(html, { language = 'zh-Hant' } = {}) {
  if (!['zh-Hant', 'en'].includes(language)) throw new Error('Unsupported MTR page language');
  const tables = [...String(html).replace(/<!--[\s\S]*?-->/g, '').matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
    .filter((table) => /(?:非付款區|Unpaid Area)/i.test(htmlText(table[1])));
  if (tables.length !== 1) throw new Error('Expected one official MTR water-location table');
  const rows = []; let lineCode;
  for (const match of tables[0][1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => htmlText(cell[1]));
    if (cells.length !== 2) throw new Error('MTR water table schema changed');
    if (cells[1] === (language === 'en' ? 'Location' : '地點')) {
      lineCode = Object.entries(LINES).find(([, names]) => key(names[language === 'en' ? 1 : 0]) === key(cells[0]))?.[0];
      if (!lineCode) throw new Error(`Unknown official MTR water line: ${cells[0]}`);
      continue;
    }
    const exit = language === 'en' ? cells[1].match(/\bExit\s+([A-Z]\d*)\b/i)?.[1]
      : cells[1].match(/([A-Z]\d*)\s*出口/i)?.[1];
    const unpaid = language === 'en' ? /\(Unpaid Area\)/i.test(cells[1]) : /[（(]非付款區[)）]/.test(cells[1]);
    // Preserve the Chinese source typo "車站大E3出口"; its English counterpart establishes concourse evidence.
    if (!lineCode || !exit || !unpaid || !(language === 'en' ? /Station Concourse/i.test(cells[1]) : /車站大/.test(cells[1]))) throw new Error(`Unrecognised official MTR water location: ${cells.join(' / ')}`);
    rows.push({ rowNumber: rows.length + 1, lineCode, stationName: cells[0], location: cells[1], exit: exit.toUpperCase() });
  }
  if (!rows.length) throw new Error('Official MTR water list is empty');
  return { language, rows };
}
export function pairMtrWaterLocations(tcPage, enPage, stations) {
  if (tcPage?.language !== 'zh-Hant' || enPage?.language !== 'en' || !tcPage.rows.length || tcPage.rows.length !== enPage.rows.length) throw new Error('MTR bilingual lists differ');
  function resolve(row, language) {
    const matches = stations.filter((station) => stationName(station[language === 'en' ? 'nameEn' : 'nameTc'], language) === stationName(row.stationName, language));
    if (matches.length !== 1 || !matches[0].lineCodes.includes(row.lineCode)) throw new Error(`No unique official station-code/line match: ${row.stationName}`);
    return { ...row, station: matches[0] };
  }
  const tcRows = tcPage.rows.map((row) => resolve(row, 'zh-Hant'));
  const enRows = enPage.rows.map((row) => resolve(row, 'en'));
  const usedEn = new Set(); const locations = new Map();
  for (const tc of tcRows) {
    const candidates = enRows.filter((en) => en.station.code === tc.station.code && en.lineCode === tc.lineCode && en.exit === tc.exit);
    // Do not join by row order, or silently merge two locations at the same exit.
    if (candidates.length !== 1 || usedEn.has(candidates[0])) throw new Error(`Ambiguous bilingual MTR location: ${tc.station.code}/${tc.exit}/${tc.lineCode}`);
    const en = candidates[0]; usedEn.add(en);
    const identity = `${tc.station.code}|${key(tc.location)}|${key(en.location)}`;
    const location = locations.get(identity) ?? { stationCode: tc.station.code, stationNameTc: tc.station.nameTc,
      stationNameEn: tc.station.nameEn, exit: tc.exit, locationTc: tc.location, locationEn: en.location, lineCodes: [], sourceRows: [] };
    location.lineCodes.push(tc.lineCode);
    location.sourceRows.push({ lineCode: tc.lineCode, lineTc: LINES[tc.lineCode][0], lineEn: LINES[tc.lineCode][1],
      tcRowNumber: tc.rowNumber, enRowNumber: en.rowNumber, stationNameTc: tc.stationName, stationNameEn: en.stationName,
      locationTc: tc.location, locationEn: en.location });
    locations.set(identity, location);
  }
  const result = [...locations.values()];
  const ids = new Set();
  for (const location of result) {
    const multiple = result.filter((other) => other.stationCode === location.stationCode).length > 1;
    location.id = `mtr-water-${location.stationCode.toLowerCase()}${multiple ? `-exit-${location.exit.toLowerCase()}` : ''}`;
    if (ids.has(location.id)) throw new Error(`Multiple distinct MTR locations at one exit need reviewed IDs: ${location.id}`);
    ids.add(location.id);
  }
  return result.sort((a, b) => a.id.localeCompare(b.id));
}
export function mtrLocationSearchUrl(stationNameTc) {
  const url = new URL(LANDSD_LOCATION_SEARCH_URL);
  url.searchParams.set('q', `港鐵${stationNameTc}站`); url.searchParams.set('lang', 'zh-Hant');
  return url.href;
}
function finiteNumber(value) { return typeof value === 'number' && Number.isFinite(value); }
export function selectMtrVenueCoordinate(results, target) {
  if (!Array.isArray(results)) throw new Error('LandsD location search is not an array');
  const baseTc = `港鐵${target.stationNameTc}站`;
  const baseEn = `MTR ${target.stationNameEn} Station`;
  for (const kind of ['exit', 'station']) {
    const nameTc = kind === 'exit' ? `${baseTc}-${target.exit}進出口` : baseTc;
    const nameEn = kind === 'exit' ? `${baseEn}-${target.exit} Access` : baseEn;
    const candidates = results.filter((item) => key(item.nameZH) === key(nameTc) && key(item.nameEN) === key(nameEn));
    if (!candidates.length) continue;
    if (candidates.some((item) => !finiteNumber(item.x) || !finiteNumber(item.y))) return { reason: 'invalidOfficialGridCoordinate' };
    const unique = new Map(candidates.map((item) => [`${item.x}|${item.y}`, item]));
    if (unique.size !== 1) return { reason: `ambiguousOfficial${kind === 'exit' ? 'Exit' : 'Station'}Match` };
    const match = [...unique.values()][0];
    return { kind, match: { nameZH: match.nameZH, nameEN: match.nameEN, addressZH: match.addressZH ?? '',
      addressEN: match.addressEN ?? '', x: match.x, y: match.y } };
  }
  return { reason: 'noExactBilingualStationOrExitMatch' };
}
function validWgs84(latitude, longitude) {
  return finiteNumber(latitude) && finiteNumber(longitude) && latitude >= 22.13 && latitude <= 22.57 && longitude >= 113.8 && longitude <= 114.5;
}
export function makeMtrDrinkingWaterSnapshot(locations, coordinateEvidence, { generatedAt = new Date().toISOString(), tcRowCount, enRowCount } = {}) {
  const records = []; const unmapped = []; const auditLocations = [];
  for (const location of locations) {
    const coordinate = coordinateEvidence[location.id];
    const evidence = { id: location.id, stationCode: location.stationCode, stationNameTc: location.stationNameTc,
      stationNameEn: location.stationNameEn, exit: location.exit, lineCodes: location.lineCodes, sourceRows: location.sourceRows };
    if (!coordinate || coordinate.reason) {
      unmapped.push({ ...evidence, locationTc: location.locationTc, locationEn: location.locationEn,
        reason: coordinate?.reason ?? 'noCoordinateEvidence', coordinateSourceUrl: mtrLocationSearchUrl(location.stationNameTc) });
      continue;
    }
    if (!validWgs84(coordinate.latitude, coordinate.longitude)) throw new Error(`Invalid official Hong Kong coordinate: ${location.id}`);
    const reselected = selectMtrVenueCoordinate([coordinate.match], location);
    if (reselected.reason || reselected.kind !== coordinate.kind) throw new Error(`Coordinate evidence does not exactly match: ${location.id}`);
    const expectedUrl = mtrLocationSearchUrl(location.stationNameTc);
    if (coordinate.coordinateSourceUrl !== expectedUrl) throw new Error('Unexpected coordinate-source URL');
    const transformUrl = new URL(LANDSD_TRANSFORM_URL);
    for (const [k, v] of Object.entries({ inSys: 'hkgrid', outSys: 'wgsgeog', e: coordinate.match.x, n: coordinate.match.y })) transformUrl.searchParams.set(k, String(v));
    if (coordinate.transformUrl !== transformUrl.href) throw new Error('Unexpected coordinate-transform URL');
    const coordinateLabelTc = coordinate.kind === 'exit' ? `${location.stationNameTc}站${location.exit}出口` : `${location.stationNameTc}站`;
    const coordinateLabelEn = coordinate.kind === 'exit' ? `${location.stationNameEn} Station Exit ${location.exit}` : `${location.stationNameEn} Station`;
    records.push({
      id: location.id, provider: 'mtr', nameTc: `${location.stationNameTc}站飲水機`, nameEn: `${location.stationNameEn} Station drinking water dispenser`,
      addressTc: `${location.stationNameTc}站：${location.locationTc}`, addressEn: `${location.stationNameEn} Station: ${location.locationEn}`,
      latitude: coordinate.latitude, longitude: coordinate.longitude, locationTc: location.locationTc, locationEn: location.locationEn,
      typeTc: '飲水機', typeEn: 'Drinking water dispenser', unitCount: null, indoorOutdoor: 'indoor',
      serviceHoursTc: '', serviceHoursEn: '', temperatureTc: '', temperatureEn: '',
      remarksTc: '港鐵官方名錄所列補水機位；請自備水樽。路綫重複列項已去重，機位數不代表飲水機部數。官方未公布逐機過濾資料、水溫或確實服務時間。名錄未列停用公告，不代表即時可用。',
      remarksEn: 'Water-refill location listed by MTR; bring your own bottle. Duplicate line listings are removed; location count is not a machine count. Per-machine filtration, temperature and exact service hours are not published. No closure notice is listed; current availability is not guaranteed.',
      sourceUrl: MTR_WATER_SOURCE_URL, coordinateSourceUrl: coordinate.coordinateSourceUrl,
      // This is the verified official directory, not a guessed station-layout URL.
      officialMapUrl: MTR_WATER_SOURCE_URL, filterStatus: 'notPublished',
      accessTc: '車站大堂非付款區；只可於港鐵車站開放時間內使用，並受現場安排限制，非24小時保證。',
      accessEn: 'Station concourse, unpaid area; access during MTR station opening hours, subject to on-site arrangements, not guaranteed 24-hour access.',
      temporaryClosed: false, locationPrecision: 'building',
      locationNoteTc: `場地位置：採用地政總署${coordinateLabelTc}座標，並非飲水機精確位置；請按官方大堂及出口描述尋找飲水機。`,
      locationNoteEn: `Venue location: LandsD coordinates for ${coordinateLabelEn}, not the exact drinking-water dispenser position; follow the official concourse and exit description.`,
    });
    auditLocations.push({ ...evidence, coordinateKind: coordinate.kind, coordinateSourceUrl: coordinate.coordinateSourceUrl,
      coordinateMatch: coordinate.match, transformUrl: coordinate.transformUrl, latitude: coordinate.latitude, longitude: coordinate.longitude,
      searchResponseSha256: coordinate.searchResponseSha256, transformResponseSha256: coordinate.transformResponseSha256 });
  }
  const stationCount = new Set(locations.map((item) => item.stationCode)).size;
  return { generatedAt, source: { 'zh-Hant': '港鐵官方飲水機名錄、官方站碼及地政總署車站／出口場地座標',
    en: 'MTR official drinking-water directory, official station codes and LandsD station/exit venue coordinates' },
  sourceUrl: MTR_WATER_SOURCE_URL, sourceEnUrl: MTR_WATER_SOURCE_EN_URL,
  coordinateSource: { stationCodesUrl: MTR_STATIONS_URL, stationCodesDatasetUrl: MTR_STATIONS_DATASET_URL,
    locationSearchUrl: LANDSD_LOCATION_SEARCH_URL, locationSearchDatasetUrl: LANDSD_LOCATION_SOURCE_URL,
    transformUrl: LANDSD_TRANSFORM_URL, transformDatasetUrl: LANDSD_TRANSFORM_SOURCE_URL, precision: 'building' },
  records, unmapped, audit: { tcRowCount, enRowCount, stationCount, listedLocationCount: locations.length,
    duplicateLineRowsRemoved: tcRowCount - locations.length, mappedLocationCount: records.length,
    mappedStationCount: new Set(auditLocations.map((item) => item.stationCode)).size, unmappedLocationCount: unmapped.length,
    unmappedStationCount: new Set(unmapped.map((item) => item.stationCode)).size,
    exactDispenserCoordinateCount: 0, venueExitCoordinateCount: auditLocations.filter((item) => item.coordinateKind === 'exit').length,
    venueStationCoordinateCount: auditLocations.filter((item) => item.coordinateKind === 'station').length, locations: auditLocations } };
}
async function requestText(url) {
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Official MTR/LandsD request returned ${response.status}: ${url}`);
  return response.text();
}
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const i = cursor++; results[i] = await fn(items[i]); }
  }));
  return results;
}
export async function buildMtrDrinkingWater() {
  const [tcHtml, enHtml, stationCsv] = await Promise.all([MTR_WATER_SOURCE_URL, MTR_WATER_SOURCE_EN_URL, MTR_STATIONS_URL].map(requestText));
  const stations = parseMtrStations(stationCsv);
  const tc = parseMtrWaterPage(tcHtml); const en = parseMtrWaterPage(enHtml, { language: 'en' });
  const locations = pairMtrWaterLocations(tc, en, stations);
  // One deterministic batch program, one search response per distinct station; no per-station research or invented geocoding.
  const searches = new Map(await mapLimit([...new Set(locations.map((item) => item.stationNameTc))], 4, async (name) => {
    const url = mtrLocationSearchUrl(name); const raw = await requestText(url);
    const results = JSON.parse(raw); if (!Array.isArray(results)) throw new Error('Invalid LandsD search response');
    return [name, { url, results, sha256: sha256(raw) }];
  }));
  const coordinateEvidence = Object.fromEntries(await mapLimit(locations, 4, async (location) => {
    const search = searches.get(location.stationNameTc); const selected = selectMtrVenueCoordinate(search.results, location);
    if (selected.reason) return [location.id, selected];
    const transformUrl = new URL(LANDSD_TRANSFORM_URL);
    for (const [k, v] of Object.entries({ inSys: 'hkgrid', outSys: 'wgsgeog', e: selected.match.x, n: selected.match.y })) transformUrl.searchParams.set(k, String(v));
    const raw = await requestText(transformUrl.href); const point = JSON.parse(raw);
    const latitude = Number(point.wgsLat); const longitude = Number(point.wgsLong);
    if (point.wgsLat === undefined || point.wgsLong === undefined || !validWgs84(latitude, longitude)) return [location.id, { reason: 'invalidOfficialCoordinateTransform' }];
    return [location.id, { ...selected, latitude, longitude, coordinateSourceUrl: search.url,
      transformUrl: transformUrl.href, searchResponseSha256: search.sha256, transformResponseSha256: sha256(raw) }];
  }));
  const snapshot = makeMtrDrinkingWaterSnapshot(locations, coordinateEvidence, { tcRowCount: tc.rows.length, enRowCount: en.rows.length });
  snapshot.audit.sourceEvidence = { tcPageSha256: sha256(tcHtml), enPageSha256: sha256(enHtml), stationCsvSha256: sha256(stationCsv), officialStationCodeCount: stations.length };
  return snapshot;
}
