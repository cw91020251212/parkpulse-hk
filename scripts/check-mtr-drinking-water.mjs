import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  parseMtrStations, parseMtrWaterPage, pairMtrWaterLocations,
  selectMtrVenueCoordinate, makeMtrDrinkingWaterSnapshot, mtrLocationSearchUrl,
  MTR_WATER_SOURCE_URL, MTR_WATER_SOURCE_EN_URL, MTR_STATIONS_URL,
  MTR_STATIONS_DATASET_URL, LANDSD_LOCATION_SEARCH_URL, LANDSD_LOCATION_SOURCE_URL,
  LANDSD_TRANSFORM_URL, LANDSD_TRANSFORM_SOURCE_URL,
} from '../lib/mtr-drinking-water.mjs';

// This check must never rebuild the snapshot or make a network request.
globalThis.fetch = () => { throw new Error('Network access is forbidden in this offline check'); };
let checks = 0;
function check(label, fn) {
  fn();
  checks++;
  console.log(`PASS ${label}`);
}
function unique(values, label) {
  assert.equal(new Set(values).size, values.length, label);
}
function officialHttps(value, expected) {
  const url = new URL(value);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.username, '');
  assert.equal(url.password, '');
  assert.equal(url.hash, '');
  assert.ok(['www.mtr.com.hk', 'opendata.mtr.com.hk', 'data.gov.hk',
    'www.map.gov.hk', 'www.geodetic.gov.hk'].includes(url.hostname), value);
  if (expected !== undefined) assert.equal(value, expected);
  return url;
}
const digest = (value) => assert.match(value, /^[a-f\d]{64}$/);
const normal = (value) => value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase();
const stationTc = (value) => normal(value.replace(/站$/, ''));
const stationEn = (value) => normal(value.replace(/(?:\s+Station)+$/i, ''));

// Synthetic, deliberately reordered source tables: not copies of the live pages.
const csv = '\uFEFFLine Code,Station Code,Chinese Name,English Name\r\n'
  + 'EAL,ADM,金鐘,Admiralty\r\nISL,ADM,金鐘,Admiralty\r\n'
  + 'EAL,EXC,會展,Exhibition Centre\r\nISL,CHW,柴灣,"Chai Wan"\r\n';
const tcHtml = `<table>
<tr><th>東鐵綫</th><th>地點</th></tr>
<tr><td>金鐘站</td><td>車站大堂B出口 (非付款區)</td></tr>
<tr><td>會展站</td><td>車站大堂A出口 (非付款區)</td></tr>
<tr><th>港島綫</th><th>地點</th></tr>
<tr><td>柴灣站</td><td>車站大堂D出口 (非付款區)</td></tr>
<tr><td>金鐘站</td><td>車站大堂B出口 (非付款區)</td></tr>
</table>`;
const enHtml = `<table>
<tr><th>Island Line</th><th>Location</th></tr>
<tr><td>Admiralty Station</td><td>Station Concourse Exit B (Unpaid Area)</td></tr>
<tr><td>Chai Wan Station</td><td>Station Concourse Exit D (Unpaid Area)</td></tr>
<tr><th>East Rail Line</th><th>Location</th></tr>
<tr><td>Exhibition Centre Station</td><td>Station Concourse Exit A (Unpaid Area)</td></tr>
<tr><td>Admiralty Station</td><td>Station Concourse Exit B (Unpaid Area)</td></tr>
</table>`;
const stations = parseMtrStations(csv);
const tcPage = parseMtrWaterPage(tcHtml);
const enPage = parseMtrWaterPage(enHtml, { language: 'en' });
const locations = pairMtrWaterLocations(tcPage, enPage, stations);
const adm = locations.find((item) => item.stationCode === 'ADM');
const exc = locations.find((item) => item.stationCode === 'EXC');
const chw = locations.find((item) => item.stationCode === 'CHW');

