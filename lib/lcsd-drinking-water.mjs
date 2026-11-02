import { createHash } from 'node:crypto';

export const LCSD_DRINKING_WATER_SOURCE_URL = 'https://data.gov.hk/tc-data/dataset/hk-lcsd-facwd-fac-wd-list';
export const LCSD_DRINKING_WATER_URLS = Object.freeze({
  'zh-Hant': 'https://www.lcsd.gov.hk/datagovhk/fac-wd/lcsd_wd_tc.csv',
  en: 'https://www.lcsd.gov.hk/datagovhk/fac-wd/lcsd_wd_en.csv',
});
export const LCSD_DRINKING_WATER_DICTIONARY_URL = 'https://www.lcsd.gov.hk/datagovhk/fac-wd/lcsd_wd_data_dictionary_tc.pdf';
const TC_HEADERS = ['建築物/設施名稱', '建築物/設施地址 - 街道', '建築物/設施地址 - 地區', '建築物/設施地址 - 區域', '飲水機位置', '緯度', '經度', '飲水機類別', '飲水機數目', '服務時間（由）', '服務時間（至）', '服務時間（除外）', '水溫', '室內/室外', '備註'];
const EN_HEADERS = ['Name of Building/Facility', 'Address of Building/Facility - Street', 'Address of Building/Facility - District', 'Address of Building/Facility - Region', 'Location of Water Dispenser', 'Latitude', 'Longitude', 'Type of Water Dispenser', 'Number of Water Dispenser', 'Service Hours (From)', 'Service Hours (To)', 'Service Hours (Exception)', 'Water Temperature', 'Indoor/Outdoor', 'Remarks'];
const DISTRICTS = new Map(Object.entries({ '中西區': 'Central & Western', '東區': 'Eastern', '南區': 'Southern', '灣仔區': 'Wan Chai', '九龍城區': 'Kowloon City', '觀塘區': 'Kwun Tong', '深水埗區': 'Sham Shui Po', '黃大仙區': 'Wong Tai Sin', '油尖旺區': 'Yau Tsim Mong', '葵青區': 'Kwai Tsing', '北區': 'North', '西貢區': 'Sai Kung', '沙田區': 'Sha Tin', '大埔區': 'Tai Po', '荃灣區': 'Tsuen Wan', '屯門區': 'Tuen Mun', '元朗區': 'Yuen Long', '離島區': 'Islands' }));
const VALUES = new Map(Object.entries({ '噴射式飲水機': 'fountain type', '非噴射式飲水機': 'non-fountain type', '室內': 'indoor', '室外': 'outdoor', '環境溫度': 'ambient temperature', '冷水': 'cold', '環境溫度／冷水': 'ambient temperature/cold', '熱水／冷水': 'hot/cold', '熱水／環境溫度／冷水': 'hot/ambient temperature/cold', '活動舉辦日': 'event day', '香港島': 'hong kong island', '九龍': 'kowloon', '新界': 'new territories', '星期一至三、五: 18:00;星期六、日、公眾假期: 19:00': 'mon-wed, fri: 18:00;sat, sun, ph: 19:00' }));
const clean = (value) => String(value ?? '').trim();
const canonical = (value) => VALUES.get(clean(value)) ?? clean(value).toLowerCase().replace(/\s*\/\s*/g, '/');
const hash = (value) => createHash('sha256').update(value).digest('hex');
// Exact, reviewed bad coordinates only. These are exclusions, NEVER replacement
// dispenser positions: a venue-centre coordinate cannot locate an individual tap.
const KNOWN_COORDINATE_ERRORS = [
  { nameTc: '馬鞍山遊樂場', nameEn: 'Ma On Shan Recreation Ground', latitude: 22.251, longitude: 114.1341,
    evidenceUrl: 'https://www.lcsd.gov.hk/datagovhk/facility/facility-bkbc.json',
    officialVenueLatitude: '22-25-10', officialVenueLongitude: '114-13-41',
    evidence: 'Official same-name, same-address recreation-ground record GIHS BoFdhWi6LD places the venue in Ma On Shan, not the water-CSV point on Hong Kong Island; verified 2026-11-02.' },
  { nameTc: '馬鞍山體育館', nameEn: 'Ma On Shan Sports Centre', latitude: 22.2534, longitude: 114.1346,
    evidenceUrl: 'https://www.lcsd.gov.hk/datagovhk/venue/venue.json',
    officialVenueLatitude: 22.42602, officialVenueLongitude: 114.22956,
    evidence: 'Same-name official LCSD venue coordinates already held in project public/lcsd-washroom-venues.json; the water-CSV point is on Hong Kong Island. Excluded conservatively, not replaced by the venue centre.' },
];

