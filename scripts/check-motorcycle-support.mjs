import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const carparkDomain = await readFile(new URL('../src/domain/carpark.ts', import.meta.url), 'utf8');
const onStreetDomain = await readFile(new URL('../src/domain/onStreet.ts', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const filters = await readFile(new URL('../src/components/Filters.tsx', import.meta.url), 'utf8');

assert.match(carparkDomain, /getOfficialPricingNotes\(info: CarparkInfo, vehicleType: VehicleType\)/);
assert.match(carparkDomain, /!applicableVehicle\.includes\(vehicleType\)/);
assert.match(onStreetDomain, /privateCar: \['A'\]/);
assert.match(onStreetDomain, /motorCycle: \[\]/);
assert.match(onStreetDomain, /LGV: \['A', 'G'\]/);
assert.match(onStreetDomain, /HGV: \['G'\]/);
assert.match(onStreetDomain, /coach: \['C'\]/);
assert.match(app, /useMotorcycleRoadside/);
assert.match(app, /showingMotorcycleOnStreet/);
assert.match(filters, /isMotorcycleRoadside/);
assert.doesNotMatch(filters, /href="https:\/\/www\.td\.gov\.hk\/tc\/transport_in_hong_kong\/parking\/on_street_motorcycle_parking_spaces/);

const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/on-street-parking.json', import.meta.url), 'utf8'));
const records = snapshot.nonMetered ?? snapshot.records ?? [];
assert(records.length > 0, 'Expected official on-street snapshot records');
assert.equal(records.some((record) => String(record.vehicleType).toUpperCase() === 'M'), false, 'Current official trial snapshot must not be represented as motorcycle spaces');

const motorcycleSnapshot = JSON.parse(await readFile(new URL('../public/pages-data/motorcycle-roadside.json', import.meta.url), 'utf8'));
assert(motorcycleSnapshot.recordCount >= 10_000, 'Expected official HKeMobility motorcycle roadside records');
assert(motorcycleSnapshot.groups?.length >= 600, 'Expected grouped official motorcycle roadside streets');
assert(motorcycleSnapshot.groups.every((group) => group.vehicleType === 'Motor Cycles'), 'HKeMobility snapshot must remain motorcycle-only');

console.log(`Motorcycle support checks passed: ${records.length} trial records excluded for motorcycles; ${motorcycleSnapshot.recordCount} official motorcycle roadside spaces shown in-app.`);
