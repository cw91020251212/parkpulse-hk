import type { Language } from '../i18n';
import type { NearbyFacility } from '../types';
import type { DrinkingWaterSnapshot } from '../domain/drinkingWater';
import { publicAsset } from './site';

export async function fetchDrinkingWater(signal: AbortSignal, language: Language) {
  const providers = ['lcsd', 'afcd', 'mtr'] as const;
  const results = await Promise.allSettled(providers.map(async (provider) => {
    const response = await fetch(publicAsset(`pages-data/${provider}-drinking-water.json`), { signal });
    if (!response.ok) throw new Error(`${provider}: HTTP ${response.status}`);
    const snapshot = await response.json() as DrinkingWaterSnapshot;
    if (!Array.isArray(snapshot.records) || !snapshot.records.length) throw new Error(`${provider}: empty snapshot`);
    return snapshot;
  }));
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const snapshots = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  if (!snapshots.length) throw new Error(language === 'en' ? 'Unable to load official drinking-water locations' : '未能讀取官方飲水機位置資料');
  const records = snapshots.flatMap((snapshot) => snapshot.records.map((record): NearbyFacility => ({
    id: record.id,
    kind: 'drinkingWater',
    name: language === 'en' ? record.nameEn || record.nameTc : record.nameTc,
    address: language === 'en' ? record.addressEn || record.addressTc : record.addressTc,
    latitude: record.latitude,
    longitude: record.longitude,
    openingHours: language === 'en' ? record.serviceHoursEn : record.serviceHoursTc,
    remarks: language === 'en' ? record.remarksEn : record.remarksTc,
    source: snapshot.source[language],
    sourceUrl: record.sourceUrl || snapshot.sourceUrl,
    locationSourceUrl: record.coordinateSourceUrl,
    snapshotGeneratedAt: snapshot.generatedAt,
    locationPrecision: record.locationPrecision,
    locationNote: language === 'en' ? record.locationNoteEn : record.locationNoteTc,
    drinkingWater: {
      provider: record.provider,
      location: language === 'en' ? record.locationEn || record.locationTc : record.locationTc,
      type: language === 'en' ? record.typeEn || record.typeTc : record.typeTc,
      unitCount: record.unitCount,
      indoorOutdoor: record.indoorOutdoor,
      temperature: language === 'en' ? record.temperatureEn : record.temperatureTc,
      filterStatus: record.filterStatus,
      access: language === 'en' ? record.accessEn : record.accessTc,
      temporaryClosed: record.temporaryClosed,
      officialMapUrl: record.officialMapUrl,
    },
  })));
  const source = snapshots.map((snapshot) => snapshot.source[language]).join(' · ');
  const unavailable = results.flatMap((result, index) => result.status === 'rejected' ? [providers[index].toUpperCase()] : []);
  return {
    records,
    source: source + (unavailable.length ? (language === 'en' ? ` · Source unavailable: ${unavailable.join(', ')}` : ` · 未能載入來源：${unavailable.join('、')}`) : ''),
  };
}