/** Decode by BOM, not Response.text(): the official files are UTF-16LE. */
export function decodeLcsdDrinkingWater(input) {
  if (typeof input === 'string') return input.replace(/^\uFEFF/, '');
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  if (!ArrayBuffer.isView(bytes)) throw new TypeError('Expected CSV string, ArrayBuffer or Uint8Array');
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le'
    : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
  return new TextDecoder(encoding, { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
}

/** RFC4180-style rows; preserve field text, embedded CR/LF and escaped quotes. */
export function parseLcsdCsvRows(input) {
  const text = String(input).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false, closed = false;
  const pushRow = () => { row.push(field); if (row.some((v) => v !== '')) rows.push(row); row = []; field = ''; closed = false; };
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === ',' || c === '\n' || c === '\r') {
      if (c === ',') { row.push(field); field = ''; closed = false; }
      else { if (c === '\r' && text[i + 1] === '\n') i += 1; pushRow(); }
    } else if (c === '"' && field === '' && !closed) quoted = true;
    else if (closed && /[ \t]/.test(c)) { /* tolerate insignificant space after closing quote */ }
    else if (closed || c === '"') throw new Error(`Malformed CSV quote at character ${i}`);
    else field += c;
  }
  if (quoted) throw new Error('Unterminated CSV quoted field');
  if (field !== '' || row.length || closed) pushRow();
  return rows;
}

/** Pure parser. Each source row is itself a quoted one-column CSV record. */
export function parseLcsdDrinkingWaterCsv(input, { language = 'zh-Hant' } = {}) {
  if (!['zh-Hant', 'en'].includes(language)) throw new Error(`Unsupported LCSD CSV language: ${language}`);
  const outer = parseLcsdCsvRows(decodeLcsdDrinkingWater(input));
  const repairs = [];
  const rows = outer.map((record, i) => {
    if (record.length !== 1) throw new Error(`LCSD ${language} outer row ${i + 1} must have one column`);
    const inner = parseLcsdCsvRows(record[0]);
    if (inner.length !== 1) throw new Error(`LCSD ${language} inner row ${i + 1} must be one CSV record`);
    let values = inner[0];
    // Four observed EN names have an unquoted comma. Repair ONLY the known names,
    // verified by the expected 15-column tail and exact name suffix, never generically.
    if (language === 'en' && values.length === 16
      && ((values[0] === 'King George V Memorial Park' && [' Hong Kong', ' Kowloon'].includes(values[1]))
        || (values[0] === 'Sir Denys Roberts Squash Courts' && values[1] === ' Yuen Long'))
      && /^\d+(?:\.\d+)?$/.test(values[6]) && /^\d+(?:\.\d+)?$/.test(values[7])
      && ['Fountain type', 'Non-fountain type'].includes(clean(values[8]))) {
      values = [values.slice(0, 2).join(','), ...values.slice(2)];
      repairs.push({ row: i + 1, reason: 'official-unquoted-comma-in-English-name', name: values[0] });
    }
    if (values.length !== 15) throw new Error(`LCSD ${language} row ${i + 1}: expected 15 inner columns, got ${values.length}`);
    return values;
  });
  const headers = rows.shift();
  const expected = language === 'en' ? EN_HEADERS : TC_HEADERS;
  if (!headers || headers.some((v, i) => v.replace(/\uFEFF/g, '').trim() !== expected[i])) throw new Error(`Unexpected LCSD ${language} headers`);
  return { language, headers, repairs, rows: rows.map((values, i) => ({ row: i + 2, values })) };
}

