import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TRAFFIC_CAMERA_LOCATIONS_EN_URL, TRAFFIC_CAMERA_LOCATIONS_TC_URL } from '../lib/traffic-cameras.mjs';

const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/traffic-cameras.json', import.meta.url), 'utf8'));
const records = snapshot.records;

assert.ok(Array.isArray(records) && records.length >= 900, 'Traffic camera Pages snapshot must contain the complete official camera list');
assert.equal(new Set(records.map(({ id }) => id)).size, records.length, 'Traffic camera IDs must be unique');
assert.equal(snapshot.locationSourceEnUrl, TRAFFIC_CAMERA_LOCATIONS_EN_URL, 'English XML source must remain traceable');
assert.equal(snapshot.locationSourceTcUrl, TRAFFIC_CAMERA_LOCATIONS_TC_URL, 'Traditional Chinese XML source must remain traceable');
assert.equal(snapshot.sourceUrl, 'https://data.gov.hk/tc-data/dataset/hk-td-tis_2-traffic-snapshot-images', 'Dataset source must remain traceable');
assert.ok(Number.isFinite(Date.parse(snapshot.generatedAt)), 'Traffic camera snapshot must retain its build timestamp');

for (const record of records) {
  assert.match(record.id, /^[A-Z0-9]+$/i, 'Each traffic camera requires its official key');
  assert.ok(record.nameTc && record.nameEn && record.regionTc && record.regionEn && record.districtTc && record.districtEn, `Traffic camera ${record.id} needs full bilingual location information`);
  assert.ok(record.latitude >= 22.12 && record.latitude <= 22.59 && record.longitude >= 113.82 && record.longitude <= 114.49, `Traffic camera ${record.id} must remain within Hong Kong bounds`);
  const imageUrl = new URL(record.snapshotUrl);
  assert.equal(imageUrl.protocol, 'https:', `Traffic camera ${record.id} must use HTTPS`);
  assert.equal(imageUrl.hostname, 'tdcctv.data.one.gov.hk', `Traffic camera ${record.id} must use the Transport Department original snapshot host`);
  assert.match(imageUrl.pathname, /\.jpe?g$/i, `Traffic camera ${record.id} must open an original JPEG snapshot`);
}

console.log(`Verified ${records.length} bilingual Transport Department traffic-camera records with exact locations and official original JPEG URLs.`);
