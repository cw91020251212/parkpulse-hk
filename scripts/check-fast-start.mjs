import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile(new URL('../public/carpark-info.json', import.meta.url), 'utf8'));
if (!Array.isArray(payload.results) || payload.results.length < 100 || !payload.results.every((item) => item?.park_Id && Number.isFinite(item?.latitude) && Number.isFinite(item?.longitude))) {
  throw new Error('Static carpark baseline is incomplete');
}

console.log(`Static baseline check passed (${payload.results.length} car parks)`);