function number(value) { return /^[-+]?\d+(?:\.\d+)?$/.test(clean(value)) ? Number(value) : NaN; }
export function isLcsdDrinkingWaterCoordinate(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= 22.1 && latitude <= 22.6 && longitude >= 113.8 && longitude <= 114.5;
}
function unitCount(value) { return /^\d+$/.test(clean(value)) && Number.isSafeInteger(Number(value)) ? Number(value) : null; }
function invariantsMatch(tc, en) {
  const a = tc.values, b = en.values;
  return Math.abs(number(a[5]) - number(b[5])) <= 0.000001
    && Math.abs(number(a[6]) - number(b[6])) <= 0.000001
    && clean(DISTRICTS.get(clean(a[2]))) === clean(b[2])
    && canonical(a[3]) === canonical(b[3])
    && [7, 8, 9, 10, 12, 13].every((i) => canonical(a[i]) === canonical(b[i]));
}

// This lexicon is used only as positive bilingual matching evidence, never to
// generate or replace any official display text. Unknown/ambiguous rows are audited.
const LOCATION_FEATURES = [
  ['male', /男/, /\bmen(?:'s|s)?\b|\bmale\b/i], ['female', /女/, /\blad(?:y|ies)(?:'s|')?\b|\bfemale\b|\bwomen(?:'s)?\b/i],
  ['family', /家庭/, /\bfamily\b/i], ['accessible', /暢通易達|傷健/, /accessible|disabled/i],
  ['toilet', /洗手間|廁所/, /toilet|washroom|lavator/i], ['changing', /更衣/, /chang(?:ing|e)\s*room/i],
  ['first-aid', /救護|救傷/, /first[ -]?aid/i], ['baby', /育嬰/, /baby\s*care|babycare/i],
  ['lobby', /大堂/, /lobby|foyer/i], ['office', /辦事處/, /office/i],
  ['arena', /主場|主館/, /arena|main (?:hall|ground)/i], ['fitness', /健身/, /fitness/i],
  ['table-tennis', /乒乓/, /table[ -]?tennis/i], ['squash', /壁球/, /squash/i],
  ['tennis', /網球/, /(?<!table[ -])tennis/i], ['basketball', /籃球/, /basketball/i],
  ['football', /足球/, /football|soccer/i], ['volleyball', /排球/, /volleyball/i],
  ['playground', /兒童遊樂|兒童遊戲/, /children.*play|playroom|play area/i],
  ['pool', /泳池|池面|副池/, /pool|pool deck/i], ['training', /訓練/, /training/i],
  ['stair', /樓梯/, /stair/i], ['lift', /升降機/, /\blift|elevator/i],
  ['locker', /儲物櫃|貯物櫃/, /locker/i], ['store', /貯物室|儲物室/, /store\s?room|storage/i],
  ['vending', /售賣機/, /vending/i], ['tv', /電視/, /television|\btv\b/i],
  ['tai-chi', /太極/, /tai\s?chi/i], ['bowling', /滾球/, /bowl/i],
  ['roller', /滾軸|溜冰/, /roller|skat/i], ['boat', /模型船/, /model boat/i],
  ['pavilion', /亭/, /pavilion/i], ['egg-board', /大蛋山資訊牌/, /introduction board.*egg/i],
  ['flower-light', /花床地燈/, /flower bed light/i], ['temple', /廟/, /temple/i],
  ['main-entrance', /正門/, /main entrance/i], ['rear-entrance', /後門/, /rear entrance/i],
  ['elderly', /長者/, /elderly/i], ['riviera', /荃灣海濱/, /tsuen wan riviera/i],
  ['north', /北/, /\bnorth(?:ern)?\b/i], ['south', /南/, /\bsouth(?:ern)?\b/i],
  ['east', /東/, /\beast(?:ern)?\b/i], ['west', /西/, /\bwest(?:ern)?\b/i],
  ['inside', /室內|內[）)]?$|內近/, /\binside\b|\bindoor\b/i], ['outside', /室外|外[）)]?$|外近/, /\boutside\b|\boutdoor\b/i],
  ['entrance', /入口|出入口/, /entrance|entry/i], ['exit', /出口/, /\bexit\b/i],
];
function locationFeatures(value, language) {
  const features = new Set(LOCATION_FEATURES.filter(([, tc, en]) => (language === 'en' ? en : tc).test(value)).map(([key]) => key));
  let text = value;
  if (language !== 'en') {
    const nums = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    text = text.replace(/[零一二三四五六七八九十]+/g, (n) => {
      if (n.includes('十')) { const [tens, ones] = n.split('十'); return String((tens ? nums[tens] : 1) * 10 + (ones ? nums[ones] : 0)); }
      return [...n].map((digit) => nums[digit]).join('');
    });
    if (/地下/.test(text)) features.add('floor:0');
    for (const m of text.matchAll(/(\d+)\s*樓/g)) features.add(`floor:${Number(m[1])}`);
    for (const m of text.matchAll(/(\d+)號/g)) features.add(`number:${Number(m[1])}`);
  } else {
    if (/\bg\/?f\b|ground floor/i.test(text)) features.add('floor:0');
    for (const m of text.matchAll(/\b(\d+)\s*\/?f\b|\b(\d+)(?:st|nd|rd|th)\s+floor/gi)) features.add(`floor:${Number(m[1] ?? m[2])}`);
    for (const m of text.matchAll(/\bno\.?\s*(\d+)/gi)) features.add(`number:${Number(m[1])}`);
  }
  for (const m of text.matchAll(/[A-Z]+\d+[A-Z]?/g)) features.add(`room:${m[0]}`);
  for (const m of text.matchAll(/(?:[）)]|水簾|bath\s+)([A-Z])(?:出口|$)/g)) features.add(`letter:${m[1]}`);
  return features;
}
function matchingLocation(tc, candidates) {
  const a = locationFeatures(tc.values[4], 'zh-Hant');
  const scored = candidates.map((en) => {
    const b = locationFeatures(en.values[4], 'en');
    const conflict = [['male', 'female'], ['male', 'family'], ['female', 'family'], ['inside', 'outside']].some(([x, y]) => (a.has(x) && !a.has(y) && b.has(y) && !b.has(x)) || (a.has(y) && !a.has(x) && b.has(x) && !b.has(y)));
    const floorsA = [...a].filter((x) => x.startsWith('floor:'));
    const floorsB = [...b].filter((x) => x.startsWith('floor:'));
    const floorConflict = floorsA.length && floorsB.length && !floorsA.some((x) => b.has(x));
    const common = [...a].filter((x) => b.has(x));
    return { en, score: conflict || floorConflict ? -1 : common.length, common };
  }).sort((x, y) => y.score - x.score);
  if (scored[0]?.score > 0 && (scored.length === 1 || scored[0].score > scored[1].score)) return scored[0];
  return null;
}

