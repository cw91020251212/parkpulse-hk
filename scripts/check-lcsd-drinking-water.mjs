import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  LCSD_DRINKING_WATER_SOURCE_URL, LCSD_DRINKING_WATER_URLS,
  decodeLcsdDrinkingWater, parseLcsdCsvRows, parseLcsdDrinkingWaterCsv,
  parseLcsdDrinkingWater, buildLcsdDrinkingWater,
  isLcsdDrinkingWaterCoordinate, isLcsdDrinkingWaterTemporarilyClosed,
} from '../lib/lcsd-drinking-water.mjs';

// No network or /tmp dependency by default. To additionally prove the actual
// official raw CSVs against the snapshot and shuffle BOTH languages:
// node scripts/check-lcsd-drinking-water.mjs --sources /path/lcsd_wd_tc.csv /path/lcsd_wd_en.csv
const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/lcsd-drinking-water.json', import.meta.url), 'utf8'));
assert.ok(Number.isFinite(Date.parse(snapshot.generatedAt)));
assert.equal(snapshot.sourceUrl, LCSD_DRINKING_WATER_SOURCE_URL);
assert.match(snapshot.source['zh-Hant'], /康樂及文化事務署/);
assert.match(snapshot.source.en, /Water Dispensers/);
assert.deepEqual(snapshot.sourceUrls, LCSD_DRINKING_WATER_URLS);
assert.deepEqual(snapshot.audit.sourceRows, { 'zh-Hant': 1046, en: 1046 });
assert.equal(snapshot.audit.sourceUnitCount, 1460, 'Published machine count, not venue or row count');
assert.equal(snapshot.records.length, 1031, 'Pinned official snapshot: 1046 rows less 15 explicitly audited exclusions');
assert.equal(snapshot.audit.recordCount, snapshot.records.length);
assert.equal(snapshot.audit.unitCount, 1439);
assert.deepEqual(snapshot.audit.indoorOutdoor, { indoor: 347, outdoor: 684, unknown: 0 });
assert.equal(snapshot.audit.repairs.length, 4, 'Only four observed unquoted-comma English names are repaired');
assert.equal(snapshot.audit.duplicateRows.length, 2, 'Two completely identical source pairs remain, not silently deduplicated');

const requiredStrings = ['id', 'provider', 'nameTc', 'nameEn', 'addressTc', 'addressEn', 'locationTc', 'locationEn', 'typeTc', 'typeEn', 'serviceHoursTc', 'serviceHoursEn', 'temperatureTc', 'temperatureEn', 'remarksTc', 'remarksEn', 'sourceUrl', 'coordinateSourceUrl', 'filterStatus', 'accessTc', 'accessEn'];
const ids = new Set(), usedTc = new Set(), usedEn = new Set();
for (const record of snapshot.records) {
  for (const key of requiredStrings) assert.equal(typeof record[key], 'string', `${record.id}: ${key} must be a string, including unpublished empty text`);
  assert.match(record.id, /^lcsd-water-[a-f0-9]{20}(?:-\d+)?$/);
  assert.ok(!ids.has(record.id), `Duplicate ID ${record.id}`); ids.add(record.id);
  assert.equal(record.provider, 'lcsd');
  assert.ok(record.nameTc && record.nameEn && record.addressTc && record.addressEn);
  assert.ok(isLcsdDrinkingWaterCoordinate(record.latitude, record.longitude));
  assert.ok(record.unitCount === null || (Number.isSafeInteger(record.unitCount) && record.unitCount >= 0));
  assert.ok(['indoor', 'outdoor', 'unknown'].includes(record.indoorOutdoor));
  assert.equal(record.filterStatus, 'notPublished', 'Dictionary has no per-machine filter guarantee');
  assert.equal(record.sourceUrl, snapshot.sourceUrl);
  assert.equal(record.coordinateSourceUrl, LCSD_DRINKING_WATER_URLS['zh-Hant']);
  assert.match(record.accessTc, /不保證免費入場/);
  assert.match(record.accessTc, /非即時/);
  assert.match(record.accessEn, /free admission is not guaranteed/);
  assert.equal(typeof record.temporaryClosed, 'boolean');
  assert.equal(record.temporaryClosed, false, 'Actual CSV contains no explicit current dispenser-outage remarks');
  assert.ok(!JSON.stringify(record).includes('\uFFFD'), 'No encoding replacement character');
  assert.ok(!JSON.stringify(record).includes('\u0000'), 'No UTF-16 interpreted as UTF-8');
  for (const [language, used] of [['zh-Hant', usedTc], ['en', usedEn]]) {
    const row = record.sourceRows[language];
    assert.ok(Number.isInteger(row) && row >= 2 && row <= 1047);
    assert.ok(!used.has(row), `${language} row ${row} reused`); used.add(row);
  }
  assert.ok(record.pairingEvidence.method.includes('invariants') || record.pairingEvidence.method.startsWith('unique-coordinates'));
  for (const axis of ['latitude', 'longitude']) {
    assert.equal(record[axis], Number(record.sourceCoordinates['zh-Hant'][axis].trim()), 'TC coordinates retained, never invented');
    assert.ok(Math.abs(record[axis] - Number(record.sourceCoordinates.en[axis].trim())) <= 0.000001);
  }
}
for (const [language, used] of [['zh-Hant', usedTc], ['en', usedEn]]) {
  const excluded = snapshot.audit.skipped.filter((r) => r.language === language);
  assert.equal(excluded.length, 15);
  assert.equal(excluded.reduce((n, r) => n + (r.unitCount ?? 0), 0), 21);
  for (const row of excluded) { assert.ok(!used.has(row.row)); used.add(row.row); assert.ok(row.reason); }
  assert.equal(used.size, 1046, 'Every source row must be retained or explicitly audited exactly once');
}
assert.equal(snapshot.records.reduce((n, r) => n + (r.unitCount ?? 0), 0), snapshot.audit.unitCount);
for (const [kind, count] of Object.entries(snapshot.audit.indoorOutdoor)) assert.equal(snapshot.records.filter((r) => r.indoorOutdoor === kind).length, count);
for (const entry of snapshot.audit.duplicateRows) {
  const base = snapshot.records.find((r) => r.id === entry.baseId);
  const copy = snapshot.records.find((r) => r.id === `${entry.baseId}-${entry.occurrence}`);
  assert.ok(base && copy); assert.equal(copy.duplicateOf, base.id);
  for (const key of [...requiredStrings.filter((k) => k !== 'id'), 'latitude', 'longitude', 'unitCount']) assert.equal(base[key], copy[key]);
}
assert.ok(!snapshot.records.some((r) => (r.nameTc === '馬鞍山體育館' && r.latitude === 22.2534) || (r.nameTc === '馬鞍山遊樂場' && r.latitude === 22.251)), 'Known wrong-venue coordinates must not become markers');

