import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HA_AE_WAITING_TC_URL, HA_AE_WAITING_EN_URL } from '../lib/emergency-departments.mjs';
import { formatHaUpdateTime, parseHaUpdateTime } from '../src/domain/emergencyWait.ts';

const root = new URL('../', import.meta.url);
const snapshot = JSON.parse(await readFile(new URL('public/pages-data/emergency-departments.json', root), 'utf8'));
assert.equal(snapshot.records.length, 18, 'The official emergency-department snapshot must contain all 18 Hospital Authority A&E hospitals');
assert.ok(snapshot.records.every((record) => record.kind === 'emergency' && record.nameTc && record.nameEn && record.addressTc && record.latitude >= 22.13 && record.latitude <= 22.57 && record.longitude >= 113.8 && record.longitude <= 114.5 && record.hkE && record.hkN && record.locationSourceUrl && record.coordinateTransformSourceUrl), 'Every hospital needs bilingual identity, official map coordinates and traceable LandsD sources');
assert.equal(new Set(snapshot.records.map((record) => record.id)).size, 18, 'Emergency department IDs must be unique');

const [traditional, english, app, map, card, detail, filters, styles] = await Promise.all([
  fetch(HA_AE_WAITING_TC_URL).then((response) => { assert.equal(response.status, 200); return response.json(); }),
  fetch(HA_AE_WAITING_EN_URL).then((response) => { assert.equal(response.status, 200); return response.json(); }),
  readFile(new URL('src/App.tsx', root), 'utf8'),
  readFile(new URL('src/components/MapView.tsx', root), 'utf8'),
  readFile(new URL('src/components/NearbyFacilityCard.tsx', root), 'utf8'),
  readFile(new URL('src/components/NearbyFacilityDetail.tsx', root), 'utf8'),
  readFile(new URL('src/components/Filters.tsx', root), 'utf8'),
  readFile(new URL('src/styles.css', root), 'utf8'),
]);
for (const payload of [traditional, english]) {
  assert.equal(payload.waitTime.length, 18, 'Hospital Authority live payload must expose 18 emergency departments');
  assert.ok(payload.updateTime, 'Hospital Authority live payload must state its update time');
  assert.ok(payload.waitTime.every((record) => ['hospName', 't1wt', 'manageT1case', 't2wt', 'manageT2case', 't3p50', 't3p95', 't45p50', 't45p95'].every((key) => typeof record[key] === 'string')), 'Hospital Authority live payload must preserve all triage-time fields');
}
const normalize = (value) => String(value ?? '').replace(/\s+/g, '').toLocaleLowerCase();
for (const [payload, key] of [[traditional, 'haNameTc'], [english, 'haNameEn']]) {
  const officialNames = payload.waitTime.map((record) => normalize(record.hospName)).sort();
  const snapshotNames = snapshot.records.map((record) => normalize(record[key])).sort();
  assert.deepEqual(snapshotNames, officialNames, `Every ${key} must uniquely match the current Hospital Authority payload`);
}
assert.ok(parseHaUpdateTime('zh-Hant', traditional.updateTime), 'Traditional Chinese Hospital Authority update time must parse without browser-specific Date parsing');
assert.ok(parseHaUpdateTime('en', english.updateTime), 'English Hospital Authority update time must parse without browser-specific Date parsing');
assert.notEqual(formatHaUpdateTime('zh-Hant', traditional.updateTime), traditional.updateTime, 'Chinese update time should be rendered from a validated time');
assert.notEqual(formatHaUpdateTime('en', english.updateTime), english.updateTime, 'English update time should be rendered from a validated time');
assert.match(filters, /'emergency'/);
assert.match(app, /emergencyWaitStatistics/);
assert.match(app, /emergencyWaitStatistic/);
assert.match(app, /legendEmergency/);
assert.match(app, /emergency-inline-notice/);
assert.match(app, /refreshActiveData/);
assert.match(map, /kind === 'emergency'/);
assert.match(map, /EMERGENCY_SYMBOL_URL/);
assert.match(map, /emergency-popup-notice/);
assert.match(map, /emergency-popup-heading/);
assert.match(map, /emergency-popup-update/);
assert.match(map, /formatHaUpdateTime/);
assert.match(card, /emergencyWaitSummary/);
assert.match(detail, /emergencyUrgentNotice/);
assert.match(detail, /emergencyWaitSource/);
assert.match(detail, /emergencyLocationSource/);
assert.match(detail, /emergencyCoordinateSource/);
assert.match(styles, /\.toilet-marker\.is-emergency/);
assert.match(styles, /emergency-pill/);
assert.match(styles, /\.emergency-popup-wait/);
assert.match(styles, /#ffe36a/i, 'Emergency waiting-time values must use the requested prominent yellow');
console.log(`Verified ${snapshot.records.length} official hospital points and live Hospital Authority waiting-time fields.`);
