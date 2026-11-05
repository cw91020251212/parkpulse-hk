import assert from 'node:assert/strict';
import { normalizeOfficialBuildingHeight, normalizeOfficialBuildingFeature, normalizeOfficialBuildings } from '../src/domain/officialBuildings.ts';
import { buildOfficialBuildingsUrl, loadOfficialBuildings, OFFICIAL_BUILDINGS_SOURCE_URL } from '../src/api/officialBuildings.ts';

// Verified CSDI HQ record: coordinates and height fields from csdi-building-hq.geojson.
const hq = { type: 'Feature', id: 216947, geometry: { type: 'Polygon', coordinates: [[[114.12329706442277,22.371164378187157],[114.12330675394678,22.371216758488703],[114.12329704370337,22.371218561383788],[114.12279891227473,22.371299670648085],[114.12241244692775,22.371363657949836],[114.12237463443181,22.371222768905245],[114.12238531599374,22.371220063338928],[114.1223669050836,22.371124333485501],[114.12235622387998,22.3711261359974],[114.12233102933155,22.370996990879576],[114.12241259506179,22.370982569471682],[114.1224096881686,22.37096721658634],[114.12250193471165,22.370951895671116],[114.12250484161463,22.370967248554873],[114.12273400130459,22.370929397072313],[114.12273109437726,22.370914044192578],[114.12323116776032,22.370829323560333],[114.12323891878778,22.370872672691739],[114.12326416563604,22.370867262729384],[114.1232816089364,22.370955767737254],[114.12325636172724,22.370962080755536],[114.12329706442277,22.371164378187157]]] }, properties: { OBJECTID: 216947, GeoRefNo: '3070125771', BuildingBlockType: 'Tower', Status: 'Active', BuildingNameEN: 'New Territories South Regional Police Headquarters', BuildingNameTC: '新界南總區警察總部', BaseHeight: 11, TopHeight: 93, Storeys: null } };
const feature = (id, extra = {}) => ({ ...hq, id, properties: { ...hq.properties, OBJECTID: id, ...extra } });
const collection = features => ({ type: 'FeatureCollection', features });
const bounds = { west: 114.12, south: 22.37, east: 114.13, north: 22.38 };
const official = normalizeOfficialBuildingFeature(hq);
assert.equal(official.properties.height, 82, 'Relative block height is 93 - 11, never absolute 93');
assert.equal(official.properties.heightKnown, true);
assert.equal(official.properties.extrusionBase, 0, 'Do not feed mPD as MapLibre base');
assert.equal(official.properties.objectId, 216947);
assert.equal(official.properties.baseHeight, 11);
assert.equal(official.properties.topHeight, 93);
assert.equal(official.properties.GeoRefNo, '3070125771');
assert.equal(official.properties.blockType, 'Tower');
assert.equal(official.properties.nameTc, '新界南總區警察總部');
for (const [base, top] of [[null, 93], [11, null], [null, null], ['11', 93], [11, '93'], [NaN, 93], [11, Infinity], [undefined, 93], [false, 93], [94, 93], [-Number.MAX_VALUE, Number.MAX_VALUE]]) {
  const height = normalizeOfficialBuildingHeight(base, top);
  assert.equal(height.heightKnown, false);
  assert.equal(height.height, 0);
}
assert.equal(normalizeOfficialBuildingHeight(11, 11).heightKnown, true);
assert.equal(normalizeOfficialBuildingHeight(-2, 3).height, 5, 'Negative mPD datum is not itself invalid');
assert.equal(normalizeOfficialBuildingHeight(null, 93).baseHeight, null);
const unknown = normalizeOfficialBuildingFeature(feature(2, { BaseHeight: null, Storeys: 30 }));
assert.equal(unknown.properties.height, 0, 'Storeys must not manufacture a height');
assert.equal(unknown.properties.heightKnown, false);
assert.equal(unknown.geometry.type, 'Polygon');
const podium = normalizeOfficialBuildingFeature(feature(3, { BaseHeight: 11, TopHeight: 25, BuildingBlockType: 'Podium' }));
const tower = normalizeOfficialBuildingFeature(feature(4, { BaseHeight: 25, TopHeight: 93 }));
assert.equal(podium.properties.height, 14);
assert.equal(tower.properties.height, 68);
assert.equal(tower.properties.extrusionBase, 0);
const multi = { ...hq, geometry: { type: 'MultiPolygon', coordinates: [hq.geometry.coordinates] } };
assert.equal(normalizeOfficialBuildingFeature(multi).geometry.type, 'MultiPolygon');
for (const bad of [null, {}, { ...hq, properties: { ...hq.properties, OBJECTID: '216947' } }, feature(5, { Status: 'Demolished' }), { ...hq, geometry: { type: 'Point', coordinates: [114.12, 22.37] } }, { ...hq, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }, { ...hq, geometry: { type: 'Polygon', coordinates: [[[114.12, 22.37], [114.13, 22.37], [114.13, NaN], [114.12, 22.37]]] } }, { ...hq, geometry: { type: 'Polygon', coordinates: [[[114.12, 22.37], [114.13, 22.37], [114.13, 22.38]]] } }]) assert.equal(normalizeOfficialBuildingFeature(bad), null);
const normalized = normalizeOfficialBuildings(collection([hq, unknown && feature(2, { BaseHeight: null }), null]));
assert.equal(normalized.data.features.length, 2);
assert.equal(normalized.missingHeightCount, 1);
assert.equal(normalized.rejectedCount, 1);
assert.throws(() => normalizeOfficialBuildings({ error: { message: 'Failed' } }), /FeatureCollection/);
const url = new URL(buildOfficialBuildingsUrl(bounds, 1000));
assert.equal(url.origin + url.pathname, OFFICIAL_BUILDINGS_SOURCE_URL);
for (const [key, value] of Object.entries({ f: 'geojson', where: "Status='Active'", geometryType: 'esriGeometryEnvelope', inSR: '4326', outSR: '4326', spatialRel: 'esriSpatialRelIntersects', orderByFields: 'OBJECTID ASC', resultOffset: '1000', resultRecordCount: '1000' })) assert.equal(url.searchParams.get(key), value);
assert.deepEqual(JSON.parse(url.searchParams.get('geometry')), { xmin: bounds.west, ymin: bounds.south, xmax: bounds.east, ymax: bounds.north, spatialReference: { wkid: 4326 } });
assert.equal(url.searchParams.has('token'), false);
for (const bad of [{ ...bounds, west: null }, { ...bounds, north: '22.38' }, { ...bounds, east: bounds.west }, { ...bounds, south: NaN }]) assert.throws(() => buildOfficialBuildingsUrl(bad), /envelope/);
assert.throws(() => buildOfficialBuildingsUrl(bounds, -1), /pagination/);