/** Detect explicit dispenser-outage wording in source remarks only. Recurring
 * opening exceptions and unrelated facility notices do not imply an outage.
 * This annual dataset is NOT a real-time status or notice-expiry feed. */
export function isLcsdDrinkingWaterTemporarilyClosed(remarksTc = '', remarksEn = '') {
  const tc = clean(remarksTc), en = clean(remarksEn);
  const tcClosed = /(?:飲水機|飲水設施|水機)[^。；\n]{0,35}(?:暫停使用|暫停服務|暫停開放|暫時關閉|暫時停用|停止使用)/.test(tc)
    && !/(?:並非|並未|沒有|不會).*(?:暫停|關閉|停用)|已恢復|恢復使用/.test(tc);
  const enClosed = /(?:water\s+dispensers?|drinking\s+(?:fountains?|water\s+facilities))[^.;\n]{0,70}(?:temporarily\s+(?:closed|suspended|unavailable)|out of service|suspended until further notice)/i.test(en)
    && !/\b(?:not|no longer)\s+(?:temporarily\s+)?(?:closed|suspended|unavailable|out of service)|(?:resumed|reopened|back in service)/i.test(en);
  const standalone = (/^(?:暫停使用|暫停服務|暫時停用|暫時關閉)(?:[。，；,.!\s]|$)/.test(tc) && !/已恢復|恢復使用/.test(tc))
    || (/^(?:temporarily (?:closed|suspended|unavailable)|out of service)(?:[.!\s]|$)/i.test(en) && !/resumed|reopened|back in service/i.test(en));
  return tcClosed || enClosed || standalone;
}

