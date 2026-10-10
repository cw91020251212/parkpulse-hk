import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasHumanToilet, parseLcsdCoordinate, parseLcsdParkWashrooms } from '../lib/lcsd-park-washrooms.mjs';

assert.equal(parseLcsdCoordinate('22-27-13'), 22 + 27 / 60 + 13 / 3600);
assert.equal(parseLcsdCoordinate('114-9-33'), 114 + 9 / 60 + 33 / 3600);
assert.equal(parseLcsdCoordinate('22.453611'), 22.453611);
assert.equal(parseLcsdCoordinate('22-70-13'), undefined);
assert.equal(hasHumanToilet({ Ancillary_facilities_cn: '寵物廁所、狗公園', Ancillary_facilities_en: 'Pet latrine' }), false);
assert.equal(hasHumanToilet({ Ancillary_facilities_cn: '男、女洗手間', Ancillary_facilities_en: "Men's and ladies' toilets" }), true);

const fixture = [
  {
    datasetId: 'hk-lcsd-facility-facility-hssp7',
    url: 'https://www.lcsd.gov.hk/datagovhk/facility/facility-hssp7.json',
    records: [
      {
        GIHS: 'test-park-1',
        Name_cn: '測試遊樂場',
        Name_en: 'Sample Playground',
        Address_cn: '測試道 1 號',
        Address_en: '1 Test Road',
        District_cn: '大埔區',
        Opening_hours_cn: '每日 24 小時',
        Latitude: '22-27-13',
        Longitude: '114-9-33',
        Ancillary_facilities_cn: '<ul><li>男、女洗手間</li><li>暢通易達洗手間</li></ul>',
        Ancillary_facilities_en: '<li>Men and ladies toilets</li><li>Accessible toilet</li>',
      },
      {
        GIHS: 'test-park-1',
        Name_cn: '測試遊樂場',
        Name_en: 'Sample Playground',
        Latitude: '22-27-13',
        Longitude: '114-9-33',
        Ancillary_facilities_cn: '無障礙設施：暢通易達洗手間',
      },
      {
        GIHS: 'pet-park',
        Name_cn: '狗狗公園',
        Name_en: 'Dog Garden',
        Latitude: '22-27-13',
        Longitude: '114-9-33',
        Ancillary_facilities_cn: '寵物廁所',
        Ancillary_facilities_en: 'Pet latrine',
      },
      {
        GIHS: 'indoor-centre',
        Name_cn: '大埔體育館',
        Name_en: 'Tai Po Sports Centre',
        Latitude: '22-27-13',
        Longitude: '114-9-33',
        Ancillary_facilities_cn: '男、女洗手間',
      },
    ],
  },
];

const fixtureRecords = parseLcsdParkWashrooms(fixture, { generatedAt: '2026-10-10T00:00:00.000Z' });
assert.equal(fixtureRecords.length, 1, 'same park must collapse by official GIHS; pet-only and indoor venues must be excluded');
assert.equal(fixtureRecords[0].id, 'lcsd-park-test-park-1');
assert.equal(fixtureRecords[0].kind, 'lcsdParkToilet');
assert.equal(fixtureRecords[0].nameEn, 'Sample Playground');
assert.match(fixtureRecords[0].remarks, /暢通易達洗手間/);
assert.match(fixtureRecords[0].remarksEn, /Accessible toilet/);
assert.equal(fixtureRecords[0].sourceUrl, fixture[0].url);

const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/lcsd-park-washrooms.json', import.meta.url), 'utf8'));
assert.ok(snapshot.datasetsInspected >= 40, 'must inspect the official LCSD facility catalog');
assert.ok(snapshot.datasetsLoaded >= 35, 'must load enough official LCSD facility files');
assert.ok(Array.isArray(snapshot.facilities) && snapshot.facilities.length >= 250, 'must retain a broad, non-empty official snapshot');
assert.equal(new Set(snapshot.facilities.map((record) => record.id)).size, snapshot.facilities.length, 'snapshot IDs must be unique');
for (const record of snapshot.facilities) {
  assert.equal(record.kind, 'lcsdParkToilet');
  assert.ok(record.name && record.nameEn && record.sourceUrl);
  assert.ok(record.latitude >= 21.5 && record.latitude <= 23.0);
  assert.ok(record.longitude >= 113.7 && record.longitude <= 114.6);
}

const taiPoTau = snapshot.facilities.filter((record) => record.name === '大埔頭遊樂場');
assert.equal(taiPoTau.length, 1, 'Tai Po Tau Playground must appear once after facility-category deduplication');
assert.ok(Math.abs(taiPoTau[0].latitude - (22 + 27 / 60 + 13 / 3600)) < 1e-8);
assert.ok(Math.abs(taiPoTau[0].longitude - (114 + 9 / 60 + 33 / 3600)) < 1e-8);
assert.equal(taiPoTau[0].address, '大埔大埔頭徑');
assert.equal(taiPoTau[0].addressEn, 'Tai Po Tai Po Tau Drive');
assert.equal(taiPoTau[0].openingHours, '每日上午7時至晚上11時');
assert.equal(taiPoTau[0].openingHoursEn, '7:00 am - 11:00 pm daily');
assert.match(taiPoTau[0].remarks, /男、女洗手間/);
assert.match(taiPoTau[0].remarks, /暢通易達洗手間/);
assert.match(taiPoTau[0].remarksEn, /Accessible Toilet/i);
assert.ok(taiPoTau[0].sourceUrl.includes('facility-'));

const [lcsdApi, app, mapView, toiletCard] = await Promise.all([
  readFile(new URL('../src/api/lcsdVenues.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ToiletCard.tsx', import.meta.url), 'utf8'),
]);
assert.match(lcsdApi, /pages-data\/lcsd-park-washrooms\.json/);
assert.ok(app.includes('toilet.distanceKm <= NEARBY_RADIUS_KM'), 'park washrooms must use the existing 2 km result filter');
assert.ok(mapView.includes("kind === 'lcsdParkToilet'") && mapView.includes('lcsdParkWashroom'));
assert.ok(toiletCard.includes("toilet.kind === 'lcsdParkToilet'") && toiletCard.includes('lcsdParkWashroom'));

console.log(`LCSD park washrooms OK: ${snapshot.facilities.length} unique outdoor venues; Tai Po Tau Playground verified once.`);