const tcHeaders = ['建築物/設施名稱', '建築物/設施地址 - 街道', '建築物/設施地址 - 地區', '建築物/設施地址 - 區域', '飲水機位置', '緯度', '經度', '飲水機類別', '飲水機數目', '服務時間（由）', '服務時間（至）', '服務時間（除外）', '水溫', '室內/室外', '備註'];
const enHeaders = ['Name of Building/Facility', 'Address of Building/Facility - Street', 'Address of Building/Facility - District', 'Address of Building/Facility - Region', 'Location of Water Dispenser', 'Latitude', 'Longitude', 'Type of Water Dispenser', 'Number of Water Dispenser', 'Service Hours (From)', 'Service Hours (To)', 'Service Hours (Exception)', 'Water Temperature', 'Indoor/Outdoor', 'Remarks'];
const quote = (text) => `"${String(text).replaceAll('"', '""')}"`;
const csv = (values) => values.map(quote).join(',');
const nestedCsv = (headers, rows) => [headers, ...rows].map((r) => quote(csv(r))).join('\r\n') + '\r\n';
const utf16le = (text) => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
const utf16be = (text) => { const bytes = Buffer.from(text, 'utf16le'); bytes.swap16(); return Buffer.concat([Buffer.from([0xfe, 0xff]), bytes]); };
const tcBase = ['測試公園', '測試街, 1號', '中西區', '香港島', '一樓男洗手間外', '22.28', '114.15', '噴射式飲水機', '2', '07:00', '23:00', '定期保養日', '冷水', '室內', ''];
const enBase = ['Test Park', '1 Test Street, Central', 'Central & Western', 'Hong Kong Island', "Outside men's toilet on the 1/F", '22.2800001', '114.15', 'Fountain type', '2', '07:00', '23:00', 'Maintenance Day', 'Cold', 'Indoor', ''];
const change = (base, entries) => Object.assign([...base], entries);
const tcFixture = [tcBase,
  change(tcBase, { 4: '二樓女洗手間外' }),
  change(tcBase, { 4: '三樓育嬰室內', 7: '非噴射式飲水機', 8: '1', 12: '熱水／冷水', 14: '供租用人士使用\r\n包含"官方"原文' }),
  change(tcBase, { 4: '二樓女洗手間外', 0: '另一個場地', 1: '另一條街', 5: '22.29' }),
];
const enFixture = [enBase,
  change(enBase, { 4: "Outside ladies' toilet on the 2/F" }),
  change(enBase, { 4: 'Inside Babycare Room on the 3/F', 7: 'Non-fountain type', 8: '1', 12: 'Hot / Cold', 14: 'For hirers\r\nIncludes "official" text' }),
  change(enBase, { 4: "Outside ladies' toilet on the 2/F", 0: 'Another Venue', 1: 'Another Street', 5: '22.29' }),
];
const tcBytes = utf16le(nestedCsv(tcHeaders.map((h, i) => i < 2 ? `\uFEFF${h} ` : h), tcFixture));
const enText = nestedCsv(enHeaders, enFixture.toReversed());
assert.equal(decodeLcsdDrinkingWater(tcBytes), tcBytes.subarray(2).toString('utf16le'));
assert.equal(decodeLcsdDrinkingWater(utf16be('繁體中文, café')), '繁體中文, café');
assert.equal(decodeLcsdDrinkingWater(Buffer.from('\uFEFF繁體中文')), '繁體中文');
assert.deepEqual(parseLcsdCsvRows('a,"b,b","line1\r\nline2","a""b"\r\n'), [['a', 'b,b', 'line1\r\nline2', 'a"b']]);
assert.throws(() => parseLcsdCsvRows('"unfinished'), /Unterminated/);
assert.throws(() => parseLcsdCsvRows('"a"garbage'), /Malformed/);
assert.throws(() => parseLcsdDrinkingWaterCsv('not-the-official-header'), /expected 15|Unexpected/);
const parsed = parseLcsdDrinkingWaterCsv(tcBytes);
assert.equal(parsed.rows.length, 4); assert.equal(parsed.rows[2].values[14], tcFixture[2][14]);
const fixtures = parseLcsdDrinkingWater(tcBytes, utf16le(enText), { generatedAt: snapshot.generatedAt });
assert.equal(fixtures.records.length, 4); assert.equal(fixtures.audit.unitCount, 7); assert.equal(fixtures.audit.skipped.length, 0);
const men = fixtures.records.find((r) => r.nameTc === '測試公園' && r.locationTc === '一樓男洗手間外');
assert.equal(men.locationEn, "Outside men's toilet on the 1/F"); assert.equal(men.nameEn, 'Test Park');
const women = fixtures.records.find((r) => r.nameTc === '測試公園' && r.locationTc === '二樓女洗手間外');
assert.equal(women.locationEn, "Outside ladies' toilet on the 2/F"); assert.equal(women.nameEn, 'Test Park');
const another = fixtures.records.find((r) => r.nameTc === '另一個場地');
assert.equal(another.nameEn, 'Another Venue'); assert.equal(another.addressEn, 'Another Street', 'Same location description must not switch venue');
const baby = fixtures.records.find((r) => r.typeTc === '非噴射式飲水機');
assert.equal(baby.remarksTc, tcFixture[2][14]); assert.equal(baby.remarksEn, enFixture[2][14]);
assert.equal(baby.latitude, 22.28); assert.equal(baby.indoorOutdoor, 'indoor');
const withoutTrace = (records) => records.map(({ sourceRows, pairingEvidence, ...r }) => r);
const reordered = parseLcsdDrinkingWater(nestedCsv(tcHeaders, tcFixture.toReversed()), nestedCsv(enHeaders, enFixture));
assert.deepEqual(withoutTrace(fixtures.records), withoutTrace(reordered.records), 'BOTH language row orders must be irrelevant to IDs and display fields');
const duplicateFixture = parseLcsdDrinkingWater(nestedCsv(tcHeaders, [tcBase, tcBase]), nestedCsv(enHeaders, [enBase, enBase]));
assert.equal(duplicateFixture.records.length, 2); assert.equal(duplicateFixture.audit.unitCount, 4); assert.equal(duplicateFixture.audit.duplicateRows.length, 1);
const invalidFixture = parseLcsdDrinkingWater(nestedCsv(tcHeaders, [change(tcBase, { 5: '23.27778' })]), nestedCsv(enHeaders, [change(enBase, { 5: '23.27778' })]));
assert.equal(invalidFixture.records.length, 0); assert.equal(invalidFixture.audit.skipped.length, 2);
const conflictFixture = parseLcsdDrinkingWater(nestedCsv(tcHeaders, [tcBase]), nestedCsv(enHeaders, [change(enBase, { 5: '22.31' })]));
assert.equal(conflictFixture.records.length, 0, 'Do not silently fix bilingual coordinate conflicts');
const malformedEn = parseLcsdDrinkingWater(nestedCsv(tcHeaders, [tcBase]), nestedCsv(enHeaders, [change(enBase, { 6: '?114.15' })]));
assert.equal(malformedEn.records.length, 0, 'Do not strip malformed coordinate characters');
const unknownFixture = parseLcsdDrinkingWater(nestedCsv(tcHeaders, [change(tcBase, { 8: '', 13: '' })]), nestedCsv(enHeaders, [change(enBase, { 8: '', 13: '' })]));
assert.equal(unknownFixture.records[0].unitCount, null); assert.equal(unknownFixture.records[0].indoorOutdoor, 'unknown');
const ambiguous = parseLcsdDrinkingWater(nestedCsv(tcHeaders, [change(tcBase, { 4: '甲處' }), change(tcBase, { 4: '乙處' })]), nestedCsv(enHeaders, [change(enBase, { 4: 'Spot A' }), change(enBase, { 4: 'Spot B' })]));
assert.equal(ambiguous.records.length, 0, 'Unprovable bilingual positions must not be paired by ordinal');
assert.ok(ambiguous.audit.skipped.some((r) => r.reason === 'ambiguous-bilingual-location'));
assert.equal(isLcsdDrinkingWaterCoordinate(0, 0), false);
assert.equal(isLcsdDrinkingWaterCoordinate(NaN, 114.15), false);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('飲水機暫停使用，直至另行通知'), true);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('暫停使用'), true);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('暫停使用，直至另行通知'), true);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('暫停使用；現已恢復使用'), false);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('', 'Temporarily closed. Now reopened.'), false);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('', 'The drinking fountain is temporarily closed.'), true);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('定期保養日；游泳池每周暫停開放'), false);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('', 'Pet Garden closed from 2300-07:00'), false);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('飲水機並未暫停使用'), false);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('', 'The drinking fountain is not temporarily closed.'), false);
assert.equal(isLcsdDrinkingWaterTemporarilyClosed('飲水機已恢復使用'), false);