/** Pure bilingual snapshot builder. The EN order may differ; matching never uses
 * row ordinal. Keep all distinguishable positions/types and exact duplicate rows. */
export function parseLcsdDrinkingWater(tcInput, enInput, { generatedAt = new Date().toISOString() } = {}) {
  const tc = parseLcsdDrinkingWaterCsv(tcInput, { language: 'zh-Hant' });
  const en = parseLcsdDrinkingWaterCsv(enInput, { language: 'en' });
  const skipped = [], repairs = [...tc.repairs.map((r) => ({ language: 'zh-Hant', ...r })), ...en.repairs.map((r) => ({ language: 'en', ...r }))];
  const coordinateError = (r) => KNOWN_COORDINATE_ERRORS.find((e) => [e.nameTc, e.nameEn].includes(clean(r.values[0])) && number(r.values[5]) === e.latitude && number(r.values[6]) === e.longitude);
  const invalid = (r) => !isLcsdDrinkingWaterCoordinate(number(r.values[5]), number(r.values[6])) || Boolean(coordinateError(r));
  const validTc = tc.rows.filter((r) => !invalid(r));
  const validEn = en.rows.filter((r) => !invalid(r));
  for (const [language, rows] of [['zh-Hant', tc.rows], ['en', en.rows]]) for (const r of rows.filter(invalid)) skipped.push({ language, row: r.row, reason: coordinateError(r) ? 'published-coordinate-inconsistent-with-official-venue' : 'invalid-or-outside-Hong-Kong-WGS84', name: r.values[0], location: r.values[4], latitude: r.values[5], longitude: r.values[6], unitCount: unitCount(r.values[8]), ...(coordinateError(r) ? { evidenceUrl: coordinateError(r).evidenceUrl } : {}) });
  const candidates = new Map(validTc.map((a) => [a, validEn.filter((b) => invariantsMatch(a, b))]));
  const paired = new Map(), used = new Set(), evidence = new Map();
  // Bilingual venue names and addresses are anchored by unique numerical/categorical
  // signatures. Later ambiguous positions may not silently switch to another venue.
  const venuePairs = new Map();
  const tcVenue = (r) => JSON.stringify(r.values.slice(0, 4));
  const enVenue = (r) => JSON.stringify(r.values.slice(0, 4));
  const pair = (a, b, method, features = []) => {
    paired.set(a, b); used.add(b); evidence.set(a, { method, coordinateToleranceDegrees: 0.000001, sharedLocationFeatures: features });
    const key = tcVenue(a); if (!venuePairs.has(key)) venuePairs.set(key, new Set()); venuePairs.get(key).add(enVenue(b));
  };
  for (const a of validTc) {
    const list = candidates.get(a);
    if (list.length === 1 && validTc.filter((x) => candidates.get(x).includes(list[0])).length === 1) pair(a, list[0], 'unique-coordinates-district-region-type-count-hours-temperature-indoor');
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const a of validTc) {
      if (paired.has(a)) continue;
      const anchor = venuePairs.get(tcVenue(a));
      const list = candidates.get(a).filter((b) => !used.has(b) && (!anchor || anchor.has(enVenue(b))));
      if (!list.length) continue;
      const competingTc = list.length === 1 ? validTc.filter((x) => !paired.has(x) && candidates.get(x).includes(list[0])) : [];
      if (list.length === 1 && competingTc.length === 1) {
        pair(a, list[0], 'invariants-and-one-to-one-elimination'); changed = true;
      } else if (list.length > 1 && list.every((b) => JSON.stringify(b.values) === JSON.stringify(list[0].values))) {
        // The official duplicate rows are indistinguishable, NOT distinct translated locations.
        pair(a, list[0], 'invariants-and-identical-English-source-rows'); changed = true;
      } else {
        const match = matchingLocation(a, list);
        if (match) { pair(a, match.en, 'invariants-and-bilingual-location-features', match.common); changed = true; }
      }
    }
  }
  for (const a of validTc.filter((r) => !paired.has(r))) skipped.push({ language: 'zh-Hant', row: a.row, reason: candidates.get(a).length ? 'ambiguous-bilingual-location' : 'no-coordinate-and-invariant-English-match', name: a.values[0], location: a.values[4], latitude: a.values[5], longitude: a.values[6], unitCount: unitCount(a.values[8]), candidates: candidates.get(a).map((b) => ({ row: b.row, name: b.values[0], location: b.values[4] })) });
  for (const b of validEn.filter((r) => !used.has(r))) skipped.push({ language: 'en', row: b.row, reason: 'unpaired-English-source-row', name: b.values[0], location: b.values[4], latitude: b.values[5], longitude: b.values[6], unitCount: unitCount(b.values[8]) });
  const accessTc = '按場地開放時間及入場／租用規則使用；不保證免費入場。此資料非即時維修或供水狀態，使用前請向場地查詢。';
  const accessEn = 'Subject to venue opening hours and admission / booking rules; free admission is not guaranteed. This is not live maintenance or water-supply information; check with the venue before use.';
  const identities = new Map(), duplicateRows = [];
  const records = validTc.filter((a) => paired.has(a)).map((a) => {
    const b = paired.get(a), x = a.values, y = b.values;
    // No row number, update timestamp or service schedule in identity. TC source
    // identity avoids EN translation / precision changes renaming every marker.
    const identity = JSON.stringify([x[0], x[1], x[2], x[3], x[4], number(x[5]), number(x[6]), x[7], unitCount(x[8]), x[12], x[13]]);
    const baseId = `lcsd-water-${hash(identity).slice(0, 20)}`;
    const occurrence = (identities.get(baseId) ?? 0) + 1;
    identities.set(baseId, occurrence);
    if (occurrence > 1) duplicateRows.push({ baseId, occurrence, tcRow: a.row, enRow: b.row, reason: 'same-official-identity-retained-not-deduplicated' });
    const serviceHours = (v, lang) => [v[9] || v[10] ? `${v[9]} – ${v[10]}` : '', v[11] ? `${lang === 'en' ? 'Except' : '除外'}: ${v[11]}` : ''].filter(Boolean).join('; ');
    return {
      id: occurrence === 1 ? baseId : `${baseId}-${occurrence}`, provider: 'lcsd',
      nameTc: x[0], nameEn: y[0], addressTc: x[1], addressEn: y[1],
      latitude: number(x[5]), longitude: number(x[6]), locationTc: x[4], locationEn: y[4],
      typeTc: x[7], typeEn: y[7], unitCount: unitCount(x[8]),
      indoorOutdoor: canonical(x[13]) === 'indoor' ? 'indoor' : canonical(x[13]) === 'outdoor' ? 'outdoor' : 'unknown',
      serviceHoursTc: serviceHours(x, 'zh-Hant'), serviceHoursEn: serviceHours(y, 'en'),
      temperatureTc: x[12], temperatureEn: y[12], remarksTc: x[14], remarksEn: y[14],
      sourceUrl: LCSD_DRINKING_WATER_SOURCE_URL, coordinateSourceUrl: LCSD_DRINKING_WATER_URLS['zh-Hant'],
      filterStatus: 'notPublished', accessTc: x[14] ? `${x[14]} ${accessTc}` : accessTc,
      accessEn: y[14] ? `${y[14]} ${accessEn}` : accessEn,
      temporaryClosed: isLcsdDrinkingWaterTemporarilyClosed(x[14], y[14]),
      districtTc: x[2], districtEn: y[2], regionTc: x[3], regionEn: y[3],
      serviceHoursFromTc: x[9], serviceHoursToTc: x[10], serviceHoursExceptionTc: x[11],
      serviceHoursFromEn: y[9], serviceHoursToEn: y[10], serviceHoursExceptionEn: y[11],
      sourceRows: { 'zh-Hant': a.row, en: b.row }, pairingEvidence: evidence.get(a),
      sourceCoordinates: { 'zh-Hant': { latitude: x[5], longitude: x[6] }, en: { latitude: y[5], longitude: y[6] } },
      ...(occurrence > 1 ? { duplicateOf: baseId } : {}),
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
  return {
    generatedAt, source: { 'zh-Hant': '康樂及文化事務署轄下場地內飲水機', en: 'Water Dispensers in LCSD venues' },
    sourceUrl: LCSD_DRINKING_WATER_SOURCE_URL, records,
    sourceUrls: LCSD_DRINKING_WATER_URLS, dictionaryUrl: LCSD_DRINKING_WATER_DICTIONARY_URL,
    audit: {
      sourceRows: { 'zh-Hant': tc.rows.length, en: en.rows.length },
      sourceUnitCount: tc.rows.reduce((n, r) => n + (unitCount(r.values[8]) ?? 0), 0),
      recordCount: records.length, unitCount: records.reduce((n, r) => n + (r.unitCount ?? 0), 0),
      indoorOutdoor: Object.fromEntries(['indoor', 'outdoor', 'unknown'].map((k) => [k, records.filter((r) => r.indoorOutdoor === k).length])),
      skipped, repairs, duplicateRows, knownCoordinateErrors: KNOWN_COORDINATE_ERRORS,
      decodedContentSha256: { 'zh-Hant': hash(decodeLcsdDrinkingWater(tcInput)), en: hash(decodeLcsdDrinkingWater(enInput)) },
      notes: [
        'One record represents one official source row, not necessarily one machine or one venue. unitCount is the published number of dispensers.',
        'Exact duplicate source rows are retained with occurrence suffixes; their physical distinctness cannot be established from this dataset.',
        'Coordinates use the TC CSV verbatim; EN coordinates must be valid and agree within 0.000001 degree. No geocoding, inferred coordinates or coordinate repair.',
        'Bounds validation is not a district-boundary or on-site accuracy guarantee; even bilingual official coordinates may contain undetected errors.',
        'The dictionary publishes no per-dispenser filter specification or filter-maintenance guarantee: filterStatus is notPublished for every row.',
        'temporaryClosed=false means no explicit current dispenser-outage notice in the CSV remarks, not a live availability guarantee. Recurring service-hour exceptions are not treated as current outages.',
      ],
      closureEvidence: { checkedUrl: 'https://www.lcsd.gov.hk/en/facilities/facilitieslist.html', checkedAt: '2026-11-02', finding: 'Official notices use temporarily closed and may concern selected facilities while others remain open. No drinking-fountain-specific notice was found in this page during this check; no global/type-wide closure is inferred.' },
    },
  };
}

/** Download both official byte streams. Injectable fetch supports offline fixtures;
 * network failures are errors, never silently replaced by stale or synthetic data. */
export async function buildLcsdDrinkingWater({ fetchImpl = globalThis.fetch, generatedAt = new Date().toISOString() } = {}) {
  const download = async (url) => {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetchImpl(url, { headers: { Accept: 'text/csv,*/*', 'User-Agent': 'ParkPulse-HK official-data snapshot' }, signal: AbortSignal.timeout(60_000) });
        if (!response.ok) throw new Error(`LCSD CSV ${url}: HTTP ${response.status}`);
        return new Uint8Array(await response.arrayBuffer());
      } catch (error) { lastError = error; if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1))); }
    }
    throw lastError;
  };
  const [tc, en] = await Promise.all(Object.values(LCSD_DRINKING_WATER_URLS).map(download));
  const result = parseLcsdDrinkingWater(tc, en, { generatedAt });
  if (result.audit.sourceRows['zh-Hant'] < 900 || result.audit.sourceRows.en < 900 || result.records.length < 800) throw new Error(`LCSD drinking-water snapshot unexpectedly small: ${result.records.length}`);
  return result;
}
