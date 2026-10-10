import { publicAsset } from './site';
import type { PublicToilet } from '../types';

type Snapshot = { records?: PublicToilet[] };
const SOURCES = [
  { file: 'had-community-toilets.json', minimumRecords: 100 },
  { file: 'pages-data/afcd-nature-centre-toilets.json', minimumRecords: 1 },
  { file: 'pages-data/afcd-long-valley-temporary-toilets.json', minimumRecords: 1 },
];

export async function fetchAdditionalToilets(signal?: AbortSignal): Promise<{ records: PublicToilet[]; warning: string | null }> {
  const results = await Promise.all(SOURCES.map(async ({ file, minimumRecords }) => {
    const response = await fetch(publicAsset(file), { signal });
    if (!response.ok) throw new Error(`${file} (${response.status})`);
    const snapshot = await response.json() as Snapshot;
    if (!Array.isArray(snapshot.records) || snapshot.records.length < minimumRecords) throw new Error(`${file} snapshot is incomplete`);
    return snapshot.records;
  }).map((request) => request.then((records) => ({ records }), (error: unknown) => ({ error }))));
  const records = results.flatMap((result) => 'records' in result ? result.records : []);
  const failedSources = results.filter((result) => 'error' in result).map((result) => String(result.error));
  if (!records.length) throw new Error(failedSources.join('; ') || 'Supplementary official washroom data is unavailable');
  return { records, warning: failedSources.length ? failedSources.join('; ') : null };
}
