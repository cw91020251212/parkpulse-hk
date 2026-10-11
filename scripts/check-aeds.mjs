import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/aeds.json', import.meta.url), 'utf8'));
assert.match(snapshot.source, /消防處 CARE/);
assert.doesNotMatch(snapshot.source, /即時/);
assert.match(snapshot.sourceUrl, /data\.gov\.hk/);
assert.ok(Number.isFinite(Date.parse(snapshot.generatedAt)), 'AED snapshot requires a generatedAt timestamp');
assert.ok(snapshot.rawRecordCount >= 4_000, `Expected at least 4,000 raw FSD records, got ${snapshot.rawRecordCount}`);
assert.ok(snapshot.records.length >= 4_000, `Expected at least 4,000 public AED records, got ${snapshot.records.length}`);
assert.ok(snapshot.records.every((item) => item.kind === 'aed' && item.name && item.address && item.latitude >= 22.13 && item.latitude <= 22.57 && item.longitude >= 113.8 && item.longitude <= 114.5), 'AED records require official names, addresses, kinds and Hong Kong coordinates');
assert.ok(snapshot.records.some((item) => item.remarks?.includes('裝設位置：')), 'AED records should retain the official detailed installation location');
console.log(`Verified ${snapshot.records.length} public FSD CARE AED records from ${snapshot.rawRecordCount} raw records`);
