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

export interface OperatorRate {
  sourceUrl: string;
  sourceLabel: { 'zh-Hant': string; en: string };
  checkedAt: string;
  cardSummary: { 'zh-Hant': string; en: string };
  hourlySummary: { 'zh-Hant': string; en: string };
  detailNotes: { 'zh-Hant': string[]; en: string[] };
}

export interface OfficialCarparkSource {
  availability: 'not-provided' | 'snapshot';
  sourceUrl: string;
  sourceLabel: { 'zh-Hant': string; en: string };
}

export interface CarparkInfo {
  park_Id: string;
  name: string;
  displayAddress?: string;
  photoPlaceUrl?: string;
  googleRating?: GoogleMapsRating;
  district?: string;
  latitude: number;
  longitude: number;
  contactNo?: string;
  website?: string;
  operatorRates?: Partial<Record<VehicleType, OperatorRate>>;
  officialSource?: OfficialCarparkSource;
  opening_status?: 'OPEN' | 'CLOSED' | string;
  openingHours?: string;
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
  noLiveData?: boolean;
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
  nameEn?: string;
  address?: string;
  addressEn?: string;
  district?: string;
  districtEn?: string;
  photoPlaceUrl?: string;
  openingHours?: string;
  openingHoursEn?: string;
  remarks?: string;
  remarksEn?: string;
  updatedAt?: string;
  latitude: number;
  longitude: number;
  locationPrecision?: 'toilet' | 'venue' | 'venue-uncertain';
  kind?: 'publicToilet' | 'lcsdVenue' | 'lcsdParkToilet' | 'afcdCountryParkToilet' | 'hadCommunityToilet' | 'afcdNatureCentreToilet' | 'afcdLongValleyTemporaryToilets';
  source?: string;
  sourceUrl?: string;
  coordinateSourceUrl?: string;
  category?: string;
  facilityId?: string;
  countryPark?: string;
  countryParkEn?: string;
  toiletType?: string;
  toiletTypeEn?: string;
  barrierFree?: boolean;
  sourcePeriod?: string;
}

export interface PublicToiletViewModel {
  toilet: PublicToilet;
  distanceKm: number;
}

export type NearbyMode = 'toilets' | 'fuel' | 'atm' | 'onStreet';

export interface GoogleMapsRating {
  rating: number;
  userRatingCount: number;
  placeUrl: string;
  generatedAt?: string;
}

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
  onSelect?: () => void;
}

export interface OnStreetParking {
  id: string;
  kind: 'metered' | 'nonMetered' | 'motorcycle';
  name: string;
  nameEn?: string;
  address: string;
  addressEn?: string;
  latitude: number;
  longitude: number;
  vehicleType?: string;
  occupancy: 'vacant' | 'occupied' | 'unavailable';
  meterStatus?: string;
  updatedAt?: string;
  operatingPeriod?: string;
  timeUnit?: string;
  paymentUnit?: string;
  source: string;
  sourceUrl?: string;
  snapshot: boolean;
  static?: boolean;
  metered?: boolean;
}

export interface OnStreetParkingGroup {
  id: string;
  kind: OnStreetParking['kind'];
  name: string;
  nameEn?: string;
  address: string;
  addressEn?: string;
  sections: string[];
  latitude: number;
  longitude: number;
  total: number;
  vacant: number;
  occupied: number;
  unavailable: number;
  occupancy: OnStreetParking['occupancy'];
  operatingPeriod?: string;
  operatingPeriodEn?: string;
  timeUnit?: string;
  paymentUnit?: string;
  vehicleType?: string;
  source: string;
  sourceUrl?: string;
  snapshot: boolean;
  static?: boolean;
  metered?: boolean;
}

export interface OnStreetParkingRecordViewModel {
  onStreet: OnStreetParking;
  distanceKm: number;
}

export interface OnStreetParkingViewModel {
  onStreet: OnStreetParkingGroup;
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
  includeNoLiveData: boolean;
  openOnly: boolean;
  hasEv: boolean;
  hasAccessible: boolean;
  minHeight: number;
}
