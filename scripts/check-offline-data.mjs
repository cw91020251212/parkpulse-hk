import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import { OFFLINE_DATA_CACHE_NAME, OFFLINE_DATASETS } from '../src/domain/offlineData.ts';

const root = new URL('../', import.meta.url);
const app = await readFile(new URL('src/App.tsx', root), 'utf8');
const worker = await readFile(new URL('public/sw.js', root), 'utf8');
assert.match(app, /useState<MapMode>\(initial3dReturn \? '3d' : '2d'\)/, 'ordinary startup should default to 2D while restoring an explicit 3D return');
assert.match(app, /<OfflineDataDialog language=\{language\}/, 'offline data manager should be reachable from the app');
assert.match(worker, new RegExp(OFFLINE_DATA_CACHE_NAME), 'service worker should preserve the explicit offline data cache');
assert.match(worker, /key !== OFFLINE_DATA_CACHE_NAME/, 'activating a new worker must keep downloaded user data');
assert.equal(OFFLINE_DATASETS.length, 5, 'expected the supported offline categories');
for (const dataset of OFFLINE_DATASETS) {
  assert.ok(dataset.files.length > 0, `${dataset.id} should contain files`);
  for (const file of dataset.files) {
    const path = new URL(`public/${file}`, root);
    await access(path);
    const details = await stat(path);
    assert.ok(details.size > 0, `${file} should not be empty`);
  }
}
console.log(`Verified 2D startup, preserved 3D return, and ${OFFLINE_DATASETS.length} offline data categories (${OFFLINE_DATASETS.reduce((count, item) => count + item.files.length, 0)} files).`);
