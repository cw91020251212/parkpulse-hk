import type { CarparkInfo, OperatorRate, VacancyRecord } from '../types';
import { publicAsset } from './site';

const API_BASE = 'https://api.data.gov.hk/v1/carpark-info-vacancy/';
const INFO_CACHE_KEY = 'parkspot:info:v4';
const INFO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const STATIC_INFO_URL = publicAsset('carpark-info.json');
const STATIC_OPERATOR_RATES_URL = publicAsset('operator-rates.json');
const STATIC_OFFICIAL_CARPARKS_URL = publicAsset('pages-data/official-static-carparks.json');

type ApiResponse<T> = { results: T[] };
type CachedInfo = { savedAt: number; items: CarparkInfo[] };
type OperatorRateSnapshot = { records?: Record<string, Partial<Record<'privateCar' | 'motorCycle' | 'LGV' | 'HGV' | 'coach', OperatorRate>>> };
type OfficialStaticCarparkSnapshot = { records?: CarparkInfo[]; vacancies?: VacancyRecord[] };

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

async function attachOperatorRates(items: CarparkInfo[], signal?: AbortSignal) {
  try {
    const response = await fetch(STATIC_OPERATOR_RATES_URL, { signal, cache: 'force-cache', headers: { Accept: 'application/json' } });
    if (!response.ok) return items;
    const snapshot = await response.json() as OperatorRateSnapshot;
    return items.map((item) => snapshot.records?.[item.park_Id] ? { ...item, operatorRates: snapshot.records[item.park_Id] } : item);
  } catch {
    return items;
  }
}

function normaliseCarparkName(value: string) {
  return value.replace(/[\s（）()\-－]/g, '').replace(/(?:公眾)?停車場/g, '');
}

function isSamePhysicalCarpark(first: CarparkInfo, second: CarparkInfo) {
  const firstName = normaliseCarparkName(first.name);
  const secondName = normaliseCarparkName(second.name);
  const namesMatch = firstName === secondName || firstName.startsWith(secondName) || secondName.startsWith(firstName);
  return namesMatch && Math.abs(first.latitude - second.latitude) < 0.002 && Math.abs(first.longitude - second.longitude) < 0.002;
}

async function attachOfficialStaticCarparks(items: CarparkInfo[], signal?: AbortSignal) {
  try {
    const response = await fetch(STATIC_OFFICIAL_CARPARKS_URL, { signal, cache: 'force-cache', headers: { Accept: 'application/json' } });
    if (!response.ok) return items;
    const snapshot = await response.json() as OfficialStaticCarparkSnapshot;
    const records = snapshot.records ?? [];
    const merged = items.map((existing) => {
      const match = records.find((item) => isSamePhysicalCarpark(existing, item));
      return match ? { ...existing, officialSource: match.officialSource, openingHours: existing.openingHours ?? match.openingHours } : existing;
    });
    const supplemental = records.filter((item) => !items.some((existing) => existing.park_Id === item.park_Id || isSamePhysicalCarpark(existing, item)));
    return [...merged, ...supplemental];
  } catch {
    return items;
  }
}

async function attachOfficialStaticVacancies(items: VacancyRecord[], signal?: AbortSignal) {
  try {
    const response = await fetch(STATIC_OFFICIAL_CARPARKS_URL, { signal, cache: 'force-cache', headers: { Accept: 'application/json' } });
    if (!response.ok) return items;
    const snapshot = await response.json() as OfficialStaticCarparkSnapshot;
    const supplemental = (snapshot.vacancies ?? []).filter((item) => !items.some((existing) => existing.park_Id === item.park_Id));
    return [...items, ...supplemental];
  } catch {
    return items;
  }
}

export async function fetchCarparkInfo(signal?: AbortSignal) {
  const cached = readInfoCache();
  if (cached) return cached;

  try {
    const items = await attachOperatorRates(await attachOfficialStaticCarparks(await fetchStaticInfo(signal), signal), signal);
    saveInfoCache(items);
    return items;
  } catch {
    const items = await attachOperatorRates(await attachOfficialStaticCarparks(await request<CarparkInfo>({ data: 'info', lang: 'zh_TW' }, signal), signal), signal);
    saveInfoCache(items);
    return items;
  }
}

export async function fetchVacancies(signal?: AbortSignal) {
  return attachOfficialStaticVacancies(await request<VacancyRecord>({ data: 'vacancy' }, signal), signal);
}
