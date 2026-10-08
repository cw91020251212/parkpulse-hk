import type { CarparkInfo, VacancyRecord } from '../types';

const API_BASE = 'https://api.data.gov.hk/v1/carpark-info-vacancy/';
const INFO_CACHE_KEY = 'parkspot:info:v1';
const INFO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type ApiResponse<T> = { results: T[] };
type CachedInfo = { savedAt: number; items: CarparkInfo[] };

function buildUrl(parameters: Record<string, string>) {
  const url = new URL(API_BASE);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function request<T>(parameters: Record<string, string>, signal?: AbortSignal) {
  const response = await fetch(buildUrl(parameters), {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`政府資料服務暫時未能回應（${response.status}）`);
  }

  const payload = (await response.json()) as ApiResponse<T>;
  if (!Array.isArray(payload.results)) {
    throw new Error('政府資料服務回傳了未能辨識的格式');
  }
  return payload.results;
}

function readInfoCache(): CarparkInfo[] | null {
  try {
    const raw = window.localStorage.getItem(INFO_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedInfo;
    if (!Array.isArray(cached.items) || Date.now() - cached.savedAt > INFO_CACHE_TTL_MS) {
      return null;
    }
    return cached.items;
  } catch {
    return null;
  }
}

function saveInfoCache(items: CarparkInfo[]) {
  try {
    window.localStorage.setItem(INFO_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items }));
  } catch {
    // 私隱模式或儲存空間不足時仍可正常使用即時資料。
  }
}

export async function fetchCarparkInfo(signal?: AbortSignal) {
  const cached = readInfoCache();
  if (cached) return cached;

  const items = await request<CarparkInfo>({ data: 'info', lang: 'zh_TW' }, signal);
  saveInfoCache(items);
  return items;
}

export function fetchVacancies(signal?: AbortSignal) {
  return request<VacancyRecord>({ data: 'vacancy' }, signal);
}
