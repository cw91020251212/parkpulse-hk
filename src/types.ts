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

export type SearchScope = 'radius' | 'viewport';
export type MapViewport = { north: number; south: number; east: number; west: number; center: Coordinates };

export interface ManualToiletPosition {
  toiletId: string;
  latitude: number;
  longitude: number;
}

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
  kind?: 'publicToilet' | 'lcsdVenue' | 'lcsdParkToilet' | 'afcdCountryParkToilet' | 'hadCommunityToilet' | 'afcdNatureCentreToilet' | 'afcdLongValleyTemporaryToilets' | 'landsdMapToilet';
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
  manualPositionSource?: 'shared' | 'local';
}

export type MedicalCategory = 'ha-hospital-institution' | 'ha-specialist-outpatient-clinic' | 'ha-family-medicine-clinic' | 'dh-civil-servants-clinic' | 'dh-civil-servants-referral-centre' | 'civil-service-chinese-medicine-clinic' | 'cmhhk-designated-civil-service-services';
export type MedicalCategoryFilter = MedicalCategory | 'all';

export interface MedicalLocation {
  id: string;
  category: MedicalCategory;
  name_tc: string;
  name_en?: string;
  address_tc: string;
  address_en?: string;
  cluster_tc?: string;
  cluster_en?: string;
  district_tc?: string;
  district_en?: string;
  latitude: number;
  longitude: number;
  coordinate_precision: string;
  booking_phone?: string;
  contact_text?: string;
  clinic_hours_text?: string;
  booking_url?: string;
  booking_app_url?: string;
  booking_app_url_ios?: string;
  booking_app_url_android?: string;
  booking_notes?: string;
  relocation_note?: string;
  source_url: string;
  source_checked_at: string;
  eligibility_basis?: string;
}

export interface MedicalLocationViewModel {
  location: MedicalLocation;
  distanceKm: number;
  onSelect?: () => void;
}

export type NearbyMode = 'toilets' | 'fuel' | 'atm' | 'aed' | 'emergency' | 'border' | 'hkjc' | 'medical' | 'onStreet';

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
  kind: 'fuel' | 'atm' | 'aed' | 'emergency' | 'border' | 'hkjc';
  source: string;
  sourceUrl?: string;
  sourcePdfUrl?: string;
  locationSourceUrl?: string;
  coordinateTransformSourceUrl?: string;
  snapshotGeneratedAt?: string;
  sourceDirectoryUpdatedAt?: string;
  sourceDataCheckedAt?: string;
  locationPrecision?: 'outlet' | 'building';
  locationNote?: string;
  hkjcFirstPrizeRank?: number;
  hkjcFirstPrizeTicketCount?: number;
  hkjcFirstPrizeAsOf?: string;
  hkjcFirstPrizeSourceUrl?: string;
  emergencyWait?: EmergencyWaitTime;
  borderWait?: BorderWaitingTime;
}

export interface EmergencyWaitTime {
  updatedAt: string;
  priority1Wait: string;
  priority1Managed: boolean;
  priority2Wait: string;
  priority2Managed: boolean;
  priority3Median: string;
  priority3P95: string;
  priority45Median: string;
  priority45P95: string;
}

export type BorderQueueStatus = 0 | 1 | 2 | 4 | 99;

export interface BorderQueue {
  arrival: BorderQueueStatus;
  departure: BorderQueueStatus;
}

export interface BorderWaitingTime {
  residents: BorderQueue;
  visitors: BorderQueue;
  snapshotGeneratedAt?: string;
  residentsLastModified?: string;
  visitorsLastModified?: string;
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
