import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/official-static-carparks.json', import.meta.url), 'utf8'));
const records = snapshot.records ?? [];

assert.ok(records.length >= 20, `Expected at least 20 official static car parks, received ${records.length}`);
assert.ok(records.filter((record) => record.officialSource?.availability === 'not-provided').length >= 15, 'Government Property Agency car parks must never be represented as live vacancy data');
assert.ok(records.every((record) => Number.isFinite(record.latitude) && Number.isFinite(record.longitude)), 'Official static car parks need Lands Department coordinates');
assert.ok(records.some((record) => record.name === '金鐘道政府合署'), 'Government Property Agency snapshot should contain Queensway Government Offices');
const mingNga = records.find((record) => record.park_Id === 'link-4324');
assert.equal(mingNga?.name, '明雅停車場', 'Official Link snapshot should include Ming Nga Car Park independently');
assert.equal(mingNga?.officialSource?.availability, 'snapshot', 'Link availability must be labelled as a snapshot, not Transport Department live data');
assert.ok(snapshot.vacancies?.some((record) => record.park_Id === 'link-4324' && record.privateCar?.[0]?.vacancy >= 0), 'Ming Nga snapshot must retain Link-published availability');

console.log(`Verified ${records.length} official supplemental car parks, including the Link Ming Nga availability snapshot`);
