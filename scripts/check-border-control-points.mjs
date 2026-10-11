import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { IMMD_BORDER_RESIDENTS_URL, IMMD_BORDER_VISITORS_URL } from '../lib/border-control-points.mjs';
import { borderQueueLabel, borderQueueTone } from '../src/domain/borderWait.ts';

for (const [language, traveller, expected] of [
  ['zh-Hant', 'resident', ['正常（一般少於15分鐘）', '繁忙（一般少於30分鐘）', '非常繁忙（一般30分鐘或以上）', '系統維護中', '非服務時間']],
  ['zh-Hant', 'visitor', ['正常（一般少於30分鐘）', '繁忙（一般少於45分鐘）', '非常繁忙（一般45分鐘或以上）', '系統維護中', '非服務時間']],
  ['en', 'resident', ['Normal (<15 min)', 'Busy (<30 min)', 'Very busy (≥30 min)', 'System maintenance', 'Out of service hours']],
  ['en', 'visitor', ['Normal (<30 min)', 'Busy (<45 min)', 'Very busy (≥45 min)', 'System maintenance', 'Out of service hours']],
]) {
  const codes = [0, 1, 2, 4, 99];
  assert.deepEqual(codes.map((code) => borderQueueLabel(language, code, traveller)), expected, `${language} ${traveller} labels must match Immigration Department status-code definitions`);
  assert.deepEqual(codes.map((code) => borderQueueTone(code)), ['normal', 'busy', 'very-busy', 'unavailable', 'unavailable'], 'Maintenance and out-of-service states must never appear as low waiting times');
}

const root = new URL('../', import.meta.url);
const snapshot = JSON.parse(await readFile(new URL('public/pages-data/border-control-points.json', root), 'utf8'));
assert.equal(snapshot.records.length, 8, 'Border snapshot must contain the eight current Immigration Department control points');
assert.ok(snapshot.records.every((record) => record.kind === 'border' && record.code && record.nameTc && record.nameEn && record.latitude >= 22.13 && record.latitude <= 22.57 && record.longitude >= 113.8 && record.longitude <= 114.5 && record.locationSourceUrl && record.coordinateTransformSourceUrl), 'Every control point needs bilingual identity, official map coordinates and traceable LandsD sources');
assert.ok(snapshot.records.every((record) => [record.residents.arrival, record.residents.departure, record.visitors.arrival, record.visitors.departure].every((code) => [0, 1, 2, 4, 99].includes(code))), 'Every queue status must use an Immigration Department documented status code');
assert.ok(snapshot.generatedAt, 'Border snapshot must show when the Page-build snapshot was generated');

const [residents, visitors, app, map, card, detail, filters, styles] = await Promise.all([
  fetch(IMMD_BORDER_RESIDENTS_URL).then((response) => { assert.equal(response.status, 200); return response.json(); }),
  fetch(IMMD_BORDER_VISITORS_URL).then((response) => { assert.equal(response.status, 200); return response.json(); }),
  readFile(new URL('src/App.tsx', root), 'utf8'),
  readFile(new URL('src/components/MapView.tsx', root), 'utf8'),
  readFile(new URL('src/components/NearbyFacilityCard.tsx', root), 'utf8'),
  readFile(new URL('src/components/NearbyFacilityDetail.tsx', root), 'utf8'),
  readFile(new URL('src/components/Filters.tsx', root), 'utf8'),
  readFile(new URL('src/styles.css', root), 'utf8'),
]);
const codes = snapshot.records.map((record) => record.code).sort();
assert.ok(codes.every((code) => Object.hasOwn(residents, code)), 'Resident source must contain every displayed control point; additional source codes without a verified LandsD point are not displayed');
assert.ok(codes.every((code) => Object.hasOwn(visitors, code)), 'Visitor source must contain every displayed control point; additional source codes without a verified LandsD point are not displayed');
assert.match(filters, /'border'/);
assert.match(app, /borderWait/);
assert.match(app, /borderControlPoints/);
assert.match(map, /kind === 'border'/);
assert.match(map, /BORDER_SYMBOL_URL/);
assert.match(card, /borderWaitSummary/);
assert.match(detail, /borderWaitingTimes/);
assert.match(detail, /traveller="visitor"/);
assert.match(styles, /\.toilet-marker\.is-border/);
assert.match(styles, /border-control-symbol/);
console.log(`Verified ${snapshot.records.length} official border control points and both Immigration Department queue sources.`);
