import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHkjcBettingOutlets } from '../lib/hkjc-betting-outlets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'data/hkjc-betting-outlets-directory.json');
const outputPath = path.join(root, 'public/pages-data/hkjc-betting-outlets.json');
const directory = JSON.parse(await readFile(sourcePath, 'utf8'));

try {
  const snapshot = await buildHkjcBettingOutlets(directory, new Date().toISOString(), (completed, total, record) => {
    if (completed % 10 === 0 || completed === total) console.log(`Matched ${completed}/${total}: ${record.nameTc}`);
  });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Updated ${path.relative(root, outputPath)}: ${snapshot.records.length} outlets (${snapshot.records.filter(({ locationPrecision }) => locationPrecision === 'outlet').length} shop points, ${snapshot.records.filter(({ locationPrecision }) => locationPrecision === 'building').length} building point).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
