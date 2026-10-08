import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'public/pages-data/verified-place-links.json');
const baseUrl = process.env.PARKSPOT_BASE_URL ?? 'http://127.0.0.1:3000';
const concurrency = Math.max(1, Number(process.env.PARKSPOT_PLACE_CONCURRENCY ?? 4));
const limit = Number(process.env.PARKSPOT_MAX_PLACE_LINKS ?? 0);

const carparkPayload = JSON.parse(await readFile(path.join(root, 'public/carpark-info.json'), 'utf8'));
const carparks = (Array.isArray(carparkPayload) ? carparkPayload : carparkPayload.results ?? carparkPayload.records ?? []).map((record) => ({ key: `carpark:${record.park_Id}`, kind: 'carpark', id: record.park_Id, name: record.name, address: record.displayAddress ?? record.address ?? '', latitude: record.latitude, longitude: record.longitude }));
const activeKeys = new Set([...carparks.map((target) => target.key), ...(existsSync(outputPath) ? JSON.parse(await readFile(outputPath, 'utf8')).records?.map((record) => record.key) ?? [] : [])]);
const previous = existsSync(outputPath) ? JSON.parse(await readFile(outputPath, 'utf8')) : { records: [] };
const links = new Map((previous.records ?? []).filter((record) => activeKeys.has(record.key)).map((record) => [record.key, { ...record, hasPhoto: record.hasPhoto ?? true }]));
const pending = carparks.filter((target) => !links.get(target.key)?.rating).slice(0, limit > 0 ? limit : undefined);
let cursor = 0;
let matched = 0;

async function save() {
  const records = [...links.values()].sort((left, right) => left.key.localeCompare(right.key));
  await writeFile(outputPath, JSON.stringify({ source: 'Google Maps Place ID, photo and user-rating snapshot; coordinates verified at generation time', generatedAt: new Date().toISOString(), records }), 'utf8');
}

async function lookup(target) {
  const parameters = new URLSearchParams({ name: target.name, address: target.address, lat: String(target.latitude), lng: String(target.longitude) });
  const response = await fetch(`${baseUrl}/api/place-rating?${parameters}`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${target.name}: HTTP ${response.status}`);
  const rating = await response.json();
  if (rating.state !== 'found' || !Number.isFinite(rating.rating) || !(rating.userRatingCount > 0) || rating.distanceMeters > 100) return;
  const existing = links.get(target.key);
  links.set(target.key, { ...(existing ?? {}), key: target.key, kind: target.kind, id: target.id, name: target.name, placeName: rating.placeName, distanceMeters: rating.distanceMeters, placeUrl: rating.placeUrl, hasPhoto: existing?.hasPhoto ?? false, rating: rating.rating, userRatingCount: rating.userRatingCount, generatedAt: new Date().toISOString() });
  matched += 1;
}

async function worker() {
  while (cursor < pending.length) {
    const target = pending[cursor++];
    try { await lookup(target); } catch (error) { console.warn(`Skipped ${target.key}: ${error instanceof Error ? error.message : error}`); }
    if (cursor % 25 === 0 || cursor === pending.length) { await save(); console.log(`Checked ${cursor}/${pending.length}; saved ${links.size} place records`); }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
await save();
console.log(`Finished: ${matched} ratings matched from ${pending.length} car parks.`);
