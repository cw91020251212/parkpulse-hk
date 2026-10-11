import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { manualToiletPositionDocument, parseManualToiletPositions } from '../src/domain/manualToiletPositions.ts';

const valid = parseManualToiletPositions({ version: 1, positions: [
  { toiletId: 'venue-1', latitude: 22.45, longitude: 114.17 },
  { toiletId: 'outside-hk', latitude: 35.68, longitude: 139.69 },
  { toiletId: 'bad-number', latitude: Number.NaN, longitude: 114.17 },
  { toiletId: '', latitude: 22.45, longitude: 114.17 },
] });
assert.deepEqual(valid, { 'venue-1': { lat: 22.45, lng: 114.17 } });
assert.deepEqual(manualToiletPositionDocument(valid), { version: 1, positions: [{ toiletId: 'venue-1', latitude: 22.45, longitude: 114.17 }] });
assert.deepEqual(parseManualToiletPositions({ positions: 'invalid' }), {});

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const map = await readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8');
const shared = await readFile(new URL('../src/data/manual-toilet-positions.json', import.meta.url), 'utf8');
const card = await readFile(new URL('../src/components/ToiletCard.tsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
assert.match(app, /parkpulse:manual-toilet-positions:v1/);
assert.match(app, /localStorage\.setItem\(MANUAL_TOILET_POSITIONS_KEY/);
assert.match(app, /SHARED_MANUAL_TOILET_POSITIONS\[toilet\.id\]/);
assert.match(app, /onCompleteManualPositionEdit=\{saveManualPosition\}/);
assert.match(app, /exportManualToiletPositions/);
assert.doesNotMatch(app, /manualPositionAwaitingConfirmation|confirmManualPositionEdit|continueManualPositionEdit|manual-position-tools/);
assert.match(map, /1_300/);
assert.match(map, /touchstart/);
assert.match(map, /touchmove/);
assert.match(map, /passive: false/);
assert.match(map, /map\.containerPointToLatLng/);
assert.match(map, /map\.dragging\.disable\(\)/);
assert.match(map, /callbacks\.current\.onComplete\(current\.id, coordinates\)/);
assert.match(map, /event\.touches\.length > 1/);
assert.match(map, /callbacks\.current\.onComplete\(current\.id, current\.position\)/);
assert.match(map, /item\.toilet\.locationPrecision === 'venue-uncertain'/);
assert.doesNotMatch(map, /manualPositionAwaitingConfirmation/);
assert.equal((styles.match(/--filter-control-height: 32px;/g) ?? []).length, 2);
assert.match(styles, /\.filters \{ margin-top: 16px; \}/);
assert.match(styles, /\.map-column \{ height: max\(407px, calc\(100dvh - 173px\)\); \}/);
assert.match(styles, /\.map-column > \.map-wrap \{ flex: 1 1 auto; height: auto; min-height: 360px; \}/);
assert.match(styles, /touch-action: none/);
assert.doesNotMatch(styles, /manual-position-tools/);
assert.doesNotMatch(card, /manual-position-action/);
assert.match(card, /manualPositionSource/);
assert.deepEqual(JSON.parse(shared), { version: 1, positions: [] });
console.log('Manual toilet position precision, continuous long-press drag, local save, and export checks passed.');
