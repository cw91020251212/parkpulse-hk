import assert from 'node:assert/strict';
import { MAX_ON_STREET_RENDER, groupOnStreetResults, limitOnStreetResults } from '../src/domain/onStreet.ts';

const record = (id, name, address, occupancy, distanceKm) => ({
  distanceKm,
  onStreet: { id, kind: 'metered', name, address, latitude: 22.3 + distanceKm / 100, longitude: 114.1, occupancy, source: '運輸署新智能咪錶', snapshot: false },
});

const grouped = groupOnStreetResults([
  record('1', '咪錶位 · 桂林街', '桂林街 · 近長沙灣道', 'vacant', 0.1),
  record('2', '咪錶位 · 桂林街', '桂林街 · 近元州街', 'occupied', 0.12),
  record('3', '咪錶位 · 桂林街', '桂林街 · 近長沙灣道', 'unavailable', 0.15),
]);
assert.equal(grouped.length, 1);
assert.deepEqual({ total: grouped[0].onStreet.total, vacant: grouped[0].onStreet.vacant, occupied: grouped[0].onStreet.occupied, unavailable: grouped[0].onStreet.unavailable }, { total: 3, vacant: 1, occupied: 1, unavailable: 1 });
assert.equal(grouped[0].distanceKm, 0.1);

const manyStreets = Array.from({ length: 180 }, (_, index) => ({
  distanceKm: index / 100,
  onStreet: { id: String(index), kind: 'metered', name: `街道 ${index}`, address: '', latitude: 22.3, longitude: 114.1, total: 2, vacant: index < 150 ? 1 : 0, occupied: 1, unavailable: 0, occupancy: index < 150 ? 'vacant' : 'occupied', source: '運輸署新智能咪錶', snapshot: false },
}));
const available = limitOnStreetResults(manyStreets, true);
assert.equal(available.total, 150);
assert.equal(available.items.length, MAX_ON_STREET_RENDER);
const all = limitOnStreetResults(manyStreets, false);
assert.equal(all.total, 180);
assert.equal(all.items.length, MAX_ON_STREET_RENDER);
console.log(`On-street street grouping and render-limit checks passed (${MAX_ON_STREET_RENDER} max street markers/cards).`);
