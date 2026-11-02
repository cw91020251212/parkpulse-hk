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

const detailSource = await readFile(new URL('../src/components/NearbyFacilityDetail.tsx', import.meta.url), 'utf8');
const previewPosition = detailSource.indexOf('<TrafficCameraPreview');
const titlePosition = detailSource.indexOf('<h2>{facility.name}</h2>');
assert.ok(previewPosition >= 0 && previewPosition < titlePosition, 'Traffic camera detail must show the official image before its title and descriptive fields');
assert.match(detailSource, /src=\{sourceUrl\}/, 'Traffic camera detail must render the directly sourced official image');
assert.match(detailSource, /parkpulse_refresh/, 'Traffic camera detail must allow an explicit original-image reload');
assert.match(detailSource, /trafficCameraImageLoadFailed/, 'Traffic camera detail must retain an official-image fallback when loading fails');
assert.match(detailSource, /referrerPolicy="no-referrer"/, 'Traffic camera detail must not expose the ParkPulse page URL to the official image host');

const cardSource = await readFile(new URL('../src/components/TrafficCameraCard.tsx', import.meta.url), 'utf8');
const cardStyles = await readFile(new URL('../src/components/TrafficCameraCard.css', import.meta.url), 'utf8');
const facilityCardSource = await readFile(new URL('../src/components/NearbyFacilityCard.tsx', import.meta.url), 'utf8');
assert.match(facilityCardSource, /if \(trafficCamera\) return <TrafficCameraCard/, 'Camera cards must bypass the general facility action-column layout');
assert.match(cardSource, /src=\{facility\.snapshotUrl\}/, 'Each list image uses its own official camera URL');
assert.match(cardSource, /loading="lazy"/, 'List images must load lazily rather than download every camera at startup');
assert.match(cardSource, /referrerPolicy="no-referrer"/, 'List images must not send the page address to the image host');
assert.match(cardSource, /camera-card-footer[\s\S]*?onClick=\{onSelect\}/, 'Details must be a bottom action, not a tall right-hand column');
assert.doesNotMatch(cardSource, /toilet-card-actions|trafficCameraSources|trafficCameraImageRefresh/, 'Repeated source/update paragraphs and side action columns must be absent from camera cards');
assert.match(cardSource, /trafficCameraCardImageFailed/, 'List images must have an honest unavailable-image fallback');
assert.match(cardStyles, /aspect-ratio: 4 \/ 3/, 'List images must retain a complete four-to-three frame');
assert.match(cardStyles, /white-space: normal/, 'Full camera names must remain readable instead of being truncated');
console.log(`Verified ${records.length} bilingual traffic-camera records, image-first details and compact photo list cards.`);
