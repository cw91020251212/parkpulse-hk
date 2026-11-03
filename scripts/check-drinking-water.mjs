import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { matchesWaterEnvironment } from '../src/domain/drinkingWater.ts';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const snapshots = await Promise.all(['lcsd', 'afcd', 'mtr'].map(async (provider) => JSON.parse(await read(`public/pages-data/${provider}-drinking-water.json`))));
const ids = new Set();
for (const snapshot of snapshots) {
  assert.ok(!Number.isNaN(Date.parse(snapshot.generatedAt)));
  assert.ok(snapshot.source['zh-Hant'] && snapshot.source.en);
  assert.ok(snapshot.records.length);
  for (const record of snapshot.records) {
    assert.ok(!ids.has(record.id), `duplicate ${record.id}`); ids.add(record.id);
    assert.ok(record.nameTc && record.nameEn && record.addressTc && record.addressEn);
    assert.ok(record.latitude > 22 && record.latitude < 23 && record.longitude > 113 && record.longitude < 115);
    assert.ok(['lcsd', 'afcd', 'mtr'].includes(record.provider));
    assert.ok(['indoor', 'outdoor', 'unknown'].includes(record.indoorOutdoor));
    assert.ok(['confirmed', 'notPublished'].includes(record.filterStatus));
    assert.equal(typeof record.temporaryClosed, 'boolean');
    assert.ok(record.unitCount === null || Number.isInteger(record.unitCount) && record.unitCount >= 0);
    assert.ok(/^https:\/\//.test(record.sourceUrl));
    assert.ok(/(^|\.)(gov\.hk|mtr\.com\.hk)$/.test(new URL(record.sourceUrl).hostname), record.sourceUrl);
    assert.ok(!('snapshotUrl' in record), 'never invent water-facility images');
  }
}
for (const value of ['indoor', 'outdoor', 'unknown']) {
  assert.equal(matchesWaterEnvironment('all', { indoorOutdoor: value }), true);
  assert.equal(matchesWaterEnvironment('indoor', { indoorOutdoor: value }), value === 'indoor');
  assert.equal(matchesWaterEnvironment('outdoor', { indoorOutdoor: value }), value === 'outdoor');
}
assert.equal(matchesWaterEnvironment('indoor'), false);
const app = await read('src/App.tsx');
assert.match(app, /matchesWaterEnvironment\(waterEnvironment, facility.drinkingWater\)/);
const countsMemo = app.match(/const waterEnvironmentCounts = useMemo\(\(\) => countWaterEnvironments\([\s\S]*?\n  }\)\), \[([^\]]+)\]\);/);
assert.ok(countsMemo, 'environment counts have their own scope-filtered memo');
assert.match(countsMemo[0], /isWithinSearchScope/);
assert.match(countsMemo[0], /distanceInKm\(rangeOrigin, coordinates\)/);
assert.doesNotMatch(countsMemo[0], /matchesWaterEnvironment|waterEnvironment,/);
assert.match(app, /counts=\{waterEnvironmentCounts\} scopeLabel=\{rangeDescription\}/);

const waterPicker = await read('src/components/WaterEnvironmentPicker.tsx');
assert.match(waterPicker, /indoor/); assert.match(waterPicker, /outdoor/);
assert.match(app, /<WaterEnvironmentPicker/);
assert.doesNotMatch(app, /className="water-filter"/);
assert.match(app, /facilityMode !== 'drinkingWater'/);
assert.match(app, /legend-drinking-water/);
assert.match(await read('src/hooks/useNearbyFacilities.ts'), /mode !== 'drinkingWater'/);
assert.match(await read('src/components/Filters.tsx'), /'drinkingWater'/);
const map = await read('src/components/MapView.tsx');
assert.match(map, /const drinkingWater = kind === 'drinkingWater'/);
assert.match(map, /const tone = drinkingWater \? ' is-drinking-water'/);
assert.match(map, /class="toilet-marker\$\{tone\}/);
const card = await read('src/components/DrinkingWaterCard.tsx');
assert.match(card, /waterVenuePin/);
assert.match(await read('src/components/DrinkingWater.css'), /linear-gradient/);
assert.match(await read('public/icons/drinking-water.svg'), /Lucide glass-water/);
assert.match(card, /water-card-actions/); assert.doesNotMatch(card, /toilet-card-actions/);
assert.match(card, /water\.unitCount/); assert.match(card, /temporaryClosed/);
const detail = await read('src/components/NearbyFacilityDetail.tsx');
assert.match(detail, /<DrinkingWaterDetailFields/); assert.match(detail, /<DetailCloseBar/);
const fields = await read('src/components/DrinkingWaterDetailFields.tsx');
for (const label of ['waterLocation', 'waterServiceHours', 'waterFilterSpec', 'waterAccess', 'waterSnapshotDate']) assert.ok(fields.includes(label));
assert.match(fields, /filterStatus === 'confirmed'/);
const loader = await read('src/api/drinkingWater.ts');
assert.match(loader, /Promise.allSettled/); assert.match(loader, /if \(!snapshots.length\) throw/);
assert.match(loader, /snapshotGeneratedAt: snapshot.generatedAt/);
assert.match(loader, /未能載入來源/);
const build = await read('scripts/build-pages-data.mjs');
for (const provider of ['lcsd', 'afcd', 'mtr']) assert.ok(build.includes(`${provider}-drinking-water.json`));
console.log(`Drinking water OK: ${ids.size} official location records; indoor/outdoor, source dates, closure notices, existing waterdrop pins and shared detail exits.`);
