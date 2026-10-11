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
assert.match(app, /parkpulse:manual-toilet-positions:v1/);
assert.match(app, /localStorage\.setItem\(MANUAL_TOILET_POSITIONS_KEY/);
assert.match(app, /SHARED_MANUAL_TOILET_POSITIONS\[toilet\.id\]/);
assert.match(app, /manualPositionDraft\?\.awaitingConfirmation/);
assert.match(app, /exportManualToiletPositions/);
assert.match(map, /1_300/);
assert.match(map, /touchstart/);
assert.match(map, /draggable=\{manualPositionEditing && !manualPositionAwaitingConfirmation\}/);
assert.match(map, /onManualPositionChange\(place\.id/);
assert.match(map, /item\.toilet\.locationPrecision === 'venue-uncertain'/);
assert.doesNotMatch(card, /manual-position-action/);
assert.match(card, /manualPositionSource/);
assert.deepEqual(JSON.parse(shared), { version: 1, positions: [] });
console.log('Manual toilet position storage, precision, long-press, confirmation and export checks passed.');
