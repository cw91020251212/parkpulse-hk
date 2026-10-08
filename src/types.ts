export const VEHICLE_TYPES = [
  'privateCar',
  'motorCycle',
  'LGV',
  'HGV',
  'coach',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  privateCar: '私家車',
  motorCycle: '電單車',
  LGV: '輕型貨車',
  HGV: '重型貨車',
  coach: '旅遊巴',
};

export type Coordinates = { lat: number; lng: number };

export interface ChargeRule {
  price?: number;
  periodStart?: string;
  periodEnd?: string;
  usageMinimum?: number;
  type?: string;
}

export interface VehicleParkingInfo {
  space?: number;
  spaceEV?: number;
  spaceDIS?: number;
  hourlyCharges?: ChargeRule[];
}

export interface HeightLimit {
  height?: number;
  remark?: string;
}

export interface CarparkInfo {
  park_Id: string;
  name: string;
  displayAddress?: string;
  district?: string;
  latitude: number;
  longitude: number;
  contactNo?: string;
  website?: string;
  opening_status?: 'OPEN' | 'CLOSED' | string;
  heightLimits?: HeightLimit[];
  facilities?: string[];
  paymentMethods?: string[];
  privateCar?: VehicleParkingInfo;
  motorCycle?: VehicleParkingInfo;
  LGV?: VehicleParkingInfo;
  HGV?: VehicleParkingInfo;
  coach?: VehicleParkingInfo;
}

export interface VacancyEntry {
  vacancy_type?: 'A' | 'B' | 'C' | string;
  vacancy?: number;
  vacancyEV?: number;
  vacancyDIS?: number;
  lastupdate?: string;
  category?: 'HOURLY' | 'DAILY' | 'MONTHLY' | string;
}

export interface VacancyRecord {
  park_Id: string;
  privateCar?: VacancyEntry[];
  motorCycle?: VacancyEntry[];
  LGV?: VacancyEntry[];
  HGV?: VacancyEntry[];
  coach?: VacancyEntry[];
}

export type VacancyKind = 'count' | 'available' | 'full' | 'closed' | 'unknown';

export interface VacancyStatus {
  kind: VacancyKind;
  label: string;
  count?: number;
  updatedAt?: Date;
  stale: boolean;
  sourceCategory?: string;
}

export interface EpdEvCharger {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  total: number;
  available: number | null;
  types: string[];
  updatedAt?: string;
}

export interface EvChargerMatch extends EpdEvCharger {
  distanceMeters: number;
  matchedBy: 'name-address' | 'coordinates';
}

export interface PublicToilet {
  id: string;
  name: string;
  address?: string;
  openingHours?: string;
  remarks?: string;
  updatedAt?: string;
  latitude: number;
  longitude: number;
  kind?: 'publicToilet' | 'lcsdVenue';
  source?: string;
  sourceUrl?: string;
  category?: string;
}

export interface PublicToiletViewModel {
  toilet: PublicToilet;
  distanceKm: number;
}

export type NearbyMode = 'toilets' | 'fuel' | 'atm';

export interface NearbyFacility {
  id: string;
  name: string;
  address: string;
  brand?: string;
  openingHours?: string;
  remarks?: string;
  latitude: number;
  longitude: number;
  kind: 'fuel' | 'atm';
  source: string;
}

export interface NearbyFacilityViewModel {
  facility: NearbyFacility;
  distanceKm: number;
}

export interface ParkViewModel {
  info: CarparkInfo;
  status: VacancyStatus;
  distanceKm: number;
  heightLimit?: number;
  evCharger?: EvChargerMatch;
}

export interface ParkFilters {
  availableOnly: boolean;
  openOnly: boolean;
  hasEv: boolean;
  hasAccessible: boolean;
  minHeight: number;
}
