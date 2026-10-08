import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildOfficialRateOverrides } from '../lib/official-rate-overrides.mjs';
import { buildLinkOperatorRates, buildSinoOperatorRates } from '../lib/operator-rates.mjs';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const carparks = JSON.parse(await readFile(path.join(publicDir, 'carpark-info.json'), 'utf8'));
const [link, sino] = await Promise.all([buildLinkOperatorRates(carparks.results), buildSinoOperatorRates(carparks.results)]);
const officialOverrides = buildOfficialRateOverrides(carparks.results, link.checkedAt);
const snapshot = { source: '營辦商官方泊車資料', generatedAt: new Date().toISOString(), checkedAt: link.checkedAt, attempted: link.attempted + sino.attempted + officialOverrides.attempted, providers: { link: link.attempted, sino: sino.attempted, officialSharedPages: officialOverrides.attempted }, records: { ...link.records, ...sino.records, ...officialOverrides.records } };
await writeFile(path.join(publicDir, 'operator-rates.json'), JSON.stringify(snapshot), 'utf8');
console.log(`Updated operator-rates.json: ${Object.keys(snapshot.records).length}/${snapshot.attempted} verified official private-car rate records`);
