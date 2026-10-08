import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'public/pages-data/verified-place-links.json');
const baseUrl = process.env.PARKSPOT_BASE_URL ?? 'http://127.0.0.1:3000';
const concurrency = Math.max(1, Number(process.env.PARKSPOT_PLACE_CONCURRENCY ?? 2));
const publicWashroom = /toilet|bathhouse|urinal|washroom|restroom|公廁|尿廁|浴室|洗手間/i;

async function readJson(file) {
  return JSON.parse(await readFile(path.join(root, file), 'utf8'));
}

function toTarget(kind, record) {
  return {
    key: `${kind}:${kind === 'carpark' ? record.park_Id : record.id}`,
    kind,
    id: kind === 'carpark' ? record.park_Id : record.id,
    name: record.name,
    address: record.displayAddress ?? record.address ?? '',
    latitude: record.latitude,
    longitude: record.longitude,
  };
}

function accepts(target, payload) {
  if (payload.state !== 'found' || !payload.placeUrl || !payload.placeName || payload.distanceMeters > 100) return false;
  return target.kind !== 'publicToilet' || publicWashroom.test(payload.placeName);
}

async function save(links, activeKeys) {
  const records = [...links.values()]
    .filter((link) => activeKeys.has(link.key))
    .sort((left, right) => left.key.localeCompare(right.key));
  await writeFile(outputPath, JSON.stringify({
    source: 'Google Maps Place ID snapshot; coordinates verified at generation time',
    generatedAt: new Date().toISOString(),
    records,
  }), 'utf8');
}

const carparkPayload = await readJson('public/carpark-info.json');
const carparks = (Array.isArray(carparkPayload) ? carparkPayload : carparkPayload.results ?? carparkPayload.records ?? []).map((record) => toTarget('carpark', record));
const toilets = (await readJson('public/pages-data/public-toilets.json')).records.map((record) => toTarget('publicToilet', record));
const venues = (await readJson('public/lcsd-washroom-venues.json')).records.map((record) => toTarget('lcsdVenue', record));
const targets = [...carparks, ...toilets, ...venues];
const activeKeys = new Set(targets.map((target) => target.key));
const previous = existsSync(outputPath) ? JSON.parse(await readFile(outputPath, 'utf8')) : { records: [] };
const links = new Map((previous.records ?? []).filter((link) => activeKeys.has(link.key)).map((link) => [link.key, link]));
const limit = Number(process.env.PARKSPOT_MAX_PLACE_LINKS ?? 0);
const pending = targets.filter((target) => !links.has(target.key)).slice(0, limit > 0 ? limit : undefined);
let cursor = 0;
let checked = 0;
let matched = 0;

async function lookup(target) {
  const parameters = new URLSearchParams({
    name: target.name,
    address: target.address,
    lat: String(target.latitude),
    lng: String(target.longitude),
  });
  const response = await fetch(`${baseUrl}/api/place-photo?${parameters}`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${target.name}: HTTP ${response.status}`);
  const payload = await response.json();
  if (accepts(target, payload)) {
    links.set(target.key, {
      key: target.key,
      kind: target.kind,
      id: target.id,
      name: target.name,
      placeName: payload.placeName,
      distanceMeters: payload.distanceMeters,
      placeUrl: payload.placeUrl,
    });
    matched += 1;
  }
}

async function worker() {
  while (cursor < pending.length) {
    const target = pending[cursor++];
    try {
      await lookup(target);
    } catch (error) {
      console.warn(`Skipped ${target.key}: ${error instanceof Error ? error.message : error}`);
    }
    checked += 1;
    if (checked % 25 === 0 || checked === pending.length) {
      await save(links, activeKeys);
      console.log(`Checked ${checked}/${pending.length}; saved ${links.size} verified place links`);
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
await save(links, activeKeys);
console.log(`Finished: ${links.size} verified links (${matched} newly matched; ${pending.length} checked).`);