check('station CSV keeps bilingual names, quoted fields and unique cross-line station codes', () => {
  assert.equal(stations.length, 3);
  assert.deepEqual(stations.find((item) => item.code === 'ADM'), {
    code: 'ADM', nameTc: '金鐘', nameEn: 'Admiralty', lineCodes: ['EAL', 'ISL'],
  });
  assert.equal(stations.find((item) => item.code === 'CHW').nameEn, 'Chai Wan');
  assert.throws(() => parseMtrStations('Station Code,Chinese Name\nADM,金鐘'), /schema/);
  assert.throws(() => parseMtrStations(`${csv}ISL,ADM,另一站,Admiralty\n`), /Inconsistent/);
  assert.throws(() => parseMtrStations(`${csv}ISL,ZZZ,缺少欄位\n`), /row width/);
});

check('bilingual parsing pairs by station code + line + exit, not row or section order', () => {
  assert.equal(tcPage.rows.length, 4);
  assert.equal(enPage.rows.length, 4);
  assert.equal(locations.length, 3);
  assert.deepEqual(adm.lineCodes, ['EAL', 'ISL']);
  assert.deepEqual(adm.sourceRows.map((row) => [row.lineCode, row.tcRowNumber, row.enRowNumber]),
    [['EAL', 1, 4], ['ISL', 4, 1]]);
  assert.equal(exc.sourceRows[0].enRowNumber, 3);
  assert.equal(chw.sourceRows[0].enRowNumber, 2);
  assert.equal(adm.sourceRows.length, 2, 'Cross-line duplication retains both source rows');
  assert.equal(adm.locationTc, '車站大堂B出口 (非付款區)');
  assert.equal(adm.locationEn, 'Station Concourse Exit B (Unpaid Area)');
  assert.deepEqual(pairMtrWaterLocations(tcPage, { ...enPage, rows: [...enPage.rows].reverse() }, stations), locations);
});

check('parser preserves source typos and tolerates repeated English Station suffix', () => {
  const typoTc = parseMtrWaterPage(tcHtml.replaceAll('車站大堂B出口', '車站大B出口'));
  const typoEn = parseMtrWaterPage(enHtml.replaceAll('Admiralty Station', 'Admiralty Station Station'), { language: 'en' });
  const paired = pairMtrWaterLocations(typoTc, typoEn, stations).find((item) => item.stationCode === 'ADM');
  assert.equal(paired.locationTc, '車站大B出口 (非付款區)');
  assert.equal(paired.sourceRows[0].stationNameEn, 'Admiralty Station Station');
});

check('parser fails closed on schema drift, unknown stations, ambiguous or different bilingual exits', () => {
  assert.throws(() => parseMtrWaterPage('<p>No table</p>'), /Expected one/);
  assert.throws(() => parseMtrWaterPage(tcHtml, { language: 'fr' }), /Unsupported/);
  assert.throws(() => parseMtrWaterPage(tcHtml.replace('東鐵綫', '未知綫')), /Unknown/);
  assert.throws(() => parseMtrWaterPage(tcHtml.replace('車站大堂B出口 (非付款區)', '車站大堂B出口 (付款區)')), /Unrecognised/);
  assert.throws(() => parseMtrWaterPage(tcHtml.replace('<td>金鐘站</td>', '<td>金鐘站</td><td>extra</td>')), /schema/);
  assert.throws(() => pairMtrWaterLocations(tcPage, { ...enPage, rows: enPage.rows.slice(1) }, stations), /differ/);
  const wrongExit = structuredClone(enPage);
  wrongExit.rows[0].exit = 'C';
  assert.throws(() => pairMtrWaterLocations(tcPage, wrongExit, stations), /Ambiguous/);
  const unknown = structuredClone(enPage);
  unknown.rows[0].stationName = 'Unknown Station';
  assert.throws(() => pairMtrWaterLocations(tcPage, unknown, stations), /No unique/);
  const duplicate = structuredClone(enPage);
  duplicate.rows[3] = { ...duplicate.rows[0], rowNumber: 4 };
  assert.throws(() => pairMtrWaterLocations(tcPage, duplicate, stations), /Ambiguous/);
});

