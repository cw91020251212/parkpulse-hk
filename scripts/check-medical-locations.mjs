import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotPath = path.join(root, 'src/data/eligible-medical-locations.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const records = snapshot.records;
const expectedCounts = {
  'ha-hospital-institution': 44,
  'ha-specialist-outpatient-clinic': 49,
  'ha-family-medicine-clinic': 77,
  'dh-civil-servants-clinic': 6,
  'dh-civil-servants-referral-centre': 1,
  'civil-service-chinese-medicine-clinic': 3,
  'cmhhk-designated-civil-service-services': 1,
};

assert.equal(records.length, 181, 'medical location snapshot record count changed');
assert.deepEqual(snapshot.category_counts, expectedCounts, 'official category counts changed');
assert.equal(Object.values(expectedCounts).reduce((sum, value) => sum + value, 0), records.length);
assert.equal(new Set(records.map(({ id }) => id)).size, records.length, 'record IDs must be unique');
for (const record of records) {
  assert.ok(record.name_tc && record.address_tc, `record ${record.id} needs a Traditional Chinese name and address`);
  assert.ok(record.source_url?.startsWith('https://'), `record ${record.id} needs an official HTTPS source`);
  assert.ok(record.latitude >= 22.1 && record.latitude <= 22.6, `record ${record.id} latitude is outside Hong Kong bounds`);
  assert.ok(record.longitude >= 113.8 && record.longitude <= 114.5, `record ${record.id} longitude is outside Hong Kong bounds`);
  assert.ok(expectedCounts[record.category] > 0, `unknown category: ${record.category}`);
}

const coordinateGroups = new Map();
for (const record of records) {
  const key = `${record.latitude.toFixed(6)},${record.longitude.toFixed(6)}`;
  coordinateGroups.set(key, (coordinateGroups.get(key) ?? 0) + 1);
}
assert.equal(coordinateGroups.size, 133, 'coordinate grouping changed; review map marker clustering');
assert.equal([...coordinateGroups.values()].filter((count) => count > 1).length, 41, 'co-located service count changed');
assert.equal(Math.max(...coordinateGroups.values()), 3, 'unexpected number of co-located services');

for (const icon of [
  'ha-hospitals.svg',
  'ha-specialist-outpatient.svg',
  'ha-family-medicine.svg',
  'dh-civil-servants.svg',
  'civil-service-chinese-medicine.svg',
  'cmhhk-designated-service.svg',
  'medical-multiple.svg',
]) {
  const iconPath = path.join(root, 'public/icons/medical', icon);
  assert.ok(fs.existsSync(iconPath), `missing medical map icon: ${icon}`);
  assert.match(fs.readFileSync(iconPath, 'utf8'), /<svg[\s>]/, `${icon} is not a valid SVG document`);
}

const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const filters = fs.readFileSync(path.join(root, 'src/components/Filters.tsx'), 'utf8');
const map = fs.readFileSync(path.join(root, 'src/components/MapView.tsx'), 'utf8');
assert.match(app, /facilityMode === 'medical'/, 'medical mode must be isolated in the app');
assert.match(app, /medicalItems=\{mapMedicalItems\}/, 'medical results must use a separate map prop');
assert.match(app, /MedicalLocationCard/, 'medical results must render dedicated location cards');
assert.match(filters, /'medical'/, 'medical mode must be selectable');
assert.match(map, /groupMedicalLocations/, 'co-located medical facilities must be grouped on the map');
assert.match(app, /facilityMode === 'medical' \? \[\] : activeNearbyResults/, 'medical data must not leak into existing facility results');

console.log(`Medical snapshot OK: ${records.length} records, ${coordinateGroups.size} map pins, 41 co-located pins, 7 categories.`);
