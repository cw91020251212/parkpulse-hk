import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile(new URL('../public/pages-data/atms.json', import.meta.url), 'utf8'));
const records = payload.records ?? [];
const standardChartered = records.find((record) => record.id === 'atm-1826');
const bankOfChina = records.find((record) => record.id === 'atm-1825');

assert.ok(standardChartered, 'Expected the verified Standard Chartered ATM at Tai Po Mega Mall (atm-1826).');
assert.ok(bankOfChina, 'Expected the nearby Bank of China ATM at Tai Po Mega Mall (atm-1825).');
assert.match(standardChartered.address, /大埔超級城/);
assert.match(standardChartered.brand, /渣打/);

const radians = (value) => value * Math.PI / 180;
const distanceKm = (from, to) => {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const overlapDistanceMeters = distanceKm(standardChartered, bankOfChina) * 1000;
assert.ok(overlapDistanceMeters <= 25, `Expected Tai Po ATM markers to overlap within 25m, received ${overlapDistanceMeters.toFixed(1)}m.`);

console.log(`ATM overlap fixture verified: ${standardChartered.id} and ${bankOfChina.id} are ${overlapDistanceMeters.toFixed(1)}m apart.`);
