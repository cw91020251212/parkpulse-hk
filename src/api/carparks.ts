import type { CarparkInfo, VacancyRecord } from '../types';
import { publicAsset } from './site';

const API_BASE = 'https://api.data.gov.hk/v1/carpark-info-vacancy/';
const INFO_CACHE_KEY = 'parkspot:info:v1';
const INFO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STATIC_INFO_URL = publicAsset('carpark-info.json');

type ApiResponse<T> = { results: T[] };
type CachedInfo = { savedAt: number; items: CarparkInfo[] };

function buildUrl(parameters: Record<string, string>) {
  const url = new URL(API_BASE);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function request<T>(parameters: Record<string, string>, signal?: AbortSignal) {
  const response = await fetch(buildUrl(parameters), { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`政府資料服務暫時未能回應（${response.status}）`);
  const payload = (await response.json()) as ApiResponse<T>;
  if (!Array.isArray(payload.results)) throw new Error('政府資料服務回傳了未能辨識的格式');
  return payload.results;
}

function readInfoCache(): CarparkInfo[] | null {
  try {
    const raw = window.localStorage.getItem(INFO_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedInfo;
    return Array.isArray(cached.items) && Date.now() - cached.savedAt <= INFO_CACHE_TTL_MS ? cached.items : null;
  } catch {
    return null;
  }
}

function saveInfoCache(items: CarparkInfo[]) {
  try {
    window.localStorage.setItem(INFO_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items }));
  } catch {
    // 私隱模式或儲存空間不足時仍可正常使用。
  }
}

async function fetchStaticInfo(signal?: AbortSignal) {
  const response = await fetch(STATIC_INFO_URL, { signal, cache: 'force-cache', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('網站基本資料暫時未能讀取');
  const payload = (await response.json()) as ApiResponse<CarparkInfo>;
  if (!Array.isArray(payload.results)) throw new Error('網站基本資料格式不正確');
  return payload.results;
}

export async function fetchCarparkInfo(signal?: AbortSignal) {
  const cached = readInfoCache();
  if (cached) return cached;

  try {
    const items = await fetchStaticInfo(signal);
    saveInfoCache(items);
    return items;
  } catch {
    const items = await request<CarparkInfo>({ data: 'info', lang: 'zh_TW' }, signal);
    saveInfoCache(items);
    return items;
  }
}

export function fetchVacancies(signal?: AbortSignal) {
  return request<VacancyRecord>({ data: 'vacancy' }, signal);
}
