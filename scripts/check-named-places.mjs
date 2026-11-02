import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { containsPlace, findNamedPlaces, distanceToPlace } from '../src/domain/namedPlaces.ts';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const square = (minX, minY, maxX, maxY) => [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]];
const place = (id, rings) => ({ id, nameTc: id, nameEn: id, kind: 'site', geometry: { type: 'Polygon', coordinates: rings }, bbox: [114.18, 22.27, 114.19, 22.28] });
const outer = square(114.18, 22.27, 114.19, 22.28);
const hole = square(114.183, 22.273, 114.187, 22.277);
const full = place('full', [outer]);
const donut = place('donut', [outer, hole]);
const center = { lng: 114.185, lat: 22.275 };
assert.equal(containsPlace(full, center), true);
assert.equal(containsPlace(donut, center), false, 'A polygon hole must not be identified as inside the building');
assert.equal(containsPlace(full, { lng: 114.18, lat: 22.275 }), true);
assert.equal(containsPlace(full, { lng: 114.17, lat: 22.275 }), false);
assert.equal(findNamedPlaces([full], center)[0].relation, 'inside');
assert.equal(findNamedPlaces([full], { lng: 114.1795, lat: 22.275 })[0].relation, 'nearby');
assert.ok(distanceToPlace(full, { lng: 114.1795, lat: 22.275 }) > 40);
assert.equal(findNamedPlaces([full], { lng: 114.16, lat: 22.275 }).length, 0);
const multiple = { ...full, geometry: { type: 'MultiPolygon', coordinates: [[outer], [square(114.20, 22.28, 114.21, 22.29)]] }, bbox: [114.18, 22.27, 114.21, 22.29] };
assert.equal(containsPlace(multiple, { lng: 114.205, lat: 22.285 }), true);
const info = await read('src/components/PositionInfo.tsx');
const api = await read('src/api/namedPlaces.ts');
assert.match(info, /position-info-name/);
assert.ok(info.indexOf('position-info-name') < info.indexOf('position-info-location-details'));
assert.match(info, /<details[^>]*position-info-location-details/);
assert.match(info, /<Official3DLink point=\{point\}/);
assert.match(api, /publicAsset\('pages-data\/named-places\.json'\)/);
assert.doesNotMatch(api, /point\.(lat|lng)|geih-ws|gih-ws|nominatim|overpass|workers\.dev/);

if (!process.argv.includes('--geometry-only')) {
  const snapshot = JSON.parse(await read('public/pages-data/named-places.json'));
  assert.ok(snapshot.places.length >= 1000, 'Must use a real territory-wide index, not a hard-coded stadium');
  assert.ok(snapshot.sourceUrl.includes('gov.hk'));
  assert.ok(Number.isFinite(Date.parse(snapshot.generatedAt)));
  const ids = new Set();
  for (const item of snapshot.places) {
    assert.ok(item.id && !ids.has(item.id)); ids.add(item.id);
    assert.ok(item.nameTc || item.nameEn);
    assert.ok(['Polygon', 'MultiPolygon'].includes(item.geometry?.type));
    assert.ok(item.bbox.length === 4 && item.bbox.every(Number.isFinite));
  }
  const stadium = findNamedPlaces(snapshot.places, { lat: 22.2728794, lng: 114.1886088 });
  assert.ok(stadium.some(({ place, relation }) => relation === 'inside' && /香港大球場|HONG KONG STADIUM/i.test(place.nameTc + ' ' + place.nameEn)), 'HK Stadium central field must match its real enclosing official site');
  assert.ok(snapshot.places.some(p => /大埔運動場|TAI PO SPORTS GROUND/i.test(p.nameTc + ' ' + p.nameEn)), 'Must cover a different named sports ground');
  console.log(`Named-place official snapshot OK: ${snapshot.places.length} polygons; Hong Kong Stadium inclusion, Tai Po site, source, versions.`);
}
console.log('Named-place logic OK: actual polygon inclusion, holes, MultiPolygon, nearby labels/distances, name-first UI and same-origin data only.');
