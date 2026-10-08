import { readFile } from 'node:fs/promises';
import { getOfficialHourlyCharges, getOfficialPricingNotes } from '../src/domain/carpark.ts';

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

const elephantHill = records.find((record) => record.park_Id === 'tdc6p11');
const elephantHillCharges = elephantHill && getOfficialHourlyCharges(elephantHill, 'privateCar');
if (!elephantHillCharges?.some((charge) => charge.source === 'remark' && charge.price === 20 && !charge.periodStart)) {
  throw new Error(`Vehicle-context hourly rate was not parsed: ${JSON.stringify(elephantHillCharges)}`);
}

const xiquCentre = records.find((record) => record.park_Id === 'tdc17p1');
if (!xiquCentre) throw new Error('Xiqu Centre official record is missing');
if (getOfficialHourlyCharges(xiquCentre, 'privateCar').length !== 0) throw new Error('Vehicle-ambiguous rate was incorrectly assigned to private cars');
const xiquNotes = getOfficialPricingNotes(xiquCentre);
if (!xiquNotes.some((note) => note.includes('每小時$28')) || !xiquNotes.some((note) => note.includes('日泊'))) {
  throw new Error(`Official raw rate notes were not retained: ${JSON.stringify(xiquNotes)}`);
}

const structured = records.find((record) => getOfficialHourlyCharges(record, 'privateCar').some((charge) => charge.source === 'structured'));
if (!structured) throw new Error('No structured official hourly charge was found');
const structuredCharge = getOfficialHourlyCharges(structured, 'privateCar')[0];
if (typeof structuredCharge.price !== 'number' || structuredCharge.source !== 'structured') throw new Error('Structured official charge is invalid');

const remarkCoverage = records.filter((record) => getOfficialHourlyCharges(record, 'privateCar').some((charge) => charge.source === 'remark')).length;
if (remarkCoverage < 40) throw new Error(`Expected expanded official parking-note rate coverage, found ${remarkCoverage}`);
console.log(`Official hourly prices validated: ${remarkCoverage} parking-note records; structured sample ${structured.park_Id} HK$${structuredCharge.price}`);
