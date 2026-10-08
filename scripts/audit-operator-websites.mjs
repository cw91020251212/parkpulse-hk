import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { results } = JSON.parse(await readFile(path.join(projectDir, 'public/carpark-info.json'), 'utf8'));
const candidates = results.filter((record) => record.website && !new URL(record.website).hostname.endsWith('linkhk.com'));

function normalize(value = '') {
  return value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const output = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      output[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(items.length, concurrency) }, worker));
  return output;
}

const audited = await mapWithConcurrency(candidates, 6, async (record) => {
  const domain = new URL(record.website).hostname.replace(/^www\./, '');
  try {
    const response = await fetch(record.website, { headers: { 'User-Agent': 'ParkPulse HK official-rate audit' }, signal: AbortSignal.timeout(15_000) });
    const text = normalize(await response.text());
    const compactName = record.name.replace(/[\s（）()\-]/g, '');
    return {
      id: record.park_Id,
      name: record.name,
      website: record.website,
      domain,
      status: response.ok ? 'fetched' : `http-${response.status}`,
      nameMatched: compactName.length > 2 && text.replace(/[\s（）()\-]/g, '').includes(compactName),
      priceTokens: (text.match(/(?:HK\s*)?\$\s*\d+(?:\.\d+)?/gi) ?? []).length,
      rateSignals: /時租|每小時|hourly|per hour|parking rate/i.test(text),
    };
  } catch (error) {
    return { id: record.park_Id, name: record.name, website: record.website, domain, status: `error-${error instanceof Error ? error.name : 'unknown'}`, nameMatched: false, priceTokens: 0, rateSignals: false };
  }
});

const byDomain = Object.values(audited.reduce((groups, record) => {
  const group = groups[record.domain] ?? { domain: record.domain, total: 0, fetched: 0, nameMatched: 0, priceCandidates: 0, records: [] };
  group.total += 1;
  group.fetched += record.status === 'fetched' ? 1 : 0;
  group.nameMatched += record.nameMatched ? 1 : 0;
  group.priceCandidates += record.nameMatched && record.priceTokens > 0 && record.rateSignals ? 1 : 0;
  group.records.push(record);
  groups[record.domain] = group;
  return groups;
}, {})).sort((left, right) => right.total - left.total || left.domain.localeCompare(right.domain));

const report = { generatedAt: new Date().toISOString(), totalOfficialWebsiteRecords: results.filter((record) => record.website).length, linkRecordsHandledByApi: results.filter((record) => record.website && new URL(record.website).hostname.endsWith('linkhk.com')).length, auditedNonLinkRecords: audited.length, fetchedNonLinkRecords: audited.filter((record) => record.status === 'fetched').length, directPriceCandidates: audited.filter((record) => record.nameMatched && record.priceTokens > 0 && record.rateSignals).length, byDomain };
await writeFile(path.join(projectDir, 'docs/2026-10-09-operator-website-audit.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ totalOfficialWebsiteRecords: report.totalOfficialWebsiteRecords, linkRecordsHandledByApi: report.linkRecordsHandledByApi, auditedNonLinkRecords: report.auditedNonLinkRecords, fetchedNonLinkRecords: report.fetchedNonLinkRecords, directPriceCandidates: report.directPriceCandidates, domains: byDomain.map(({ domain, total, fetched, nameMatched, priceCandidates }) => ({ domain, total, fetched, nameMatched, priceCandidates })) }, null, 2));
