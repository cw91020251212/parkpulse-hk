import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile(new URL('../public/carpark-info.json', import.meta.url), 'utf8'));
const records = payload.results;
assert(Array.isArray(records), 'static car-park snapshot must contain results');

const totals = records.flatMap((record) => ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach']
  .map((vehicle) => ({ parkId: record.park_Id, vehicle, info: record[vehicle] }))
  .filter(({ info }) => typeof info?.space === 'number'));

assert(totals.length > 0, 'official snapshot must retain at least one supplied total-space value');
for (const { parkId, vehicle, info } of totals) {
  assert(Number.isInteger(info.space) && info.space >= 0, `${parkId} ${vehicle} total spaces must be a non-negative integer`);
  assert(info.spaceEV === undefined || info.spaceEV <= info.space, `${parkId} ${vehicle} EV spaces cannot exceed total spaces`);
  assert(info.spaceDIS === undefined || info.spaceDIS <= info.space, `${parkId} ${vehicle} accessible spaces cannot exceed total spaces`);
}

console.log(`Verified ${totals.length} official vehicle total-space values across ${records.length} car parks`);