check('different exits at one station are not collapsed into one location', () => {
  const tc = { language: 'zh-Hant', rows: [tcPage.rows[0], { ...tcPage.rows[0], rowNumber: 2, exit: 'D', location: '車站大堂D出口 (非付款區)' }] };
  const en = { language: 'en', rows: [enPage.rows[3], { ...enPage.rows[3], rowNumber: 2, exit: 'D', location: 'Station Concourse Exit D (Unpaid Area)' }] };
  const paired = pairMtrWaterLocations(tc, en, stations);
  assert.deepEqual(paired.map((item) => item.id), ['mtr-water-adm-exit-b', 'mtr-water-adm-exit-d']);
  assert.equal(paired.length, 2);
});

const exitMatch = { nameZH: '港鐵金鐘站-B進出口', nameEN: 'MTR Admiralty Station-B Access', x: 834943, y: 815613 };
const stationMatch = { nameZH: '港鐵金鐘站', nameEN: 'MTR Admiralty Station', x: 835000, y: 815600 };
const fuzzyMatch = { ...exitMatch, nameZH: '港鐵金鐘站-B進出口附近' };

check('venue selector prefers an exact bilingual exit over the station regardless of result order', () => {
  for (const results of [[stationMatch, fuzzyMatch, exitMatch], [exitMatch, stationMatch]]) {
    const selected = selectMtrVenueCoordinate(results, adm);
    assert.equal(selected.kind, 'exit');
    assert.equal(selected.match.x, exitMatch.x);
  }
  const fallback = selectMtrVenueCoordinate([fuzzyMatch, stationMatch], adm);
  assert.equal(fallback.kind, 'station');
  assert.equal(fallback.match.x, stationMatch.x);
  assert.equal(selectMtrVenueCoordinate([exitMatch, { ...exitMatch }], adm).kind, 'exit');
});

check('venue selector rejects fuzzy/one-language/wrong-exit/ambiguous matches without guessing', () => {
  for (const results of [[], [fuzzyMatch], [{ ...exitMatch, nameEN: 'MTR Admiralty Station-C Access' }],
    [{ ...exitMatch, nameZH: '港鐵金鐘站-C進出口', nameEN: 'MTR Admiralty Station-C Access' }],
    [{ ...stationMatch, nameEN: 'MTR Admiralty Station nearby' }]]) {
    assert.deepEqual(selectMtrVenueCoordinate(results, adm), { reason: 'noExactBilingualStationOrExitMatch' });
  }
  assert.deepEqual(selectMtrVenueCoordinate([exitMatch, { ...exitMatch, x: exitMatch.x + 1 }, stationMatch], adm),
    { reason: 'ambiguousOfficialExitMatch' });
  assert.deepEqual(selectMtrVenueCoordinate([stationMatch, { ...stationMatch, y: stationMatch.y + 1 }], adm),
    { reason: 'ambiguousOfficialStationMatch' });
  assert.throws(() => selectMtrVenueCoordinate({}, adm), /not an array/);
});

check('venue selector rejects non-finite/string/null grid coordinates, even with a station fallback', () => {
  for (const value of [undefined, null, '834943', NaN, Infinity, -Infinity]) {
    for (const axis of ['x', 'y']) {
      assert.deepEqual(selectMtrVenueCoordinate([{ ...exitMatch, [axis]: value }, stationMatch], adm),
        { reason: 'invalidOfficialGridCoordinate' });
      assert.deepEqual(selectMtrVenueCoordinate([{ ...stationMatch, [axis]: value }], adm),
        { reason: 'invalidOfficialGridCoordinate' });
    }
  }
});

