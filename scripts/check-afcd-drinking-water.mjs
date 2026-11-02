import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  AFCD_WATER_SOURCE_URL, AFCD_WATER_SOURCE_EN_URL, AFCD_WATER_DATASET_ID,
  AFCD_WATER_DATASET_URL, AFCD_WATER_FILE_LIST_URL, latestAfcdWaterGeoJsonFile,
  parseAfcdWaterFillingPage, parseAfcdDrinkingWater,
} from '../lib/afcd-drinking-water.mjs';

const snapshot = JSON.parse(await readFile(new URL('../public/pages-data/afcd-drinking-water.json', import.meta.url), 'utf8'));
assert.equal(snapshot.sourceUrl, AFCD_WATER_SOURCE_URL);
assert.equal(snapshot.sourceEnUrl, AFCD_WATER_SOURCE_EN_URL);
assert.ok(snapshot.source['zh-Hant'].includes('漁農自然護理署'));
assert.ok(snapshot.source.en.includes('AFCD'));
assert.ok(Number.isFinite(Date.parse(snapshot.generatedAt)));
// This snapshot uses the fresh original HTML, not the stale 2026/09/22 text extraction.
assert.equal(snapshot.sourceUpdatedAt, '2026-10-29');
assert.equal(snapshot.coordinateSource.datasetId, AFCD_WATER_DATASET_ID);
assert.equal(snapshot.coordinateSource.datasetUrl, AFCD_WATER_DATASET_URL);
assert.equal(snapshot.coordinateSource.fileListUrl, AFCD_WATER_FILE_LIST_URL);
assert.equal(snapshot.coordinateSource.year, 2026);
assert.equal(snapshot.coordinateSource.quarter, 2);
assert.equal(snapshot.coordinateSource.featureCount, 37);
assert.equal(new URL(snapshot.coordinateSource.downloadUrl).hostname, 'static.csdi.gov.hk');
for (const hash of [snapshot.coordinateSource.archiveSha256, snapshot.coordinateSource.geoJsonSha256,
  snapshot.sourceEvidence.tcPageSha256, snapshot.sourceEvidence.enPageSha256]) assert.match(hash, /^[a-f\d]{64}$/);
assert.equal(snapshot.records.length, 37);
assert.equal(new Set(snapshot.records.map((record) => record.id)).size, 37);

const contract = ['id', 'provider', 'nameTc', 'nameEn', 'addressTc', 'addressEn', 'latitude', 'longitude',
  'locationTc', 'locationEn', 'typeTc', 'typeEn', 'unitCount', 'indoorOutdoor', 'serviceHoursTc',
  'serviceHoursEn', 'temperatureTc', 'temperatureEn', 'remarksTc', 'remarksEn', 'sourceUrl',
  'coordinateSourceUrl', 'officialMapUrl', 'filterStatus', 'accessTc', 'accessEn', 'temporaryClosed'];
for (const record of snapshot.records) {
  assert.deepEqual(Object.keys(record).sort(), [...contract].sort());
  assert.match(record.id, /^afcd-water-[a-z\d-]+$/);
  assert.equal(record.provider, 'afcd');
  assert.ok(record.nameTc && record.nameEn && record.locationTc && record.locationEn);
  assert.equal(record.addressTc, record.locationTc, 'do not invent a postal address');
  assert.equal(record.addressEn, record.locationEn);
  assert.ok(record.latitude >= 22.13 && record.latitude <= 22.57);
  assert.ok(record.longitude >= 113.8 && record.longitude <= 114.5);
  assert.equal(record.sourceUrl, AFCD_WATER_SOURCE_URL);
  assert.equal(record.coordinateSourceUrl, snapshot.coordinateSource.downloadUrl);
  assert.equal(new URL(record.officialMapUrl).hostname, 'www.afcd.gov.hk');
  assert.match(new URL(record.officialMapUrl).pathname, /\.(png|jpg)$/i);
  assert.equal(new URL(record.officialMapUrl).protocol, 'https:');
  assert.equal(record.filterStatus, 'confirmed', 'official maintenance policy includes filter replacement');
  assert.equal(record.unitCount, null, 'one point must not be interpreted as a published machine count');
  assert.equal(record.indoorOutdoor, 'outdoor');
  assert.equal(record.typeTc, '加水站');
  assert.equal(record.typeEn, 'water filling station');
  assert.equal(record.temperatureTc, '環境溫度', 'preserve published ambient temperature; do not invent hot/cold water');
  assert.equal(record.temperatureEn, 'Ambient temperature');
  assert.match(record.remarksTc, /2026-Q2/);
  assert.match(record.remarksEn, /not field-verified exact outlet positions/);
  assert.equal(typeof record.temporaryClosed, 'boolean');
  if (record.temporaryClosed) {
    assert.equal(record.serviceHoursTc, '暫時關閉');
    assert.equal(record.serviceHoursEn, 'Temporarily Closed');
    assert.ok(record.remarksTc.includes('[暫時關閉]'));
    assert.ok(record.remarksEn.includes('[Temporarily Closed]'));
    assert.equal(record.accessTc, '[暫時關閉]');
  } else {
    // These hours ARE published by CSDI. Missing hours in fixtures below stay blank.
    assert.equal(record.serviceHoursTc, '0:00 - 24:00');
    assert.equal(record.serviceHoursEn, '0:00 - 24:00');
  }
}
const closedIds = snapshot.records.filter((record) => record.temporaryClosed).map((record) => record.id).sort();
assert.deepEqual(closedIds, ['afcd-water-abd-ws-001', 'afcd-water-skw-ws-004', 'afcd-water-tt-ws-002']);
const wanTsai = snapshot.records.filter((record) => record.nameTc.startsWith('灣仔南營地廁所'));
assert.equal(wanTsai.length, 2, 'keep the separate published toilet (1)/(2) water points');
assert.notEqual(wanTsai[0].longitude, wanTsai[1].longitude);
const first = snapshot.records.find((record) => record.id === 'afcd-water-lr-ws-002');
assert.equal(first.latitude, 22.3479802233, 'retain full official latitude precision');
assert.equal(first.longitude, 114.1536820838, 'retain full official longitude precision');

