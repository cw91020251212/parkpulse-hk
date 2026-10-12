import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appSource, mapSource, detailSource, styles, borderIcon] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/NearbyFacilityDetail.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../public/icons/border-control.svg', import.meta.url), 'utf8'),
]);

assert.match(appSource, /const mapParks = \(startupLocationPending && searchScope === 'radius'\) \|\| facilityMode \? \[\] : displayedParks;/);
assert.match(appSource, /const mapNearbyItems = \(startupLocationPending && searchScope === 'radius'\) \|\| !facilityMode \? \[\] : activeNearbyResults;/);
assert.match(appSource, /legend-aed-symbol/);
assert.match(appSource, /aedSnapshotGeneratedAt/);
assert.match(appSource, /legend-emergency-symbol/);
assert.match(appSource, /emergencyWaitStatistics/);
assert.match(appSource, /legend-border-symbol/);
assert.match(appSource, /borderSnapshotGeneratedAt/);
assert.match(mapSource, /nearbyItems\.map\(\(item\)/);
assert.match(mapSource, /kind === 'aed'/);
assert.match(mapSource, /kind === 'emergency'/);
assert.match(mapSource, /kind === 'border'/);
assert.match(mapSource, /is-aed/);
assert.match(mapSource, /is-emergency/);
assert.match(mapSource, /is-border/);
assert.match(mapSource, /AED_SYMBOL_URL/);
assert.match(mapSource, /EMERGENCY_SYMBOL_URL/);
assert.match(mapSource, /BORDER_SYMBOL_URL/);
assert.match(mapSource, /aedSources/);
assert.match(mapSource, /emergencySources/);
assert.match(mapSource, /borderSources/);
assert.match(detailSource, /aed-detail-symbol/);
assert.match(detailSource, /aedSnapshot/);
assert.match(detailSource, /emergency-detail-symbol/);
assert.match(detailSource, /emergencyUrgentNotice/);
assert.match(detailSource, /border-detail-symbol/);
assert.match(detailSource, /borderWaitingTimes/);
assert.match(styles, /\.toilet-marker \.aed-symbol \{ width: 30px; height: 30px; \}/);
assert.match(styles, /\.toilet-marker\.is-emergency/);
assert.match(styles, /\.emergency-pill-symbol/);
assert.match(styles, /\.border-control-symbol/);
assert.match(borderIcon, /<circle[^>]+fill="none"/);
assert.match(borderIcon, /<path[^>]+fill="#18a8cb"/);
assert.match(borderIcon, /stroke-dasharray="5 4"/);
assert.doesNotMatch(borderIcon, /<rect[^>]+fill="(?!none|transparent)/);

console.log('Facility cards, Leaflet markers, map legend, popup and detail cover AED, emergency-department and border-control symbols with matching source and safety text.');
