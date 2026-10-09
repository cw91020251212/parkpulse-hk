import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [mapSource, styles] = await Promise.all([
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);

assert.match(mapSource, /const LANDSD_MIN_NATIVE_ZOOM = 10;/);
assert.match(mapSource, /const LANDSD_MAX_NATIVE_ZOOM = 20;/);
assert.match(mapSource, /const MAP_MAX_ZOOM = 22;/);
assert.match(mapSource, /maxZoom=\{MAP_MAX_ZOOM\}/);
const tileLayers = mapSource.match(/<TileLayer[\s\S]*?\/>/g) ?? [];
assert.equal(tileLayers.length, 2, 'Expected one LandsD basemap layer and one label layer');
for (const layer of tileLayers) {
  assert.match(layer, /minNativeZoom=\{LANDSD_MIN_NATIVE_ZOOM\}/);
  assert.match(layer, /maxNativeZoom=\{LANDSD_MAX_NATIVE_ZOOM\}/);
  assert.match(layer, /maxZoom=\{MAP_MAX_ZOOM\}/);
}

const parkingProjectionRule = styles.match(/\.parking-marker-shell::before \{([^}]*)\}/)?.[1] ?? '';
const facilityProjectionRule = styles.match(/\.toilet-marker-shell::before \{([^}]*)\}/)?.[1] ?? '';
const centerPinProjectionRule = styles.match(/\.selected-center-marker-shell::before \{([^}]*)\}/)?.[1] ?? '';
assert.match(parkingProjectionRule, /left: 4px; bottom: -16px; width: 30px; height: 7px;/);
assert.match(facilityProjectionRule, /left: 3px; bottom: -14px; width: 28px; height: 6px;/);
assert.match(centerPinProjectionRule, /left: 8px; bottom: -4px; width: 16px; height: 4px;/);
for (const projectionRule of [parkingProjectionRule, facilityProjectionRule, centerPinProjectionRule]) {
  assert.match(projectionRule, /background: rgb\(48 64 71 \/ 34%\);/);
  assert.doesNotMatch(projectionRule, /transform:/);
  assert.doesNotMatch(projectionRule, /rotate\(/);
}
assert.match(styles, /\.parking-marker[\s\S]*?border: 1px solid var\(--marker-outline\);[\s\S]*?box-shadow: none;/);
assert.match(styles, /\.toilet-marker[\s\S]*?border: 1px solid var\(--marker-outline\);[\s\S]*?box-shadow: none;/);
assert.match(styles, /\.toilet-marker\.is-brand \{ --marker-outline: #7b8790;/);
assert.match(styles, /\.selected-center-marker \{ position: relative; z-index: 1;[\s\S]*?filter: none;/);
assert.doesNotMatch(styles, /\.selected-center-marker \{[^}]*drop-shadow/);
assert.doesNotMatch(styles, /border: 1px solid #0a3341/);

console.log('LandsD tiles remain native from zoom 10 to 20, scale cleanly to zoom 22, and every marker including the grounded centre pin has an independently aligned flat projection.');