const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
let calls = [];
const mock = handler => {
  calls = [];
  globalThis.fetch = async (input, init) => {
    const requested = new URL(input);
    calls.push({ url: requested, init });
    assert.equal(init.credentials, 'omit');
    assert.equal(init.mode, 'cors');
    assert.ok(init.signal instanceof AbortSignal);
    return handler(requested, init);
  };
};
const ok = body => ({ ok: true, status: 200, json: async () => body });
const pageFeatures = (offset, count) => Array.from({ length: count }, (_, i) => feature(offset + i + 1));
try {
  // Three full pages with NO exceededTransferLimit flag still require a fourth query.
  mock(requested => {
    const offset = Number(requested.searchParams.get('resultOffset'));
    return ok(collection(pageFeatures(offset, offset < 3000 ? 1000 : 7)));
  });
  let result = await loadOfficialBuildings(bounds);
  assert.deepEqual(calls.map(call => Number(call.url.searchParams.get('resultOffset'))), [0, 1000, 2000, 3000]);
  assert.equal(result.sourceCount, 3007);
  assert.equal(result.data.features.length, 3007);
  assert.equal(result.complete, true);

  // A server returning its 3000 cap instead of requested 1000 must advance by actual size.
  mock(requested => {
    const offset = Number(requested.searchParams.get('resultOffset'));
    return ok({ ...collection(pageFeatures(offset, offset < 6000 ? 3000 : 0)), exceededTransferLimit: offset < 6000 });
  });
  result = await loadOfficialBuildings(bounds);
  assert.deepEqual(calls.map(call => Number(call.url.searchParams.get('resultOffset'))), [0, 3000, 6000]);
  assert.equal(result.sourceCount, 6000);
  assert.equal(result.complete, true);

  mock(requested => ok(collection(pageFeatures(Number(requested.searchParams.get('resultOffset')), 1000))));
  result = await loadOfficialBuildings(bounds, { maxFeatures: 3000 });
  assert.equal(calls.length, 3);
  assert.equal(result.sourceCount, 3000);
  assert.equal(result.complete, false);
  result = await loadOfficialBuildings(bounds);
  assert.equal(result.sourceCount, 10000);
  assert.equal(result.complete, false);

  mock(() => ok(collection(pageFeatures(0, 3000))));
  result = await loadOfficialBuildings(bounds, { maxFeatures: 1001 });
  assert.equal(result.sourceCount, 1001);
  assert.equal(result.queriedCount, 3000);
  assert.equal(result.complete, false);
  assert.equal(calls.length, 1);

  mock(() => ok(collection([])));
  result = await loadOfficialBuildings(bounds);
  assert.equal(result.complete, true);
  assert.equal(result.sourceCount, 0);
  assert.equal(calls.length, 1, 'Successful empty query needs no retry');
  mock(() => ok({ ...collection([]), exceededTransferLimit: true }));
  assert.equal((await loadOfficialBuildings(bounds)).complete, false);
  assert.equal(calls.length, 1);
  mock(requested => ok({ ...collection(pageFeatures(Number(requested.searchParams.get('resultOffset')), 1)), exceededTransferLimit: true }));
  result = await loadOfficialBuildings(bounds);
  assert.equal(result.complete, false, 'Pathological short-page truncation must be bounded');
  assert.equal(result.sourceCount, 32);
  assert.equal(calls.length, 32);
  mock(() => ok(collection([hq, feature(2, { BaseHeight: null }), null])));
  result = await loadOfficialBuildings(bounds);
  assert.equal(result.sourceCount, 2);
  assert.equal(result.queriedCount, 3);
  assert.equal(result.missingHeightCount, 1);
  assert.equal(result.rejectedCount, 1);
  assert.equal(result.complete, false);

  for (const response of [{ ok: false, status: 503 }, ok({ error: { code: 500 } }), ok({ type: 'FeatureCollection' }), ok({})]) {
    mock(() => response);
    await assert.rejects(loadOfficialBuildings(bounds));
    assert.equal(calls.length, 1, 'Never blindly retry failed/error/malformed responses');
  }
  mock(() => ok(collection([hq])));
  const early = new AbortController();
  early.abort();
  await assert.rejects(loadOfficialBuildings(bounds, { signal: early.signal }), { name: 'AbortError' });
  assert.equal(calls.length, 0);

  const between = new AbortController();
  mock(() => ({ ok: true, status: 200, json: async () => { between.abort(); return collection(pageFeatures(0, 1000)); } }));
  await assert.rejects(loadOfficialBuildings(bounds, { signal: between.signal }), { name: 'AbortError' });
  assert.equal(calls.length, 1);

  const during = new AbortController();
  mock((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })));
  const pending = loadOfficialBuildings(bounds, { signal: during.signal });
  during.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls.length, 1);

  // Advance only the module's 15s timeout: no real 15-second delay and no actual network.
  globalThis.setTimeout = (callback, ms, ...args) => originalSetTimeout(callback, ms === 15000 ? 0 : ms, ...args);
  await assert.rejects(loadOfficialBuildings(bounds), { name: 'TimeoutError' });
  globalThis.setTimeout = originalSetTimeout;
  await assert.rejects(loadOfficialBuildings(bounds, { maxFeatures: '3000' }), /maxFeatures/);
  await assert.rejects(loadOfficialBuildings(bounds, { maxFeatures: null }), /maxFeatures/);
  await assert.rejects(loadOfficialBuildings(bounds, { maxFeatures: 10001 }), /maxFeatures/);

  // Failed/aborted requests are not memoized: a later request can succeed independently.
  mock(() => ok(collection([hq])));
  assert.equal((await loadOfficialBuildings(bounds)).data.features[0].properties.height, 82);
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
}
console.log('Official building data OK: HQ 82m relative mPD height, strict null/string validation, WGS84 footprints, podium/tower metadata, keyless paginated envelopes, 3000/server and 10000/client caps, unknown heights, errors, empty results, aborts and 15s timeout.');
