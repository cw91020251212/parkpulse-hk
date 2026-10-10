import assert from 'node:assert/strict';
import { removeCrossSourceLcsdToiletDuplicates, sameToiletAtSamePlace } from '../src/domain/toiletDedupe.ts';

const fehd = {
  id: 'fehd-1', kind: 'publicToilet', name: '晏架街遊樂場公廁',
  latitude: 22.312345, longitude: 114.225678,
};
const lcsdDuplicate = {
  id: 'lcsd-1', kind: 'lcsdParkToilet', locationPrecision: 'toilet',
  name: '晏架街遊樂場公廁', latitude: 22.312366, longitude: 114.225681,
};
const nearbyDifferentToilet = {
  id: 'lcsd-2', kind: 'lcsdParkToilet', locationPrecision: 'toilet',
  name: '觀塘另一公園廁所', latitude: 22.3125, longitude: 114.2257,
};
const nearbySimilarName = {
  ...lcsdDuplicate, id: 'lcsd-prefix-near', name: '晏架街遊樂場東廁所',
};
const venueOnly = {
  id: 'lcsd-venue', kind: 'lcsdParkToilet', locationPrecision: 'venue-uncertain',
  name: '晏架街遊樂場', latitude: 22.312345, longitude: 114.225678,
};

assert.equal(sameToiletAtSamePlace(fehd, lcsdDuplicate), true);
assert.equal(sameToiletAtSamePlace(fehd, nearbyDifferentToilet), false, 'distance alone must not collapse a differently named toilet');
assert.equal(sameToiletAtSamePlace(fehd, nearbySimilarName), false, 'a shared name prefix must not collapse distinct toilets');
assert.deepEqual(removeCrossSourceLcsdToiletDuplicates([fehd, nearbySimilarName]).map(({ id }) => id), ['fehd-1', 'lcsd-prefix-near']);
const result = removeCrossSourceLcsdToiletDuplicates([fehd, lcsdDuplicate, nearbyDifferentToilet, venueOnly]);
assert.deepEqual(result.map(({ id }) => id), ['fehd-1', 'lcsd-2', 'lcsd-venue']);
console.log('Toilet cross-source dedupe OK: only equal normalized names at the same place are merged; similar-name and venue-level records are retained.');
