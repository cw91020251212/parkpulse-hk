import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, 'public/manifest.webmanifest'), 'utf8'));
assert.equal(manifest.name, '泊邊度｜ParkPulse HK');
assert.equal(manifest.short_name, '泊邊度');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512']);

for (const size of [192, 512]) {
  const icon = await readFile(path.join(root, `public/parkpulse-hk-icon-${size}.png`));
  assert.ok(icon.length > 1_000, `${size}px icon should exist`);
}

const worker = await readFile(path.join(root, 'public/sw.js'), 'utf8');
assert.match(worker, /self\.addEventListener\('install'/);
assert.match(worker, /url\.origin !== self\.location\.origin/);
assert.match(worker, /pages-data/);
const html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
assert.match(html, /\/parkpulse-hk\/manifest\.webmanifest/);
assert.match(html, /\/parkpulse-hk\/parkpulse-hk-icon-192\.png/);
console.log('Verified PWA manifest, icons, service worker and GitHub Pages paths');
