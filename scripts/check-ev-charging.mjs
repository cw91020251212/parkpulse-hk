import assert from 'node:assert/strict';
import { findEvCharger } from '../src/domain/evChargers.ts';

const baseUrl = process.env.PARKSPOT_BASE_URL ?? 'http://127.0.0.1:3000';
const response = await fetch(`${baseUrl}/api/ev-chargers`);
assert.equal(response.ok, true, `EV endpoint returned ${response.status}`);
const { records } = await response.json();

const tsuenWanCarpark = {
  park_Id: 'tdcp3',
  name: '荃灣停車場',
  displayAddress: '新界荃灣青山公路-荃灣段174-208號',
  latitude: 22.37284735,
  longitude: 114.11860252,
};
const match = findEvCharger(tsuenWanCarpark, records);
assert.equal(match?.name, '荃灣停車場');
assert.equal(match?.distanceMeters, 0);
assert.ok((match?.total ?? 0) >= 1);

const unrelatedNearby = findEvCharger(
  { ...tsuenWanCarpark, name: '不相干停車場', displayAddress: '香港測試地址', latitude: 22.37365, longitude: 114.11860 },
  records.filter((record) => record.name === '荃灣停車場'),
);
assert.equal(unrelatedNearby, undefined);

console.log(`Verified ${match.name}: ${match.available ?? 'unknown'}/${match.total} available`);