function fixtureCoordinate(location, kind, match) {
  const transform = new URL(LANDSD_TRANSFORM_URL);
  for (const [name, value] of Object.entries({ inSys: 'hkgrid', outSys: 'wgsgeog', e: match.x, n: match.y })) {
    transform.searchParams.set(name, String(value));
  }
  return { kind, match, latitude: 22.27938493, longitude: 114.164017601,
    coordinateSourceUrl: mtrLocationSearchUrl(location.stationNameTc), transformUrl: transform.href,
    searchResponseSha256: 'a'.repeat(64), transformResponseSha256: 'b'.repeat(64) };
}
const coordinate = fixtureCoordinate(adm, 'exit', exitMatch);
const fixtureOptions = { generatedAt: '2026-01-01T00:00:00.000Z', tcRowCount: 4, enRowCount: 4 };

check('snapshot keeps unmatched and missing coordinate evidence in unmapped, never fabricates a point', () => {
  const snapshot = makeMtrDrinkingWaterSnapshot(locations, {
    [adm.id]: coordinate,
    [exc.id]: selectMtrVenueCoordinate([], exc),
  }, fixtureOptions);
  assert.equal(snapshot.records.length, 1);
  assert.equal(snapshot.unmapped.length, 2);
  assert.equal(snapshot.audit.listedLocationCount, 3);
  assert.equal(snapshot.audit.mappedLocationCount + snapshot.audit.unmappedLocationCount, snapshot.audit.listedLocationCount);
  assert.equal(snapshot.audit.duplicateLineRowsRemoved, 1);
  assert.equal(snapshot.unmapped.find((item) => item.id === exc.id).reason, 'noExactBilingualStationOrExitMatch');
  assert.equal(snapshot.unmapped.find((item) => item.id === chw.id).reason, 'noCoordinateEvidence');
  for (const item of snapshot.unmapped) {
    assert.ok(item.sourceRows.length > 0);
    assert.ok(item.locationTc && item.locationEn);
    assert.equal(Object.hasOwn(item, 'latitude'), false);
    assert.equal(Object.hasOwn(item, 'longitude'), false);
  }
  assert.equal(snapshot.records[0].unitCount, null);
  assert.equal(snapshot.records[0].locationPrecision, 'building');
  assert.equal(snapshot.audit.exactDispenserCoordinateCount, 0);
  assert.equal(snapshot.audit.locations[0].sourceRows.length, 2);
});

check('snapshot accepts station-level evidence but rejects invalid WGS84 or tampered provenance', () => {
  const excStation = { nameZH: '港鐵會展站', nameEN: 'MTR Exhibition Centre Station', x: 836107, y: 815864 };
  const snapshot = makeMtrDrinkingWaterSnapshot([exc], { [exc.id]: fixtureCoordinate(exc, 'station', excStation) },
    { ...fixtureOptions, tcRowCount: 1, enRowCount: 1 });
  assert.equal(snapshot.audit.venueStationCoordinateCount, 1);
  assert.match(snapshot.records[0].locationNoteEn, /not the exact/);
  for (const invalid of [{ latitude: 0 }, { longitude: 0 }, { latitude: NaN }, { longitude: Infinity },
    { latitude: '22.28' }, { latitude: 22.6 }, { longitude: 114.6 }]) {
    assert.throws(() => makeMtrDrinkingWaterSnapshot([adm], { [adm.id]: { ...coordinate, ...invalid } }, fixtureOptions), /Invalid official/);
  }
  for (const invalid of [{ kind: 'station' }, { match: fuzzyMatch },
    { coordinateSourceUrl: 'https://example.com/search' }, { transformUrl: 'https://example.com/transform' }]) {
    assert.throws(() => makeMtrDrinkingWaterSnapshot([adm], { [adm.id]: { ...coordinate, ...invalid } }, fixtureOptions), /match|source|transform/i);
  }
});

