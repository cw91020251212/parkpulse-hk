import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'src/data/brand-icons.json');
const defaultOutputDirectory = path.join(root, 'public/brand-icons');

const readConfig = async () => JSON.parse(await readFile(configPath, 'utf8'));
const iconUrl = (site) => `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(site)}`;

async function refreshOne(item, outputDirectory) {
  const destination = path.join(outputDirectory, `${item.id}.png`);
  try {
    const response = await fetch(item.asset ?? iconUrl(item.site), { signal: AbortSignal.timeout(15_000) });
    const contentType = response.headers.get('content-type') ?? '';
    const body = Buffer.from(await response.arrayBuffer());
    if (!response.ok || !contentType.startsWith('image/') || body.byteLength < 100) throw new Error(`favicon response ${response.status} (${contentType || 'unknown type'})`);
    await writeFile(destination, body);
    return { ...item, file: `${item.id}.png`, status: 'updated' };
  } catch (error) {
    try {
      const existing = await stat(destination);
      if (existing.size >= 100) return { ...item, file: `${item.id}.png`, status: 'kept' };
    } catch {
      // No usable existing snapshot.
    }
    throw new Error(`${item.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function refreshBrandIcons(outputDirectory = defaultOutputDirectory) {
  const config = await readConfig();
  const items = Object.entries(config).flatMap(([kind, brands]) => Object.entries(brands).map(([brand, definition]) => ({ kind, brand, ...definition })));
  await mkdir(outputDirectory, { recursive: true });
  const results = [];
  for (let index = 0; index < items.length; index += 5) results.push(...await Promise.all(items.slice(index, index + 5).map((item) => refreshOne(item, outputDirectory))));
  const manifest = { source: '各品牌官方網域 favicon 快取', records: Object.fromEntries(results.map(({ id, kind, brand, site, file }) => [id, { kind, brand, site, file }])) };
  await writeFile(path.join(outputDirectory, 'manifest.json'), JSON.stringify(manifest), 'utf8');
  return { total: results.length, updated: results.filter((result) => result.status === 'updated').length, kept: results.filter((result) => result.status === 'kept').length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await refreshBrandIcons();
  console.log(`Updated ${result.updated} and kept ${result.kept} local brand icons (${result.total} total)`);
}

export { configPath, defaultOutputDirectory };
