import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { addressMatchScore, selectHkjcLocation } from '../lib/hkjc-betting-outlets.mjs';

const root = process.cwd();
const source = JSON.parse(await readFile(path.join(root, 'data/hkjc-betting-outlets-directory.json'), 'utf8'));
const snapshot = JSON.parse(await readFile(path.join(root, 'public/pages-data/hkjc-betting-outlets.json'), 'utf8'));
const [app, filters, mapView, facilityCard, facilityDetail] = await Promise.all([
  readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/Filters.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/MapView.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/NearbyFacilityCard.tsx'), 'utf8'),
  readFile(path.join(root, 'src/components/NearbyFacilityDetail.tsx'), 'utf8'),
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
