import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile(new URL('../public/carpark-info.json', import.meta.url), 'utf8'));
const records = payload.results;
if (!Array.isArray(records) || records.length < 500) throw new Error('Official car-park snapshot is incomplete');

const source = await readFile(new URL('../src/domain/carpark.ts', import.meta.url), 'utf8');
assert.match(source, /getOfficialPricingNotes\(info: CarparkInfo, vehicleType: VehicleType\)/);
assert.match(source, /!applicableVehicle\.includes\(vehicleType\)/);
assert.match(source, /getOfficialHourlyCharges\(info: CarparkInfo, vehicleType: VehicleType\)/);

const lamStreet = records.find((record) => record.park_Id === 'tdcp2');
if (!lamStreet) throw new Error('Lam Street official record is missing');
const lamRemarks = (lamStreet.heightLimits ?? []).map((item) => item.remark ?? '').join('\n');
assert.match(lamRemarks, /每小時\s*\$?26/);

const elephantHill = records.find((record) => record.park_Id === 'tdc6p11');
if (!elephantHill) throw new Error('Elephant Hill official record is missing');
const elephantRemarks = (elephantHill.heightLimits ?? []).map((item) => item.remark ?? '').join('\n');
assert.match(elephantRemarks, /私家車/);
assert.match(elephantRemarks, /(?:每小時\s*\$?20|\$20\s*每小時)/);

const xiquCentre = records.find((record) => record.park_Id === 'tdc17p1');
if (!xiquCentre) throw new Error('Xiqu Centre official record is missing');
const xiquRemarks = (xiquCentre.heightLimits ?? []).map((item) => item.remark ?? '').join('\n');
assert.match(xiquRemarks, /每小時\s*\$?28/);
assert.match(xiquRemarks, /日泊/);

const motorcycleNotes = records.filter((record) => (record.heightLimits ?? []).some((item) => /電單車/.test(item.remark ?? '') && /\$/.test(item.remark ?? ''))).length;
if (motorcycleNotes < 1) throw new Error('Expected at least one official motorcycle rate note');

console.log(`Official pricing source checks passed: ${records.length} car parks; ${motorcycleNotes} records contain explicit motorcycle rate notes.`);
