import type { Language } from '../i18n';

export type WaterEnvironment = 'all' | 'indoor' | 'outdoor';
export type WaterEnvironmentCounts = Record<WaterEnvironment, number>;

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

/**
 * Count drinking-water location records in the caller's already-scoped input,
 * before applying an environment filter. Each record counts once, regardless
 * of unitCount: these are location counts, never inferred machine totals.
 * Like matchesWaterEnvironment('all'), all includes unknown/missing water info;
 * indoor/outdoor include only explicitly classified drinking-water records.
 */
export function countWaterEnvironments(items: Iterable<{
  readonly kind: string;
  readonly drinkingWater?: { readonly indoorOutdoor?: DrinkingWaterInfo['indoorOutdoor'] };
}>): WaterEnvironmentCounts {
  const counts: WaterEnvironmentCounts = { all: 0, indoor: 0, outdoor: 0 };
  for (const item of items) {
    if (item.kind !== 'drinkingWater') continue;
    counts.all += 1;
    const environment = item.drinkingWater?.indoorOutdoor;
    if (environment === 'indoor' || environment === 'outdoor') {
      counts[environment] += 1;
    }
  }
  return counts;
}
