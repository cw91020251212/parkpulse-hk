import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile(new URL('../public/carpark-info.json', import.meta.url), 'utf8'));
const parks = payload.results ?? [];
const vehicleTypes = ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach'];
const hasAccessibleParking = (park) => Boolean(park.facilities?.includes('disabilities')) || vehicleTypes.some((vehicleType) => (park[vehicleType]?.spaceDIS ?? 0) > 0);
const accessible = parks.filter(hasAccessibleParking);
const byId = new Map(parks.map((park) => [park.park_Id, park]));

assert.ok(accessible.length >= 18, `Expected at least 18 official accessible car parks, received ${accessible.length}`);
assert.ok(hasAccessibleParking(byId.get('31')), 'Facility flag should identify Takfuk Plaza Phase I');
assert.ok(hasAccessibleParking(byId.get('117')), 'spaceDIS should identify Kai Ching Estate even without a facility flag');
assert.ok(!hasAccessibleParking({ park_Id: 'none', name: 'none', latitude: 0, longitude: 0 }), 'Unmarked car parks should not be classified as accessible');
console.log(`Verified ${accessible.length} official accessible car parks from facility flags and spaceDIS records`);
