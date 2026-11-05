import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getLandsD3DConfig, attachLandsDScene, LANDSD_PHOTOREAL_URL, CESIUM_VERSION } from '../src/api/landsd3d.ts';
import { zoomToRange, rangeToZoom, sceneQuality } from '../src/domain/scene3d.ts';

for (const zoom of [8, 14, 15.75, 17.3, 21.8]) for (const height of [320, 648, 900]) {
  const range = zoomToRange(zoom, 22.37106, height, 0.7);
  assert.ok(Math.abs(rangeToZoom(range, 22.37106, height, 0.7) - zoom) < 1e-10);
  const expectedLeafletScale = 2 * Math.PI * 6378137 * Math.cos(22.37106 * Math.PI / 180) / (256 * 2 ** zoom);
  assert.ok(Math.abs(range * 2 * Math.tan(0.7 / 2) / height - expectedLeafletScale) < 1e-9);
}
assert.ok(sceneQuality(2, 4).finalError < sceneQuality(2, 4).previewError);
assert.ok(sceneQuality(8, 8).finalError < sceneQuality(8, 8).intermediateError);
assert.ok(sceneQuality(2, 4).cacheBytes < sceneQuality(8, 8).cacheBytes);
assert.equal(getLandsD3DConfig({}).urls[0], LANDSD_PHOTOREAL_URL);
assert.equal(getLandsD3DConfig({}).apiKey, undefined);
assert.equal(getLandsD3DConfig({ VITE_LANDSD_3D_URL: 'http://invalid.example/tileset.json' }), null);
assert.equal(getLandsD3DConfig({ VITE_LANDSD_3D_URL: 'https://username:password@example.com/tileset.json' }), null);
const ownerConfig = getLandsD3DConfig({ VITE_LANDSD_3D_API_KEY: 'fixture-owner-key' });
assert.equal(ownerConfig.apiKey, 'fixture-owner-key');

class Event {
  listeners = new Set();
  addEventListener(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  fire(...values) { for (const fn of this.listeners) fn(...values); }
}
class Model {
  tileVisible = new Event(); tileFailed = new Event(); loadProgress = new Event();
  destroyed = false; maximumScreenSpaceError = 16; tilesLoaded = true;
  destroy() { this.destroyed = true; } isDestroyed() { return this.destroyed; }
}
const timers = new Map(); let nextTimer = 0;
globalThis.window = { setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); } };
Object.defineProperty(globalThis, 'navigator', { value: { deviceMemory: 8, hardwareConcurrency: 8 }, configurable: true });
const held = new Set(); const requests = []; let renderRequests = 0;
const viewer = { isDestroyed: () => false, scene: { postUpdate: new Event(), postRender: new Event(), requestRender() { renderRequests++; }, primitives: { add(m) { held.add(m); }, contains: m => held.has(m), remove(m) { held.delete(m); m.destroy(); } } } };
const model = new Model();
const SDK = { Resource: class { constructor(options) { requests.push(options); } }, Cesium3DTileset: { fromUrl: async () => model } };
const states = []; const controller = new AbortController();
const dispose = await attachLandsDScene(SDK, viewer, ownerConfig, state => states.push(state), controller.signal);
assert.ok(held.has(model)); assert.equal(states.at(-1).phase, 'loading');
assert.deepEqual(requests[0].queryParameters, { key: 'fixture-owner-key' });
model.tileVisible.fire({ content: { geometryByteLength: 100, trianglesLength: 8, pointsLength: 0 } });
assert.equal(states.at(-1).phase, 'preview');
const [intermediateId, intermediate] = [...timers][0];
timers.delete(intermediateId); intermediate();
assert.equal(model.maximumScreenSpaceError, 8);
model.tilesLoaded = false;
for (const [id, fn] of [...timers]) { timers.delete(id); fn(); }
assert.equal(model.maximumScreenSpaceError, 4, 'Fine centre requests must not wait for distant intermediate tiles');
model.tilesLoaded = true;
// No allTilesLoaded/download event: detail was already in memory.
viewer.scene.postRender.fire(); assert.equal(model.maximumScreenSpaceError, 4);
viewer.scene.postRender.fire(); assert.equal(states.at(-1).phase, 'ready');
const count = states.length;
for (let i = 0; i < 20; i++) viewer.scene.postRender.fire();
assert.equal(states.length, count, 'Steady ready state must not trigger a render/state-update loop');
model.loadProgress.fire(2, 1); assert.equal(states.at(-1).pending, 3); assert.equal(states.at(-1).phase, 'refining');
model.loadProgress.fire(0, 0); assert.equal(states.at(-1).phase, 'ready');
model.tileFailed.fire({}); assert.equal(states.at(-1).phase, 'ready', 'One missing fine tile must not discard a usable preview');
assert.ok(renderRequests >= 3);
dispose(); assert.ok(model.destroyed); assert.equal(held.size, 0); assert.equal(model.tileVisible.listeners.size, 0); assert.equal(viewer.scene.postRender.listeners.size, 0);
const aborted = new AbortController(); let release;
const lateModel = new Model(); const lateStates = [];
const late = attachLandsDScene({ ...SDK, Cesium3DTileset: { fromUrl: () => new Promise(resolve => release = resolve) } }, viewer, getLandsD3DConfig({}), s => lateStates.push(s), aborted.signal);
aborted.abort(); release(lateModel); await late;
assert.ok(lateModel.destroyed); assert.equal(held.size, 0); assert.equal(lateStates.length, 1);
const errors = [];
await assert.rejects(() => attachLandsDScene({ ...SDK, Cesium3DTileset: { fromUrl: async () => { throw Error('fixture root failed'); } } }, viewer, getLandsD3DConfig({}), s => errors.push(s), new AbortController().signal));
assert.equal(errors.at(-1).phase, 'error');
const unusable = new Model(); const missing = [];
await attachLandsDScene({ ...SDK, Cesium3DTileset: { fromUrl: async () => unusable } }, viewer, getLandsD3DConfig({}), s => missing.push(s), new AbortController().signal);
unusable.tileFailed.fire({}); assert.notEqual(missing.at(-1).phase, 'error');
for (const fn of [...timers.values()]) fn();
assert.equal(missing.at(-1).phase, 'error'); assert.ok(unusable.destroyed); assert.equal(held.size, 0);

const app = readFileSync('src/App.tsx', 'utf8');
const map = readFileSync('src/components/MapView.tsx', 'utf8');
const link = readFileSync('src/components/Official3DLink.tsx', 'utf8');
const scene = readFileSync('src/components/CesiumView.tsx', 'utf8');
const capture = scene.slice(scene.indexOf('const viewport ='), scene.indexOf('const focus ='));
assert.match(capture, /camera\.pickEllipsoid/);
assert.doesNotMatch(capture, /globe\.pick/);
assert.match(app, /useState<MapMode>\('2d'\)/);
assert.match(map, /<CesiumView/); assert.match(map, /<MapContainer/);
assert.match(map, /markers=\{markers3d\}/); assert.match(map, /onError=\{on3dError\}/);
assert.match(link, /backTo2d \? '2D' : '3D'/);
assert.doesNotMatch(link, /href=|target="_blank"/);
for (const file of ['Cesium.js', 'Widgets/widgets.css', 'Workers', 'ThirdParty', 'Assets']) {
  assert.ok(existsSync(`public/vendor/cesium/${CESIUM_VERSION}/${file}`), `Standalone SDK missing ${file}`);
}
console.log('Photoreal 3D OK: default 2D + same 3D button, Leaflet scale, cached staged LOD without download events, bounded cache, no idle render loop, optional owner key, abort/root/content failure and standalone SDK.');
