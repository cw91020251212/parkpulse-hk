import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/afcd-nature-centre-toilets.json', import.meta.url), 'utf8'));
assert.equal(snapshot.recordCount, 1);
const [toilet] = snapshot.records ?? [];
assert.equal(toilet.id, 'afcd-lvnp-nature-centre-toilet');
assert.equal(toilet.nameEn, 'Toilet (Long Valley Nature Centre)');
assert.equal(toilet.locationPrecision, 'toilet');
assert.match(toilet.remarks, /明確命名/);
assert.match(toilet.openingHours, /下午5時/);
assert.ok(toilet.latitude >= 22.13 && toilet.latitude <= 22.57 && toilet.longitude >= 113.8 && toilet.longitude <= 114.5);
console.log('Verified the explicitly named Long Valley Nature Centre toilet point and official opening hours.');
