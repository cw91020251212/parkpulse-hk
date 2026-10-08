import type { NearbyFacility } from '../types';

type Response = { records?: NearbyFacility[]; source?: string };

export async function fetchNearbyFacilities(kind: 'fuel' | 'atm', signal: AbortSignal) {
  const response = await fetch(kind === 'fuel' ? '/api/fuel-stations' : '/api/atms', { signal });
  if (!response.ok) throw new Error(kind === 'fuel' ? '未能讀取消委會油站資料' : '未能讀取金管局 ATM 資料');
  const payload = await response.json() as Response;
  return { records: Array.isArray(payload.records) ? payload.records : [], source: payload.source };
}