const tcHtml = `<div class="myUpdate">2026/10/29</div>
<p>本署會定期進行加水站的保養工作，包括更換濾心、水質檢查。</p><table>
<tr><td>1</td><td><p>大 潭 篤 水 塘 <a href="files/map.png"><img alt="location map"></a> [暫時關閉]</p></td></tr>
</table>`;
const enHtml = `<div class="myUpdate">2026/10/29</div>
<p>We carry out regular maintenance, replacement of filters, water quality testing.</p><table>
<tr><td>1</td><td><p>Tai Tam Tuk Reservoir <a href="files/map.png"><img alt="location map"></a> [Temporarily Closed]</p></td></tr>
</table>`;
const tc = parseAfcdWaterFillingPage(tcHtml);
const en = parseAfcdWaterFillingPage(enHtml, { language: 'en', sourceUrl: AFCD_WATER_SOURCE_EN_URL });
assert.equal(tc.stations[0].name, '大潭篤水塘');
assert.equal(tc.updatedAt, '2026-10-29');
assert.equal(tc.hasFilterMaintenance, true);
assert.equal(en.hasFilterMaintenance, true);
const geojson = { type: 'FeatureCollection', features: [{ type: 'Feature',
  geometry: { type: 'Point', coordinates: [114.2209049335, 22.2402405763] },
  properties: { FAC_ID: 'TT/WS/002', FACILITY_NAME_TC: '大潭篤水塘加水站',
    FACILITY_NAME_EN: 'Tai Tam Tuk Reservoir Water Filling Station',
    LOCATION_TC: '大潭道及大潭水塘道交界涼亭', LOCATION_EN: 'Shelter at the junction of Tai Tam Road and Tai Tam Reservoir Road' },
}] };
const options = { coordinateSourceUrl: snapshot.coordinateSource.downloadUrl, year: 2026, quarter: 2 };
const fixture = parseAfcdDrinkingWater(geojson, tc, en, options).records[0];
assert.equal(fixture.latitude, 22.2402405763);
assert.equal(fixture.longitude, 114.2209049335);
assert.equal(fixture.temporaryClosed, true);
assert.equal(fixture.temperatureTc, '');
assert.equal(fixture.temperatureEn, '');
assert.equal(fixture.indoorOutdoor, 'unknown');
const openTc = structuredClone(tc);
const openEn = structuredClone(en);
openTc.stations[0].temporaryClosed = false;
openEn.stations[0].temporaryClosed = false;
openTc.hasFilterMaintenance = false;
const missing = parseAfcdDrinkingWater(geojson, openTc, openEn, options).records[0];
assert.equal(missing.serviceHoursTc, '', 'missing service hours must not default to 24 hours');
assert.equal(missing.serviceHoursEn, '');
assert.equal(missing.temperatureTc, '', 'missing water temperature stays unpublished');
assert.equal(missing.unitCount, null);
assert.equal(missing.filterStatus, 'notPublished');
assert.throws(() => parseAfcdDrinkingWater(geojson, openTc, en, options), /closure mismatch/);
const invalid = structuredClone(geojson);
invalid.features[0].geometry.coordinates = [0, 0];
assert.throws(() => parseAfcdDrinkingWater(invalid, tc, en, options), /Invalid official Hong Kong point/);
invalid.features[0].geometry = geojson.features[0].geometry;
invalid.features[0].properties.FACILITY_NAME_EN = 'Another place';
assert.throws(() => parseAfcdDrinkingWater(invalid, tc, en, options), /unique bilingual CSDI match/);
assert.throws(() => parseAfcdDrinkingWater({ type: 'FeatureCollection', features: [] }, tc, en, options), /point count/);
assert.throws(() => parseAfcdDrinkingWater(geojson, tc, en, { ...options, coordinateSourceUrl: 'https://opendata.esrichina.hk/unofficial' }), /Untrusted/);
assert.throws(() => parseAfcdWaterFillingPage(tcHtml.replace('files/map.png', 'https://example.org/map.png')), /Untrusted/);

