import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(await readFile(new URL('../public/had-community-toilets.json', import.meta.url), 'utf8'));
const records = snapshot.records;
assert.equal(snapshot.recordCount, records?.length, 'Snapshot recordCount must match the record list');
assert.ok(records.length >= 100, `Expected at least 100 officially matched HAD venues, got ${records.length}`);
assert.equal(new Set(records.map((record) => record.id)).size, records.length, 'HAD venue IDs must be unique');
assert.equal(new Set(records.map((record) => record.districtEn)).size, 18, 'HAD venue toilets must cover all 18 official English district values');
assert.equal(new Set(records.map((record) => record.district)).size, 18, 'HAD venue toilets must have 18 distinct Chinese district labels');
assert.ok(records.filter((record) => record.districtEn === 'Kwun Tong').every((record) => record.district === '觀塘'), 'Kwun Tong reference numbers must not be joined to Kwai Tsing Chinese rows');
assert.ok(records.filter((record) => record.districtEn === 'Kwai Tsing').every((record) => record.district === '葵青'), 'Kwai Tsing reference numbers must resolve to the correct Chinese district');
assert.ok(records.every((record) => record.kind === 'hadCommunityToilet' && record.locationPrecision === 'venue-uncertain' && record.hasAccessibleToilet === true), 'Every item must be officially listed as a venue with an accessible toilet, not an exact restroom point');
assert.ok(records.every((record) => record.name && record.nameEn && record.address && record.addressEn && record.district && record.districtEn && Number.isFinite(record.latitude) && Number.isFinite(record.longitude) && record.latitude >= 22.13 && record.latitude <= 22.57 && record.longitude >= 113.8 && record.longitude <= 114.5), 'Every venue needs bilingual identity, district and an official Hong Kong coordinate');
assert.ok(records.every((record) => record.remarks.includes('並非洗手間') && record.remarksEn.includes('not the toilet')), 'Every venue must disclose location and access uncertainty');
console.log(`Verified ${records.length} HAD venues with accessible toilets across all 18 districts; all markers are venue-level only.`);
