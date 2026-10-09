import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const readJson = async (name) => JSON.parse(await readFile(path.join(root, 'public/pages-data', name), 'utf8'));
const [ev, toilets, fuel, atms, placeLinks, onStreet, motorcycleRoadside, operatorRates] = await Promise.all([
  ...['ev-chargers.json', 'public-toilets.json', 'fuel-stations.json', 'atms.json', 'verified-place-links.json', 'on-street-parking.json', 'motorcycle-roadside.json'].map(readJson),
  readFile(path.join(root, 'public/operator-rates.json'), 'utf8').then(JSON.parse),
]);
assert.ok(ev.records.length > 100, 'GitHub Pages EV snapshot should contain records');
assert.ok(toilets.records.length >= 700, 'GitHub Pages toilet snapshot should contain official toilets');
assert.ok(fuel.records.length >= 170, 'GitHub Pages fuel snapshot should contain stations');
assert.ok(atms.records.length >= 1_500, 'GitHub Pages ATM snapshot should contain records');
assert.ok(placeLinks.records.length >= 1_000, 'GitHub Pages should contain verified place links');
assert.ok(placeLinks.records.some((record) => record.kind === 'carpark' && Number.isFinite(record.rating)), 'GitHub Pages should contain verified car-park ratings');
assert.ok(onStreet.nonMetered?.length >= 100, 'GitHub Pages should contain the Transport Department sensor-trial snapshot');
assert.ok(motorcycleRoadside.recordCount >= 10_000 && motorcycleRoadside.groups?.length >= 600, 'GitHub Pages should contain the official HKeMobility motorcycle roadside snapshot');
assert.ok(Object.keys(operatorRates.records ?? {}).length >= 80, 'GitHub Pages should contain Link official rate snapshots');
const brandManifest = JSON.parse(await readFile(path.join(root, 'public/brand-icons/manifest.json'), 'utf8'));
const brandFiles = Object.values(brandManifest.records).map((record) => record.file);
assert.equal(brandFiles.length, 25, 'GitHub Pages should contain all current fuel and ATM brand icons');
await Promise.all(brandFiles.map((file) => access(path.join(root, 'dist/brand-icons', file))));
const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
assert.match(html, /\/parkpulse-hk\//, 'GitHub Pages build must use the repository base path');
console.log(`Verified static Pages data: ${ev.records.length} EV, ${toilets.records.length} toilets, ${fuel.records.length} fuel stations, ${atms.records.length} ATMs, ${onStreet.nonMetered.length} trial road-side spaces, ${motorcycleRoadside.recordCount} motorcycle roadside spaces, ${placeLinks.records.length} verified place links, ${Object.keys(operatorRates.records).length} operator rate snapshots`);
