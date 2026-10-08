import type { EpdEvCharger } from '../types';
import { isStaticPages, publicAsset } from './site';

type EvChargerResponse = {
  records?: EpdEvCharger[];
};

export async function fetchEvChargers(signal: AbortSignal) {
  const response = await fetch(isStaticPages ? publicAsset('pages-data/ev-chargers.json') : '/api/ev-chargers', { signal });
  if (!response.ok) throw new Error('未能讀取環保署充電器資料');
  const payload = await response.json() as EvChargerResponse;
  return Array.isArray(payload.records) ? payload.records : [];
}
