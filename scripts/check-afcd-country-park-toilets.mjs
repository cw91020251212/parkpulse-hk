import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AFCD_DATASET_ID, AFCD_DATASET_URL, parseAfcdCountryParkToilets } from '../lib/afcd-country-park-toilets.mjs';

const fixture = parseAfcdCountryParkToilets({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [114.1582168747, 22.4120975474] },
      properties: {
        FAC_ID: 'SM/TF/004',
        BARRIER_FREE_FAC: 'Y',
        TYPE_EN: 'Flushing Toilet',
        TYPE_TC: '沖水式廁所',
        COUNTRY_PARK_EN: 'SHING MUN COUNTRY PARK',
        COUNTRY_PARK_TC: '城門郊野公園',
        FACILITY_NAME_EN: 'Toilet (Lead Mine Pass Campsite)',
        FACILITY_NAME_TC: '廁所 (鉛礦坳營地)',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [114.1582168747, 22.4120975474] },
      properties: { FAC_ID: 'SM/TF/004', FACILITY_NAME_TC: '重複記錄' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { FAC_ID: 'outside-hk', FACILITY_NAME_TC: '香港以外' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: { FAC_ID: 'not-a-point', FACILITY_NAME_TC: '不是點位' },
    },
  ],
}, { generatedAt: '2026-10-10T00:00:00.000Z', year: 2026, quarter: 3 });

assert.equal(fixture.length, 1, 'must retain unique official facility IDs and Hong Kong point features only');
assert.deepEqual({
  id: fixture[0].id,
  name: fixture[0].name,
  nameEn: fixture[0].nameEn,
  address: fixture[0].address,
  addressEn: fixture[0].addressEn,
  latitude: fixture[0].latitude,
  longitude: fixture[0].longitude,
  facilityId: fixture[0].facilityId,
  barrierFree: fixture[0].barrierFree,
  kind: fixture[0].kind,
  sourcePeriod: fixture[0].sourcePeriod,
}, {
  id: 'afcd-country-park-SM-TF-004',
  name: '廁所 (鉛礦坳營地)',
  nameEn: 'Toilet (Lead Mine Pass Campsite)',
  address: '城門郊野公園',
  addressEn: 'SHING MUN COUNTRY PARK',
  latitude: 22.4120975474,
  longitude: 114.1582168747,
  facilityId: 'SM/TF/004',
  barrierFree: true,
  kind: 'afcdCountryParkToilet',
  sourcePeriod: '2026-Q3',
});
assert.match(fixture[0].remarks, /沖水式廁所/);
assert.match(fixture[0].remarks, /暢通易達洗手間/);
assert.match(fixture[0].remarksEn, /Flushing Toilet/);
assert.match(fixture[0].remarksEn, /Accessible toilet/);
assert.equal(fixture[0].sourceUrl, AFCD_DATASET_URL);
assert.throws(() => parseAfcdCountryParkToilets({ type: 'FeatureCollection', features: 'invalid' }), /FeatureCollection/);

const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/afcd-country-park-toilets.json', import.meta.url), 'utf8'));
assert.equal(snapshot.sourceUrl, AFCD_DATASET_URL);
assert.equal(snapshot.dataYear, 2026);
assert.equal(snapshot.dataQuarter, 3);
assert.ok(snapshot.records >= 100 && snapshot.facilities.length === snapshot.records);
assert.ok(snapshot.source.includes('漁農自然護理署'));
assert.ok(snapshot.sourceUrl.includes(AFCD_DATASET_ID));
assert.equal(new Set(snapshot.facilities.map((record) => record.id)).size, snapshot.facilities.length);
for (const record of snapshot.facilities) {
  assert.equal(record.kind, 'afcdCountryParkToilet');
  assert.ok(record.facilityId && record.countryPark && record.countryParkEn && record.nameEn);
  assert.ok(record.latitude >= 21.5 && record.latitude <= 23.0);
  assert.ok(record.longitude >= 113.7 && record.longitude <= 114.6);
}
const leadMine = snapshot.facilities.filter((record) => record.facilityId === 'SM/TF/004');
assert.equal(leadMine.length, 1, 'Lead Mine Pass Campsite toilet must appear exactly once');
assert.equal(leadMine[0].name, '廁所 (鉛礦坳營地)');
assert.equal(leadMine[0].nameEn, 'Toilet (Lead Mine Pass Campsite)');
assert.equal(leadMine[0].countryPark, '城門郊野公園');
assert.ok(Math.abs(leadMine[0].latitude - 22.4120975474) < 1e-9);
assert.ok(Math.abs(leadMine[0].longitude - 114.1582168747) < 1e-9);
assert.equal(leadMine[0].barrierFree, true);

const [buildScript, lcsdApi, app, mapView, toiletCard, i18n] = await Promise.all([
  readFile(new URL('../scripts/build-pages-data.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../src/api/lcsdVenues.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ToiletCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/i18n.ts', import.meta.url), 'utf8'),
]);
assert.match(buildScript, /buildAfcdCountryParkToilets/);
assert.match(buildScript, /afcd-country-park-toilets\.json/);
assert.match(lcsdApi, /pages-data\/afcd-country-park-toilets\.json/);
assert.match(app, /afcdCountryParkToilet/);
assert.match(app, /sameToiletAtSamePlace/);
assert.match(app, /distanceInKm[\s\S]*<= 0\.15/);
assert.match(app, /toilet\.distanceKm <= NEARBY_RADIUS_KM/);
assert.match(mapView, /afcdCountryParkWashroom/);
assert.match(toiletCard, /afcdCountryParkWashroom/);
assert.match(i18n, /washroomSources: '食環署 · 康文署 · 漁護署'/);
assert.match(i18n, /washroomSources: 'FEHD · LCSD · AFCD'/);
assert.match(i18n, /漁護署郊野公園公廁/);
assert.match(i18n, /AFCD country-park toilets/);
assert.match(app, /Agriculture, Fisheries and Conservation Department/);
assert.match(app, /漁農自然護理署/);

console.log(`AFCD country-park toilets OK: ${snapshot.records} official facilities; Lead Mine Pass verified once at ${leadMine[0].latitude}, ${leadMine[0].longitude}.`);