const args = process.argv.slice(2);
if (args.length) {
  assert.equal(args[0], '--sources', 'Usage: node scripts/check-lcsd-drinking-water.mjs [--sources tc.csv en.csv]');
  assert.equal(args.length, 3);
  const [tcRaw, enRaw] = await Promise.all(args.slice(1).map((p) => readFile(p)));
  const rebuilt = parseLcsdDrinkingWater(tcRaw, enRaw, { generatedAt: snapshot.generatedAt });
  assert.deepEqual(rebuilt, snapshot, 'Snapshot must exactly reflect supplied official source bytes');
  const rawTc = parseLcsdDrinkingWaterCsv(tcRaw), rawEn = parseLcsdDrinkingWaterCsv(enRaw, { language: 'en' });
  assert.equal(rawTc.rows.length, 1046); assert.equal(rawEn.rows.length, 1046);
  for (const r of snapshot.records) {
    const tc = rawTc.rows.find((row) => row.row === r.sourceRows['zh-Hant']).values;
    const en = rawEn.rows.find((row) => row.row === r.sourceRows.en).values;
    for (const [key, i] of [['nameTc', 0], ['addressTc', 1], ['locationTc', 4], ['typeTc', 7], ['temperatureTc', 12], ['remarksTc', 14]]) assert.equal(r[key], tc[i], 'Official TC text preserved');
    for (const [key, i] of [['nameEn', 0], ['addressEn', 1], ['locationEn', 4], ['typeEn', 7], ['temperatureEn', 12], ['remarksEn', 14]]) assert.equal(r[key], en[i], 'Official EN text preserved');
    assert.equal(r.districtTc, tc[2]); assert.equal(r.districtEn, en[2]);
    // This is a secondary check of these known originals, NOT the pairing method.
    assert.equal(r.sourceRows['zh-Hant'], r.sourceRows.en, 'Actual official semantic matches agree with the observed originals');
  }
  const reversed = parseLcsdDrinkingWater(nestedCsv(tcHeaders, rawTc.rows.toReversed().map((r) => r.values)), nestedCsv(enHeaders, rawEn.rows.toReversed().map((r) => r.values)));
  assert.deepEqual(withoutTrace(reversed.records), withoutTrace(snapshot.records), 'Actual bilingual source reordering must preserve all IDs and fields');
  let calls = 0;
  const api = await buildLcsdDrinkingWater({ generatedAt: snapshot.generatedAt, fetchImpl: async (url) => {
    calls += 1; assert.ok(Object.values(LCSD_DRINKING_WATER_URLS).includes(url));
    return new Response(url === LCSD_DRINKING_WATER_URLS.en ? enRaw : tcRaw, { status: 200 });
  } });
  assert.equal(calls, 2); assert.deepEqual(api, snapshot, 'Async download API must use BOM-decoded byte streams');
  console.log('Verified original CSV source bytes, all bilingual official text, reversed full datasets and injected async download API.');
}
console.log(`Verified LCSD drinking water: ${snapshot.records.length} source records, ${snapshot.audit.unitCount} published machines; indoor ${snapshot.audit.indoorOutdoor.indoor}, outdoor ${snapshot.audit.indoorOutdoor.outdoor}; 15 excluded rows / 21 machines, 2 exact duplicate source pairs retained.`);
