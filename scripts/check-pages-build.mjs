import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const readJson = async (name) => JSON.parse(await readFile(path.join(root, 'public/pages-data', name), 'utf8'));
const [ev, toilets, fuel, atms, placeLinks] = await Promise.all(['ev-chargers.json', 'public-toilets.json', 'fuel-stations.json', 'atms.json', 'verified-place-links.json'].map(readJson));
assert.ok(ev.records.length > 100, 'GitHub Pages EV snapshot should contain records');
assert.ok(toilets.records.length >= 700, 'GitHub Pages toilet snapshot should contain official toilets');
assert.ok(fuel.records.length >= 170, 'GitHub Pages fuel snapshot should contain stations');
assert.ok(atms.records.length >= 1_500, 'GitHub Pages ATM snapshot should contain records');
assert.ok(placeLinks.records.length >= 1_000, 'GitHub Pages should contain verified photo place links');
const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
assert.match(html, /\/parkpulse-hk\//, 'GitHub Pages build must use the repository base path');
console.log(`Verified static Pages data: ${ev.records.length} EV, ${toilets.records.length} toilets, ${fuel.records.length} fuel stations, ${atms.records.length} ATMs, ${placeLinks.records.length} verified photo places`);
