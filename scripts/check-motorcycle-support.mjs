import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const carparkDomain = await readFile(new URL('../src/domain/carpark.ts', import.meta.url), 'utf8');
const onStreetDomain = await readFile(new URL('../src/domain/onStreet.ts', import.meta.url), 'utf8');

assert.match(carparkDomain, /getOfficialPricingNotes\(info: CarparkInfo, vehicleType: VehicleType\)/);
assert.match(carparkDomain, /!applicableVehicle\.includes\(vehicleType\)/);
assert.match(onStreetDomain, /privateCar: \['A'\]/);
assert.match(onStreetDomain, /motorCycle: \[\]/);
assert.match(onStreetDomain, /LGV: \['A', 'G'\]/);
assert.match(onStreetDomain, /HGV: \['G'\]/);
assert.match(onStreetDomain, /coach: \['C'\]/);

const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/on-street-parking.json', import.meta.url), 'utf8'));
const records = snapshot.nonMetered ?? snapshot.records ?? [];
assert(records.length > 0, 'Expected official on-street snapshot records');
assert.equal(records.some((record) => String(record.vehicleType).toUpperCase() === 'M'), false, 'Current official trial snapshot must not be represented as motorcycle spaces');

console.log(`Motorcycle support checks passed: ${records.length} official roadside records; no motorcycle-eligible trial record.`);
