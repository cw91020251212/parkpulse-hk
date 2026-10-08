import { readFile } from 'node:fs/promises';
import { getOfficialHourlyCharges } from '../src/domain/carpark.ts';

const payload = JSON.parse(await readFile(new URL('../public/carpark-info.json', import.meta.url), 'utf8'));
const records = payload.results;
if (!Array.isArray(records) || records.length < 500) throw new Error('Official car-park snapshot is incomplete');

const lamStreet = records.find((record) => record.park_Id === 'tdcp2');
if (!lamStreet) throw new Error('Lam Street official record is missing');
const lamStreetCharges = getOfficialHourlyCharges(lamStreet, 'privateCar');
if (lamStreetCharges.length !== 2 || lamStreetCharges[0].source !== 'remark' || lamStreetCharges[0].price !== 26 || lamStreetCharges[0].periodStart !== '07:00' || lamStreetCharges[0].periodEnd !== '23:00') {
  throw new Error(`Government note price parsing failed: ${JSON.stringify(lamStreetCharges)}`);
}
if (getOfficialHourlyCharges(lamStreet, 'motorCycle').length !== 0) throw new Error('Daily motorcycle fee was incorrectly parsed as an hourly rate');

const structured = records.find((record) => getOfficialHourlyCharges(record, 'privateCar').some((charge) => charge.source === 'structured'));
if (!structured) throw new Error('No structured official hourly charge was found');
const structuredCharge = getOfficialHourlyCharges(structured, 'privateCar')[0];
if (typeof structuredCharge.price !== 'number' || structuredCharge.source !== 'structured') throw new Error('Structured official charge is invalid');

const remarkCoverage = records.filter((record) => getOfficialHourlyCharges(record, 'privateCar').some((charge) => charge.source === 'remark')).length;
if (remarkCoverage < 9) throw new Error(`Expected at least 9 verified official parking-note rates, found ${remarkCoverage}`);
console.log(`Official hourly prices validated: ${remarkCoverage} parking-note records; structured sample ${structured.park_Id} HK$${structuredCharge.price}`);
