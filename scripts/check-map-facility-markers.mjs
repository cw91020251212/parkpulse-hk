import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appSource, mapSource, detailSource] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/NearbyFacilityDetail.tsx', import.meta.url), 'utf8'),
]);

assert.match(appSource, /const mapParks = startupLocationPending \|\| facilityMode \? \[\] : displayedParks;/);
assert.match(appSource, /const mapNearbyItems = startupLocationPending \|\| !facilityMode \? \[\] : activeNearbyResults;/);
assert.match(appSource, /legend-aed-symbol/);
assert.match(appSource, /aedSnapshotGeneratedAt/);
assert.match(mapSource, /nearbyItems\.map\(\(item\)/);
assert.match(mapSource, /kind === 'aed'/);
assert.match(mapSource, /is-aed/);
assert.match(mapSource, /AED_SYMBOL_URL/);
assert.match(mapSource, /aedSources/);
assert.match(detailSource, /aed-detail-symbol/);
assert.match(detailSource, /aedSnapshot/);

console.log('Facility cards, Leaflet markers, map legend, popup and detail use the same AED symbol, CARE source and snapshot-time flow.');
