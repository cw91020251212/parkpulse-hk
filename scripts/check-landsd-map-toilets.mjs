import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const comparableToiletName = (value) => String(value ?? '').normalize('NFKC').toLowerCase()
  .replace(/(?:public\s*)?(?:toilets?|washrooms?|restrooms?|latrines?|公共廁所|公眾廁所|公廁|洗手間|廁所)/gu, '')
  .replace(/[^\p{L}\p{N}]+/gu, '');
const distanceInMetres = (left, right) => {
  const radians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = radians(right.latitude - left.latitude);
  const longitudeDelta = radians(right.longitude - left.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(left.latitude)) * Math.cos(radians(right.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const sourceFiles = [
  ['../public/pages-data/public-toilets.json', 'records'],
  ['../public/pages-data/lcsd-park-washrooms.json', 'facilities'],
  ['../data/lcsd-named-toilet-points.json', 'points'],
  ['../public/pages-data/afcd-country-park-toilets.json', 'facilities'],
  ['../public/had-community-toilets.json', 'records'],
  ['../public/pages-data/afcd-nature-centre-toilets.json', 'records'],
  ['../public/pages-data/afcd-long-valley-temporary-toilets.json', 'records'],
];
const existingExactRecords = (await Promise.all(sourceFiles.map(async ([path, key]) => {
  const payload = JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  return (payload[key] ?? []).filter((record) => record.name && record.locationPrecision !== 'venue' && record.locationPrecision !== 'venue-uncertain');
}))).flat();
const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/landsd-map-toilets.json', import.meta.url), 'utf8'));
assert.match(snapshot.source, /地政總署/);
assert.ok(snapshot.audit?.districtQueries === 54, 'The audit must query all 18 districts in three official search variants');
assert.equal(snapshot.audit.newExactPoints, snapshot.records.length, 'Audit count should equal saved supplementary records');
assert.ok(snapshot.records.length > 0, 'LandsD audit should retain at least one non-duplicate exact point');
const seen = new Set();
for (const record of snapshot.records) {
  assert.equal(record.kind, 'landsdMapToilet');
  assert.equal(record.locationPrecision, 'toilet');
  assert.ok(record.name && record.latitude >= 21.5 && record.latitude <= 23 && record.longitude >= 113.7 && record.longitude <= 114.6, `Invalid LandsD toilet record: ${record.id}`);
  assert.match(record.sourceQueryUrl, /^https:\/\/www\.map\.gov\.hk\//);
  assert.match(record.transformUrl, /^https:\/\/www\.geodetic\.gov\.hk\//);
  assert.doesNotMatch(`${record.name} ${record.nameEn ?? ''}`, /附近|旁邊|nearby|adjacent|beside/i, `Vague place label must not be shown: ${record.name}`);
  assert.ok(!existingExactRecords.some((existing) => distanceInMetres(existing, record) <= 20 || (comparableToiletName(existing.name).length >= 2 && comparableToiletName(existing.name) === comparableToiletName(record.name) && distanceInMetres(existing, record) <= 150)), `Existing exact toilet duplicates LandsD record: ${record.name}`);
  const duplicateKey = `${record.name.normalize('NFKC')}|${record.latitude.toFixed(7)}|${record.longitude.toFixed(7)}`;
  assert.ok(!seen.has(duplicateKey), `Duplicate official toilet label and coordinate: ${record.name}`);
  seen.add(duplicateKey);
}
console.log(`Verified ${snapshot.records.length} exact LandsD supplementary toilet points after official-source and duplicate checks`);
