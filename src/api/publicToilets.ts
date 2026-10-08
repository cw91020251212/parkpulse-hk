import type { PublicToilet } from '../types';

type PublicToiletResponse = { records?: PublicToilet[] };

export async function fetchPublicToilets(signal: AbortSignal) {
  const response = await fetch('/api/public-toilets', { signal });
  if (!response.ok) throw new Error('未能讀取食環署公廁資料');
  const payload = await response.json() as PublicToiletResponse;
  return Array.isArray(payload.records) ? payload.records : [];
}
