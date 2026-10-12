import snapshot from '../data/eligible-medical-locations.json';
import type { MedicalCategory, MedicalLocation } from '../types';

export const MEDICAL_CATEGORY_ORDER: readonly MedicalCategory[] = [
  'ha-hospital-institution',
  'ha-specialist-outpatient-clinic',
  'ha-family-medicine-clinic',
  'dh-civil-servants-clinic',
  'dh-civil-servants-referral-centre',
  'civil-service-chinese-medicine-clinic',
  'cmhhk-designated-civil-service-services',
];

export const MEDICAL_CATEGORY_LABEL_KEYS: Record<MedicalCategory, string> = {
  'ha-hospital-institution': 'medicalHospitals',
  'ha-specialist-outpatient-clinic': 'medicalSpecialist',
  'ha-family-medicine-clinic': 'medicalFamilyMedicine',
  'dh-civil-servants-clinic': 'medicalCivilServantsClinic',
  'dh-civil-servants-referral-centre': 'medicalReferralCentre',
  'civil-service-chinese-medicine-clinic': 'medicalChineseMedicine',
  'cmhhk-designated-civil-service-services': 'medicalCmhhk',
};

const ICON_FILES: Record<MedicalCategory, string> = {
  'ha-hospital-institution': 'ha-hospitals.svg',
  'ha-specialist-outpatient-clinic': 'ha-specialist-outpatient.svg',
  'ha-family-medicine-clinic': 'ha-family-medicine.svg',
  'dh-civil-servants-clinic': 'dh-civil-servants.svg',
  'dh-civil-servants-referral-centre': 'dh-civil-servants.svg',
  'civil-service-chinese-medicine-clinic': 'civil-service-chinese-medicine.svg',
  'cmhhk-designated-civil-service-services': 'cmhhk-designated-service.svg',
};

export const MEDICAL_LOCATIONS = snapshot.records as MedicalLocation[];
export const MEDICAL_SNAPSHOT_DATE = snapshot.source_checked_at;
export const MEDICAL_CATEGORY_COUNTS = snapshot.category_counts as Record<MedicalCategory, number>;

export function medicalIconFile(category?: MedicalCategory | null) {
  return category ? ICON_FILES[category] : 'medical-multiple.svg';
}

export function medicalCoordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}
