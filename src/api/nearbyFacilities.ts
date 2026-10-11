import type { EmergencyWaitTime, NearbyFacility } from '../types';
import type { Language } from '../i18n';
import { isStaticPages, publicAsset } from './site';

const HA_AE_WAITING_URL: Record<Language, string> = {
  'zh-Hant': 'https://www.ha.org.hk/opendata/aed/aedwtdata2-tc.json',
  en: 'https://www.ha.org.hk/opendata/aed/aedwtdata2-en.json',
};
const HA_AE_SOURCE_URL = 'https://data.gov.hk/en-data/dataset/hospital-hadata-ae-waiting-time';

type Response = { records?: NearbyFacility[]; source?: string; generatedAt?: string };
type EmergencyLocation = {
  id: string; kind: 'emergency'; nameTc: string; nameEn: string; addressTc: string; addressEn: string;
  haNameTc: string; haNameEn: string; latitude: number; longitude: number; source: string; sourceUrl: string;
  locationSourceUrl?: string;
  coordinateTransformSourceUrl?: string;
};
type EmergencySnapshot = { records?: EmergencyLocation[]; source?: string };
type HaWaitRecord = { hospName?: string; t1wt?: string; manageT1case?: string; t2wt?: string; manageT2case?: string; t3p50?: string; t3p95?: string; t45p50?: string; t45p95?: string };
type HaWaitPayload = { updateTime?: string; waitTime?: HaWaitRecord[] };

function normalized(value: string | undefined) {
  return String(value ?? '').replace(/\s+/g, '').toLocaleLowerCase();
}

function managed(value: string | undefined) {
  return /^(Y|Yes|是)$/i.test(String(value ?? '').trim());
}

function toEmergencyWait(record: HaWaitRecord, updatedAt: string): EmergencyWaitTime {
  return {
    updatedAt,
    priority1Wait: record.t1wt ?? '',
    priority1Managed: managed(record.manageT1case),
    priority2Wait: record.t2wt ?? '',
    priority2Managed: managed(record.manageT2case),
    priority3Median: record.t3p50 ?? '',
    priority3P95: record.t3p95 ?? '',
    priority45Median: record.t45p50 ?? '',
    priority45P95: record.t45p95 ?? '',
  };
}

async function fetchEmergencyFacilities(language: Language, signal: AbortSignal) {
  const [locationResponse, waitResponse] = await Promise.all([
    fetch(publicAsset('pages-data/emergency-departments.json'), { signal }),
    fetch(HA_AE_WAITING_URL[language], { signal }),
  ]);
  if (!locationResponse.ok) throw new Error('未能讀取地政總署急症室位置資料');
  if (!waitResponse.ok) throw new Error('未能讀取醫管局急症室等候時間');
  const locationSnapshot = await locationResponse.json() as EmergencySnapshot;
  const waitPayload = await waitResponse.json() as HaWaitPayload;
  const waitByName = new Map((waitPayload.waitTime ?? []).map((record) => [normalized(record.hospName), record]));
  const records = (locationSnapshot.records ?? []).map((location) => {
    const wait = waitByName.get(normalized(language === 'en' ? location.haNameEn : location.haNameTc));
    if (!wait) throw new Error(`醫管局未提供 ${language === 'en' ? location.nameEn : location.nameTc} 的急症室等候時間`);
    return {
      id: location.id,
      kind: 'emergency' as const,
      name: language === 'en' ? location.nameEn : location.nameTc,
      address: language === 'en' ? location.addressEn : location.addressTc,
      latitude: location.latitude,
      longitude: location.longitude,
      source: location.source || '醫院管理局急症室等候時間 · 地政總署官方地圖位置',
      sourceUrl: location.sourceUrl || HA_AE_SOURCE_URL,
      locationSourceUrl: location.locationSourceUrl,
      coordinateTransformSourceUrl: location.coordinateTransformSourceUrl,
      emergencyWait: toEmergencyWait(wait, waitPayload.updateTime ?? ''),
    } satisfies NearbyFacility;
  });
  return { records, source: locationSnapshot.source || '醫院管理局 · 地政總署' };
}

export async function fetchNearbyFacilities(kind: 'fuel' | 'atm' | 'aed' | 'emergency', signal: AbortSignal, language: Language) {
  if (kind === 'emergency') return fetchEmergencyFacilities(language, signal);
  const snapshot = kind === 'fuel' ? 'fuel-stations' : kind === 'atm' ? 'atms' : 'aeds';
  const endpoint = kind === 'aed' || isStaticPages ? publicAsset(`pages-data/${snapshot}.json`) : kind === 'fuel' ? '/api/fuel-stations' : '/api/atms';
  const response = await fetch(endpoint, { signal });
  if (!response.ok) throw new Error(kind === 'fuel' ? '未能讀取消委會油站資料' : kind === 'atm' ? '未能讀取金管局 ATM 資料' : '未能讀取消防處 AED 資料');
  const payload = await response.json() as Response;
  const records = Array.isArray(payload.records) ? payload.records.map((record) => kind === 'aed' && payload.generatedAt ? { ...record, snapshotGeneratedAt: payload.generatedAt } : record) : [];
  return { records, source: payload.source };
}
