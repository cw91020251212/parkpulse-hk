import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile(new URL('../public/lcsd-washroom-venues.json', import.meta.url), 'utf8'));
assert.match(payload.source, /康樂及文化事務署/);
assert.ok(Array.isArray(payload.records) && payload.records.length === 116, `Expected 116 LCSD indoor venues, got ${payload.records?.length ?? 0}`);
assert.equal(new Set(payload.records.map((record) => record.id)).size, payload.records.length, 'Venue ids must be unique');
assert.ok(payload.records.every((record) => record.kind === 'lcsdVenue' && record.category === '體育館及室內體育設施' && record.name && record.address && record.openingHours && record.latitude >= 22.13 && record.latitude <= 22.57 && record.longitude >= 113.8 && record.longitude <= 114.5), 'All venues need official identity, opening hours and valid Hong Kong coordinates');
console.log(`Verified ${payload.records.length} LCSD indoor washroom venues`);
