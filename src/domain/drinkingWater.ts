import type { Language } from '../i18n';

export type WaterEnvironment = 'all' | 'indoor' | 'outdoor';
export interface DrinkingWaterRecord {
  id: string;
  provider: 'lcsd' | 'afcd' | 'mtr';
  nameTc: string; nameEn: string;
  addressTc: string; addressEn: string;
  latitude: number; longitude: number;
  locationTc: string; locationEn: string;
  typeTc: string; typeEn: string;
  unitCount: number | null;
  indoorOutdoor: 'indoor' | 'outdoor' | 'unknown';
  serviceHoursTc: string; serviceHoursEn: string;
  temperatureTc: string; temperatureEn: string;
  remarksTc: string; remarksEn: string;
  sourceUrl: string;
  coordinateSourceUrl?: string;
  officialMapUrl?: string;
  filterStatus: 'confirmed' | 'notPublished';
  accessTc: string; accessEn: string;
  temporaryClosed: boolean;
  locationPrecision?: 'building';
  locationNoteTc?: string;
  locationNoteEn?: string;
}
export interface DrinkingWaterSnapshot {
  generatedAt: string;
  source: Record<Language, string>;
  sourceUrl: string;
  records: DrinkingWaterRecord[];
}
export interface DrinkingWaterInfo {
  provider: DrinkingWaterRecord['provider'];
  location: string;
  type: string;
  unitCount: number | null;
  indoorOutdoor: DrinkingWaterRecord['indoorOutdoor'];
  temperature: string;
  filterStatus: DrinkingWaterRecord['filterStatus'];
  access: string;
  temporaryClosed: boolean;
  officialMapUrl?: string;
}

export function matchesWaterEnvironment(environment: WaterEnvironment, item?: DrinkingWaterInfo) {
  return environment === 'all' || item?.indoorOutdoor === environment;
}
