import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const links = JSON.parse(await readFile('public/pages-data/verified-place-links.json', 'utf8'));
assert.ok(Array.isArray(links.records) && links.records.length > 100, 'Expected a substantial verified place-link snapshot');
for (const link of links.records) {
  assert.match(link.key, /^(carpark|publicToilet|lcsdVenue):.+/, 'Expected a stable facility key');
  assert.match(link.placeUrl, /query_place_id=/, 'Expected an exact Google Maps place URL');
  assert.ok(Number.isFinite(link.distanceMeters) && link.distanceMeters <= 100, 'Expected a coordinate-verified place within 100m');
  if (link.rating !== undefined) {
    assert.ok(Number.isFinite(link.rating) && link.rating >= 0 && link.rating <= 5, 'Expected a valid Google Maps rating');
    assert.ok(Number.isInteger(link.userRatingCount) && link.userRatingCount > 0, 'Expected a positive user-rating count');
  }
  if (link.kind === 'publicToilet') assert.match(link.placeName, /toilet|bathhouse|urinal|washroom|restroom|公廁|尿廁|浴室|洗手間/i, 'Expected a public-toilet place result');
}
const ratedCarparks = links.records.filter((link) => link.kind === 'carpark' && link.rating !== undefined);
assert.ok(ratedCarparks.length > 0, 'Expected at least one strictly verified car-park rating');
console.log(`Verified ${links.records.length} exact place links with ${ratedCarparks.length} car-park ratings`);
