import type { PublicToilet } from '../types';

type LcsdVenueResponse = { records?: PublicToilet[] };

export async function fetchLcsdVenues(signal: AbortSignal) {
  const response = await fetch('/lcsd-washroom-venues.json', { signal });
  if (!response.ok) throw new Error('未能讀取康文署場館資料');
  const payload = await response.json() as LcsdVenueResponse;
  return Array.isArray(payload.records) ? payload.records : [];
}
