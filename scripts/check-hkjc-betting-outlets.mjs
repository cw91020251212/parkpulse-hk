import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { addressMatchScore, attachHkjcFirstPrizeStats, buildHkjcBettingOutletRecord, selectHkjcLocation } from '../lib/hkjc-betting-outlets.mjs';

const root = process.cwd();
const source = JSON.parse(await readFile(path.join(root, 'data/hkjc-betting-outlets-directory.json'), 'utf8'));
const snapshot = JSON.parse(await readFile(path.join(root, 'public/pages-data/hkjc-betting-outlets.json'), 'utf8'));
const [app, filters, mapView, facilityCard, facilityDetail, styles] = await Promise.all([
  readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/Filters.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/MapView.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/NearbyFacilityCard.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/NearbyFacilityDetail.tsx'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
]);
assert.equal(source.records.length, 83, 'The official HKJC directory should contain 83 outlet records');
assert.equal(snapshot.records.length, 83, 'The static snapshot should contain all 83 outlets');
assert.equal(new Set(snapshot.records.map(({ id }) => id)).size, 83, 'Every outlet ID should be unique');
assert.equal(snapshot.records.filter(({ locationPrecision }) => locationPrecision === 'outlet').length, 82, '82 outlets should use LandsD shop location points');
assert.equal(snapshot.records.filter(({ locationPrecision }) => locationPrecision === 'building').length, 1, 'Only the explicitly documented Wong Tai Sin outlet should be building-level');
assert.match(snapshot.sourceUrl, /^https:\/\//);
assert.match(snapshot.sourcePdfTc, /^https:\/\//);
assert.match(snapshot.sourcePdfEn, /^https:\/\//);
assert.match(snapshot.locationSourceUrl, /^https:\/\//);
assert.match(snapshot.coordinateTransformSourceUrl, /^https:\/\//);
  const officialPrizeStats = source.firstPrizeStats;
  assert.equal(officialPrizeStats.asOf, '2026-06-30');
  assert.equal(officialPrizeStats.records.length, 10, 'Only the official top-ten statistics should be loaded');
  const expectedOfficialStats = [
    ['hkjc-079', 1, 48], ['hkjc-001', 2, 48], ['hkjc-075', 3, 43], ['hkjc-051', 4, 41], ['hkjc-002', 5, 41],
    ['hkjc-027', 6, 38], ['hkjc-024', 7, 36], ['hkjc-074', 8, 35], ['hkjc-065', 9, 35], ['hkjc-073', 10, 30],
  ].map(([outletId, rank, ticketCount]) => ({ outletId, rank, ticketCount }));
  assert.deepEqual([...officialPrizeStats.records].sort((a, b) => a.rank - b.rank), expectedOfficialStats, 'Official outlet ranks and first-prize ticket counts should stay intact');
  assert.match(officialPrizeStats.sourceUrlTc, /^https:\/\//);
  assert.match(officialPrizeStats.sourceUrlEn, /^https:\/\//);
assert.deepEqual(snapshot.firstPrizeStats, officialPrizeStats);
const prizeStatsByOutlet = new Map(officialPrizeStats.records.map((entry) => [entry.outletId, entry]));
assert.equal(snapshot.records.filter(({ firstPrizeRank }) => firstPrizeRank !== undefined).length, 10);
for (const record of snapshot.records) {
  const expected = prizeStatsByOutlet.get(record.id);
  assert.equal(record.firstPrizeRank, expected?.rank);
  assert.equal(record.firstPrizeTicketCount, expected?.ticketCount);
}
const simulatedSnapshot = attachHkjcFirstPrizeStats({ records: source.records.map(({ id }) => ({ id })) }, officialPrizeStats);
assert.equal(simulatedSnapshot.records.filter(({ firstPrizeRank }) => firstPrizeRank !== undefined).length, 10);
assert.equal(simulatedSnapshot.records.find(({ id }) => id === 'hkjc-079').firstPrizeTicketCount, 48);
assert.throws(() => attachHkjcFirstPrizeStats({ records: [{ id: 'unmatched' }] }, officialPrizeStats), /不在官方現行名錄/);

for (const [index, record] of snapshot.records.entries()) {
  const official = source.records[index];
  assert.equal(record.id, official.id);
  assert.equal(record.kind, 'hkjc');
  assert.equal(record.nameTc, official.nameTc);
  assert.equal(record.nameEn, official.nameEn);
  assert.equal(record.addressTc, official.addressTc);
  assert.equal(record.addressEn, official.addressEn);
  assert.ok(Number.isFinite(record.latitude) && record.latitude >= 22.13 && record.latitude <= 22.57, `${record.id} latitude must be in Hong Kong`);
  assert.ok(Number.isFinite(record.longitude) && record.longitude >= 113.8 && record.longitude <= 114.5, `${record.id} longitude must be in Hong Kong`);
  assert.ok(Number.isFinite(record.hkE) && Number.isFinite(record.hkN), `${record.id} should retain the LandsD HK1980 coordinate`);
  assert.ok(record.addressMatchScore >= 0.34, `${record.id} should meet the minimum address match score`);
  assert.equal('openingHours' in record, false, 'Directory hours must not be represented as current live status');
  assert.equal('availability' in record, false, 'The app must not invent outlet availability');
}

const taiPoPlazaSource = source.records.find(({ id }) => id === 'hkjc-074');
const taiPoPlazaSnapshot = snapshot.records.find(({ id }) => id === 'hkjc-074');
assert.deepEqual(taiPoPlazaSource.manualLocation, {
  latitude: 22.45263,
  longitude: 114.16997,
  hkE: 835557.322,
  hkN: 834797.308,
  locationNameTc: '香港賽馬會',
  locationAddressTc: '新界大埔安泰街1號大埔廣場地下商場7號舖',
  locationDistrictTc: '大埔區',
  addressMatchScore: 0.55,
  locationNoteTc: '位置按熟悉大埔廣場的使用者所指地圖位置手動校正。',
  locationNoteEn: 'Manually corrected to the map location indicated by a local user familiar with Tai Po Plaza.',
});
assert.equal(taiPoPlazaSnapshot.latitude, taiPoPlazaSource.manualLocation.latitude);
assert.equal(taiPoPlazaSnapshot.longitude, taiPoPlazaSource.manualLocation.longitude);
assert.equal(taiPoPlazaSnapshot.locationNoteTc, taiPoPlazaSource.manualLocation.locationNoteTc);
assert.equal(taiPoPlazaSnapshot.locationNoteEn, taiPoPlazaSource.manualLocation.locationNoteEn);
const rebuiltTaiPoPlaza = await buildHkjcBettingOutletRecord(taiPoPlazaSource, source);
assert.equal(rebuiltTaiPoPlaza.latitude, taiPoPlazaSnapshot.latitude);
assert.equal(rebuiltTaiPoPlaza.longitude, taiPoPlazaSnapshot.longitude);
assert.equal(rebuiltTaiPoPlaza.locationNoteTc, taiPoPlazaSnapshot.locationNoteTc);

const buildingRecord = snapshot.records.find(({ id }) => id === 'hkjc-043');
assert.equal(buildingRecord.locationNameTc, '華頌樓');
assert.match(buildingRecord.locationNoteTc, /大廈.*不是店舖入口/);
assert.match(buildingRecord.locationNoteEn, /building.*not the shop entrance/i);
assert.ok(Math.abs(buildingRecord.latitude - 22.343736138) < 0.00001);
assert.ok(Math.abs(buildingRecord.longitude - 114.197939975) < 0.00001);
assert.match(app, /facilityMode === 'hkjc'/, 'The App should filter and label the HKJC mode');
assert.match(filters, /'border', 'hkjc'/, 'The bilingual facility filter should expose HKJC outlets');
assert.match(mapView, /kind === 'hkjc'/, 'The map should render HKJC outlet markers');
assert.match(mapView, /locationPrecision === 'building'/, 'The building-level point should be identified as unconfirmed');
assert.match(facilityCard, /hkjcLocationPrecision/, 'Cards should disclose outlet point precision');
assert.match(facilityDetail, /hkjcNoLiveStatus/, 'Details should not claim a live opening status');
assert.match(app, /legendHkjcFirstPrize/, 'The map legend should explain the gold crown');
assert.match(mapView, /hkjc-first-prize-marker-badge/, 'Ranked outlets should have a corner crown/count marker');
assert.match(mapView, /hkjcFirstPrizeTicketCount/, 'The map should receive the official ticket count');
assert.match(facilityCard, /hkjcFirstPrizeRankCount/, 'Cards should show the official rank and count');
assert.match(facilityDetail, /hkjcFirstPrizeAsOf/, 'Details should show the statistics cutoff date');
assert.match(facilityDetail, /hkjcFirstPrizeSource/, 'Details should link to the official HKJC ranking');
assert.match(styles, /hkjc-first-prize-marker-badge/, 'Crown/count badge styling should be present');
assert.match(styles, /\.hkjc-first-prize-section\s*\{[^}]*background:\s*#fff9e7;\s*color:\s*#4b3100/, 'First-prize panel body text must contrast with its pale background');
assert.match(styles, /\.hkjc-first-prize-section h3\s*\{[^}]*color:\s*#4b3100/, 'First-prize panel heading must use a readable dark color');
assert.match(styles, /\.hkjc-first-prize-section p\s*\{[^}]*color:\s*#4b3100/, 'First-prize statistics must use a readable dark color');
assert.match(styles, /\.hkjc-first-prize-section a\s*\{[^}]*color:\s*#174f48/, 'First-prize source link must remain visible on the pale panel');
assert.match(styles, /\.toilet-facts \.hkjc-first-prize-summary\s*\{[^}]*color:\s*#4b3100;[^}]*background:\s*#fff5d2;[^}]*font-size:\s*14px/, 'Card prize summaries must override generic fact-chip styling with readable gold contrast and larger text');
assert.match(styles, /\.toilet-facts \.hkjc-location-note:not\(\.is-location-unconfirmed\)\s*\{[^}]*color:\s*#d5e7ed;[^}]*font-size:\s*14px/, 'Confirmed outlet location notes must be readable on dark cards');
assert.match(styles, /\.toilet-facts \.hkjc-location-note\.is-location-unconfirmed\s*\{[^}]*color:\s*#36454e;[^}]*font-size:\s*14px/, 'Building-level location notes must remain readable on their pale warning background');

const multiCandidateRecord = source.records.find(({ id }) => id === 'hkjc-038');
const selected = selectHkjcLocation(multiCandidateRecord, [
  { nameZH: '香港賽馬會', addressZH: '香港北角電氣道276-280號華凱大廈地下及1樓', x: 838000, y: 820000 },
  { nameZH: '香港賽馬會', addressZH: '九龍石硤尾大埔道196號嘉順大廈地下及1樓', x: 834000, y: 825000 },
]);
assert.equal(selected.location.addressZH, '九龍石硤尾大埔道196號嘉順大廈地下及1樓');
assert.ok(selected.addressMatchScore > 0.7);
assert.ok(addressMatchScore('香港', '香港') === 1);
assert.throws(() => selectHkjcLocation(multiCandidateRecord, [
  { nameZH: '香港賽馬會', addressZH: multiCandidateRecord.addressTc, x: 834000, y: 825000 },
  { nameZH: '香港賽馬會', addressZH: multiCandidateRecord.addressTc, x: 834000, y: 825000 },
]), /無法安全選擇/);

console.log('Verified 83 bilingual HKJC outlets, official sources, WGS84/HK1980 coordinates, robust matching and one explicitly building-level location.');