const index = { archivedDatasetFileFormatListVO: { convertedFormat: [{ fileType: 'GEOJSON', pos: 1 }] },
  archivedDatasetVersionList: [
    { year: 2022, quarter: 4, fileList: [{ pos: 1, sourceFormat: false, url: 'https://static.csdi.gov.hk/old' }] },
    { year: 2026, quarter: 2, fileList: [{ pos: 1, sourceFormat: false, url: snapshot.coordinateSource.downloadUrl }] },
  ] };
assert.equal(latestAfcdWaterGeoJsonFile(index).year, 2026);
assert.equal(latestAfcdWaterGeoJsonFile(index).quarter, 2);
index.archivedDatasetVersionList.push({ year: 2026, quarter: 3, fileList: [] });
assert.throws(() => latestAfcdWaterGeoJsonFile(index), /Latest CSDI/, 'must not silently fall back to an older quarter');

// Optional independent byte-for-byte proof against the actual downloaded official evidence:
// node scripts/check-afcd-drinking-water.mjs --evidence-dir=/tmp/afcd-water-evidence
const evidenceArg = process.argv.find((arg) => arg.startsWith('--evidence-dir='));
if (evidenceArg) {
  const directory = path.resolve(evidenceArg.slice('--evidence-dir='.length));
  const bytes = await readFile(path.join(directory, '2026-q2.geojson'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), snapshot.coordinateSource.geoJsonSha256);
  const evidence = JSON.parse(bytes);
  assert.equal(evidence.features.length, 37);
  for (const record of snapshot.records) {
    const point = evidence.features.find((feature) => `afcd-water-${feature.properties.FAC_ID.toLowerCase().replaceAll('/', '-')}` === record.id);
    assert.ok(point, `Missing actual official feature: ${record.id}`);
    assert.equal(record.longitude, point.geometry.coordinates[0]);
    assert.equal(record.latitude, point.geometry.coordinates[1]);
    assert.equal(record.temperatureTc, point.properties.WATER_TEMPERATURE_TC);
    assert.equal(record.temperatureEn, point.properties.WATER_TEMPERATURE_EN);
    assert.equal(record.locationTc, point.properties.LOCATION_TC);
    assert.equal(record.locationEn, point.properties.LOCATION_EN);
    if (!record.temporaryClosed) assert.equal(record.serviceHoursTc, point.properties.SERVICE_HOUR);
  }
  for (const [language, filename, hash] of [
    ['zh-Hant', 'official-tc.html', snapshot.sourceEvidence.tcPageSha256],
    ['en', 'official-en.html', snapshot.sourceEvidence.enPageSha256],
  ]) {
    const html = await readFile(path.join(directory, filename), 'utf8');
    assert.equal(createHash('sha256').update(html).digest('hex'), hash);
    const page = parseAfcdWaterFillingPage(html, { language, sourceUrl: language === 'en' ? AFCD_WATER_SOURCE_EN_URL : AFCD_WATER_SOURCE_URL });
    assert.equal(page.updatedAt, snapshot.sourceUpdatedAt);
    assert.equal(page.stations.length, snapshot.records.length);
    page.stations.forEach((station, i) => {
      assert.equal(station.name, language === 'en' ? snapshot.records[i].nameEn : snapshot.records[i].nameTc);
      assert.equal(station.temporaryClosed, snapshot.records[i].temporaryClosed);
    });
  }
  console.log('Downloaded official GeoJSON and bilingual HTML hashes, names, all coordinates and status evidence verified.');
}
console.log(`AFCD drinking water OK: ${snapshot.records.length} official CSDI points, ${closedIds.length} temporary closures; website ${snapshot.sourceUpdatedAt}, coordinates 2026-Q2.`);