function checkSnapshot(snapshot) {
  const { audit, records, unmapped, coordinateSource } = snapshot;
  assert.ok(Number.isFinite(Date.parse(snapshot.generatedAt)));
  assert.ok(Array.isArray(records) && records.length > 0, 'Real snapshot must have mapped locations');
  assert.ok(Array.isArray(unmapped));
  assert.ok(Array.isArray(audit.locations));
  const all = [...audit.locations, ...unmapped];
  check('real snapshot has a nonempty, self-consistent audit without a hard-coded station total', () => {
    for (const field of ['tcRowCount', 'enRowCount', 'stationCount', 'listedLocationCount', 'duplicateLineRowsRemoved',
      'mappedLocationCount', 'mappedStationCount', 'unmappedLocationCount', 'unmappedStationCount',
      'exactDispenserCoordinateCount', 'venueExitCoordinateCount', 'venueStationCoordinateCount']) {
      assert.ok(Number.isInteger(audit[field]) && audit[field] >= 0, field);
    }
    assert.ok(audit.stationCount > 0);
    assert.ok(audit.listedLocationCount >= audit.stationCount);
    assert.equal(audit.tcRowCount, audit.enRowCount);
    assert.equal(audit.mappedLocationCount, records.length);
    assert.equal(audit.unmappedLocationCount, unmapped.length);
    assert.equal(records.length + unmapped.length, audit.listedLocationCount);
    assert.equal(audit.locations.length, records.length);
    assert.equal(new Set(all.map((item) => item.stationCode)).size, audit.stationCount);
    assert.equal(new Set(audit.locations.map((item) => item.stationCode)).size, audit.mappedStationCount);
    assert.equal(new Set(unmapped.map((item) => item.stationCode)).size, audit.unmappedStationCount);
    assert.equal(audit.venueExitCoordinateCount, audit.locations.filter((item) => item.coordinateKind === 'exit').length);
    assert.equal(audit.venueStationCoordinateCount, audit.locations.filter((item) => item.coordinateKind === 'station').length);
    assert.equal(audit.venueExitCoordinateCount + audit.venueStationCoordinateCount, records.length);
    assert.equal(audit.exactDispenserCoordinateCount, 0);
    unique(all.map((item) => item.id), 'Mapped and unmapped IDs must not overlap');
    unique(records.map((item) => item.id), 'Mapped IDs must be unique');
    assert.deepEqual(records.map((item) => item.id).sort(), audit.locations.map((item) => item.id).sort());
    digest(audit.sourceEvidence.tcPageSha256);
    digest(audit.sourceEvidence.enPageSha256);
    digest(audit.sourceEvidence.stationCsvSha256);
    assert.ok(Number.isInteger(audit.sourceEvidence.officialStationCodeCount));
    assert.ok(audit.sourceEvidence.officialStationCodeCount >= audit.stationCount);
  });

  check('real snapshot uses official HTTPS directory, station-code, LandsD search and transform sources', () => {
    officialHttps(snapshot.sourceUrl, MTR_WATER_SOURCE_URL);
    officialHttps(snapshot.sourceEnUrl, MTR_WATER_SOURCE_EN_URL);
    for (const [field, expected] of Object.entries({ stationCodesUrl: MTR_STATIONS_URL,
      stationCodesDatasetUrl: MTR_STATIONS_DATASET_URL, locationSearchUrl: LANDSD_LOCATION_SEARCH_URL,
      locationSearchDatasetUrl: LANDSD_LOCATION_SOURCE_URL, transformUrl: LANDSD_TRANSFORM_URL,
      transformDatasetUrl: LANDSD_TRANSFORM_SOURCE_URL })) officialHttps(coordinateSource[field], expected);
    assert.equal(coordinateSource.precision, 'building');
  });

  check('real snapshot retains bilingual concourse/unpaid-area source rows and cross-line deduplication evidence', () => {
    const tcNumbers = []; const enNumbers = []; const identities = [];
    for (const item of all) {
      assert.match(item.stationCode, /^[A-Z]{3}$/);
      assert.ok(item.stationNameTc && item.stationNameEn);
      assert.match(item.exit, /^[A-Z]\d*$/);
      assert.ok(item.lineCodes.length > 0);
      unique(item.lineCodes, `${item.id} line codes`);
      assert.equal(item.sourceRows.length, item.lineCodes.length);
      assert.deepEqual(item.sourceRows.map((row) => row.lineCode).sort(), [...item.lineCodes].sort());
      const first = item.sourceRows[0];
      for (const row of item.sourceRows) {
        assert.ok(row.lineTc && row.lineEn);
        assert.equal(stationTc(row.stationNameTc), stationTc(item.stationNameTc));
        assert.equal(stationEn(row.stationNameEn), stationEn(item.stationNameEn));
        // Keep a known Chinese source typo; the paired English row supplies concourse evidence.
        assert.match(row.locationTc, /車站大/);
        assert.match(row.locationTc, /[（(]非付款區[)）]/);
        assert.match(row.locationEn, /Station Concourse/i);
        assert.match(row.locationEn, /\(Unpaid Area\)/i);
        assert.equal(row.locationTc.match(/([A-Z]\d*)\s*出口/i)?.[1].toUpperCase(), item.exit);
        assert.equal(row.locationEn.match(/\bExit\s+([A-Z]\d*)\b/i)?.[1].toUpperCase(), item.exit);
        assert.equal(normal(row.locationTc), normal(first.locationTc));
        assert.equal(normal(row.locationEn), normal(first.locationEn));
        assert.ok(Number.isInteger(row.tcRowNumber) && row.tcRowNumber >= 1 && row.tcRowNumber <= audit.tcRowCount);
        assert.ok(Number.isInteger(row.enRowNumber) && row.enRowNumber >= 1 && row.enRowNumber <= audit.enRowCount);
        tcNumbers.push(row.tcRowNumber);
        enNumbers.push(row.enRowNumber);
      }
      identities.push(`${item.stationCode}|${normal(first.locationTc)}|${normal(first.locationEn)}`);
    }
    unique(identities, 'The same bilingual location must not be repeated across lines');
    unique(tcNumbers, 'Each Chinese source row must be represented exactly once');
    unique(enNumbers, 'Each English source row must be represented exactly once');
    assert.equal(tcNumbers.length, audit.tcRowCount);
    assert.equal(enNumbers.length, audit.enRowCount);
    assert.equal(audit.duplicateLineRowsRemoved, tcNumbers.length - all.length);
    assert.equal(audit.duplicateLineRowsRemoved, all.reduce((sum, item) => sum + item.sourceRows.length - 1, 0));
  });

  check('real mapped points exactly match station/exit venue evidence and HK1980-to-WGS84 provenance', () => {
    const byId = new Map(audit.locations.map((item) => [item.id, item]));
    for (const record of records) {
      const evidence = byId.get(record.id);
      assert.equal(record.provider, 'mtr');
      assert.equal(record.locationTc, evidence.sourceRows[0].locationTc);
      assert.equal(record.locationEn, evidence.sourceRows[0].locationEn);
      assert.ok(record.addressTc.includes(record.locationTc));
      assert.ok(record.addressEn.includes(record.locationEn));
      assert.ok(record.nameTc.includes(evidence.stationNameTc));
      assert.ok(record.nameEn.includes(evidence.stationNameEn));
      assert.equal(record.latitude, evidence.latitude);
      assert.equal(record.longitude, evidence.longitude);
      assert.ok(Number.isFinite(record.latitude) && record.latitude >= 22.13 && record.latitude <= 22.57);
      assert.ok(Number.isFinite(record.longitude) && record.longitude >= 113.8 && record.longitude <= 114.5);
      assert.ok(['exit', 'station'].includes(evidence.coordinateKind));
      const selected = selectMtrVenueCoordinate([evidence.coordinateMatch], evidence);
      assert.equal(selected.kind, evidence.coordinateKind);
      assert.equal(selected.reason, undefined);
      assert.equal(record.coordinateSourceUrl, evidence.coordinateSourceUrl);
      officialHttps(evidence.coordinateSourceUrl, mtrLocationSearchUrl(evidence.stationNameTc));
      const transform = officialHttps(evidence.transformUrl);
      assert.equal(transform.origin + transform.pathname, LANDSD_TRANSFORM_URL);
      assert.equal(transform.searchParams.size, 4);
      assert.equal(transform.searchParams.get('inSys'), 'hkgrid');
      assert.equal(transform.searchParams.get('outSys'), 'wgsgeog');
      assert.equal(transform.searchParams.get('e'), String(evidence.coordinateMatch.x));
      assert.equal(transform.searchParams.get('n'), String(evidence.coordinateMatch.y));
      digest(evidence.searchResponseSha256);
      digest(evidence.transformResponseSha256);
      officialHttps(record.sourceUrl, MTR_WATER_SOURCE_URL);
      // The legacy field points to the verified directory, NOT a station floor plan.
      officialHttps(record.officialMapUrl, MTR_WATER_SOURCE_URL);
      assert.equal(record.locationPrecision, 'building');
      assert.match(record.locationNoteTc, /並非飲水機精確位置/);
      assert.match(record.locationNoteEn, /not the exact drinking-water dispenser position/i);
      assert.equal(record.unitCount, null, 'Location count is not a machine count');
      assert.equal(record.filterStatus, 'notPublished');
      for (const field of ['temperatureTc', 'temperatureEn', 'serviceHoursTc', 'serviceHoursEn']) assert.equal(record[field], '');
      assert.equal(record.indoorOutdoor, 'indoor');
      assert.match(record.accessTc, /大堂非付款區/);
      assert.match(record.accessEn, /concourse, unpaid area/i);
      assert.match(record.accessEn, /not guaranteed 24-hour/i);
      assert.equal(record.temporaryClosed, false);
      assert.match(record.remarksTc, /不(?:保證|代表)即時可用/);
      assert.match(record.remarksEn, /not guaranteed current availability|current availability is not guaranteed/i);
      assert.match(record.remarksEn, /Per-machine filtration, temperature and exact service hours are not published/);
    }
  });

  check('real unmapped entries preserve official locations and a reason, with no invented coordinates', () => {
    for (const item of unmapped) {
      assert.ok(typeof item.reason === 'string' && item.reason.length > 0);
      assert.equal(item.locationTc, item.sourceRows[0].locationTc);
      assert.equal(item.locationEn, item.sourceRows[0].locationEn);
      officialHttps(item.coordinateSourceUrl, mtrLocationSearchUrl(item.stationNameTc));
      assert.equal(Object.hasOwn(item, 'latitude'), false);
      assert.equal(Object.hasOwn(item, 'longitude'), false);
    }
  });
  console.log(`SNAPSHOT ${snapshot.generatedAt}: ${audit.tcRowCount}/${audit.enRowCount} source rows; `
    + `${audit.stationCount} stations; ${audit.listedLocationCount} locations; ${records.length} mapped + ${unmapped.length} unmapped; `
    + `${audit.venueExitCoordinateCount} exit + ${audit.venueStationCoordinateCount} station venue points; `
    + `${audit.duplicateLineRowsRemoved} duplicate line rows removed; 0 exact dispenser GPS.`);
}

const snapshotUrl = new URL('../public/pages-data/mtr-drinking-water.json', import.meta.url);
let rawSnapshot;
try {
  rawSnapshot = await readFile(snapshotUrl, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  console.log('SKIP real snapshot checks: public/pages-data/mtr-drinking-water.json is not present; offline fixtures still passed.');
}
if (rawSnapshot !== undefined) checkSnapshot(JSON.parse(rawSnapshot));
console.log(`MTR drinking-water checks passed: ${checks} groups; network not used.`);
