import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appSource, mapSource] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
]);

assert.match(appSource, /const mapParks = startupLocationPending \|\| facilityMode \? \[\] : displayedParks;/);
assert.match(appSource, /const mapNearbyItems = startupLocationPending \|\| !facilityMode \? \[\] : activeNearbyResults;/);
assert.match(mapSource, /nearbyItems\.map\(\(item\)/);

console.log('Facility result cards and Leaflet facility markers use the same active nearby results after startup location is ready.');
