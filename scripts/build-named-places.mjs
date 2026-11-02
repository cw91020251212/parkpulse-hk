import { mkdir, writeFile } from 'node:fs/promises';
import { buildNamedPlaces } from '../lib/named-places.mjs';
const snapshot = await buildNamedPlaces();
await mkdir(new URL('../public/pages-data/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/pages-data/named-places.json', import.meta.url), JSON.stringify(snapshot) + '\n');
console.log(`Named places written: ${snapshot.places.length} polygons; source date ${snapshot.updatedAt}`);
