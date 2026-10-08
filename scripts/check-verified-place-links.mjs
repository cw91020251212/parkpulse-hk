import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const links = JSON.parse(await readFile('public/pages-data/verified-place-links.json', 'utf8'));
assert.ok(Array.isArray(links.records) && links.records.length > 100, 'Expected a substantial verified place-link snapshot');
for (const link of links.records) {
  assert.match(link.key, /^(carpark|publicToilet|lcsdVenue):.+/, 'Expected a stable facility key');
  assert.match(link.placeUrl, /query_place_id=/, 'Expected an exact Google Maps place URL');
  assert.ok(Number.isFinite(link.distanceMeters) && link.distanceMeters <= 100, 'Expected a coordinate-verified place within 100m');
  if (link.kind === 'publicToilet') assert.match(link.placeName, /toilet|bathhouse|urinal|washroom|restroom|公廁|尿廁|浴室|洗手間/i, 'Expected a public-toilet place result');
}
const toilets = JSON.parse(await readFile('public/pages-data/public-toilets.json', 'utf8')).records;
const mongKok = toilets.find((toilet) => toilet.name === '旺角道公廁');
assert.ok(mongKok && links.records.some((link) => link.key === `publicToilet:${mongKok.id}`), 'Expected an exact place link for Mong Kok Road Public Toilet');
console.log(`Verified ${links.records.length} exact Google Maps place links`);
