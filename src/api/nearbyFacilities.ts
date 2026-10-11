import type { NearbyFacility } from '../types';
import { isStaticPages, publicAsset } from './site';

type Response = { records?: NearbyFacility[]; source?: string; generatedAt?: string };

export async function fetchNearbyFacilities(kind: 'fuel' | 'atm' | 'aed', signal: AbortSignal) {
  const snapshot = kind === 'fuel' ? 'fuel-stations' : kind === 'atm' ? 'atms' : 'aeds';
  const endpoint = kind === 'aed' || isStaticPages ? publicAsset(`pages-data/${snapshot}.json`) : kind === 'fuel' ? '/api/fuel-stations' : '/api/atms';
  const response = await fetch(endpoint, { signal });
  if (!response.ok) throw new Error(kind === 'fuel' ? '未能讀取消委會油站資料' : kind === 'atm' ? '未能讀取金管局 ATM 資料' : '未能讀取消防處 AED 資料');
  const payload = await response.json() as Response;
  const records = Array.isArray(payload.records) ? payload.records.map((record) => kind === 'aed' && payload.generatedAt ? { ...record, snapshotGeneratedAt: payload.generatedAt } : record) : [];
  return { records, source: payload.source };
}
