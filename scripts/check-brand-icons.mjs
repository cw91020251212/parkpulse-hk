import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const config = JSON.parse(await readFile(path.join(root, 'src/data/brand-icons.json'), 'utf8'));
const readRecords = async (file) => (JSON.parse(await readFile(path.join(root, 'public/pages-data', file), 'utf8')).records ?? []);
const [fuel, atms] = await Promise.all([readRecords('fuel-stations.json'), readRecords('atms.json')]);
const requirements = [['fuel', fuel], ['atm', atms]];
const expected = [];
for (const [kind, records] of requirements) {
  const brands = [...new Set(records.map((record) => record.brand).filter(Boolean))];
  const missing = brands.filter((brand) => !config[kind][brand]);
  assert.deepEqual(missing, [], `${kind} brand mapping is missing: ${missing.join(', ')}`);
  expected.push(...brands.map((brand) => ({ kind, brand, ...config[kind][brand] })));
}
const ids = new Set(expected.map((item) => item.id));
assert.equal(ids.size, expected.length, 'Every current facility brand needs its own icon snapshot');
for (const { id } of expected) {
  const file = path.join(root, 'public/brand-icons', `${id}.png`);
  await access(file);
  assert.ok((await stat(file)).size >= 100, `Brand icon is empty: ${id}`);
}
const manifest = JSON.parse(await readFile(path.join(root, 'public/brand-icons/manifest.json'), 'utf8'));
assert.equal(Object.keys(manifest.records).length, expected.length, 'Brand icon manifest should cover all mapped brands');
console.log(`Verified ${fuel.length} fuel stations across ${Object.keys(config.fuel).length} brands and ${atms.length} ATMs across ${Object.keys(config.atm).length} banks with ${expected.length} local brand icons`);
