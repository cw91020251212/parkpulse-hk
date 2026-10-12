import snapshot from '../data/eligible-medical-locations.json';
import type { MedicalCategory, MedicalLocation } from '../types';
import type { Language } from '../i18n';

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

export const HA_SOPC_DIRECTORY_URL = 'https://www.ha.org.hk/visitor/ha_visitor_index.asp?Content_ID=10053&Lang=CHIB5';
export const HA_SOPC_WAITING_TIME_URL = 'https://www.ha.org.hk/visitor/ha_visitor_index.asp?Content_ID=214197&Lang=CHIB5';
export const HA_GO_EASYQ_URL = 'https://www3.ha.org.hk/hago/Home/DownloadApps/';

export const SOPC_SPECIALTIES = [
  { code: '29', tc: '麻醉科（痛症門診）', en: 'Anaesthesiology (pain clinics)' },
  { code: '2', tc: '心胸肺外科', en: 'Cardiothoracic surgery' },
  { code: '3', tc: '臨床腫瘤科', en: 'Clinical oncology' },
  { code: '5', tc: '牙科（口腔頜面外科）', en: 'Dentistry (oral and maxillofacial surgery)' },
  { code: '8', tc: '耳鼻喉科', en: 'Ear, nose and throat (ENT)' },
  { code: '9', tc: '眼科', en: 'Ophthalmology' },
  { code: '11', tc: '婦科', en: 'Gynaecology' },
  { code: '13', tc: '內科', en: 'Medicine' },
  { code: '14', tc: '神經外科', en: 'Neurosurgery' },
  { code: '15', tc: '產科', en: 'Obstetrics' },
  { code: '18', tc: '矯形及創傷外科（骨科）', en: 'Orthopaedics and traumatology' },
  { code: '19', tc: '兒科', en: 'Paediatrics' },
  { code: '59', tc: '紓緩醫學科', en: 'Palliative medicine' },
  { code: '23', tc: '精神科', en: 'Psychiatry' },
  { code: '26', tc: '外科', en: 'Surgery' },
] as const;

export type SopcSpecialtyCode = typeof SOPC_SPECIALTIES[number]['code'];

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
export const MEDICAL_SPECIALTIES_CHECKED_AT = snapshot.specialties_source_checked_at;
export const MEDICAL_CATEGORY_COUNTS = snapshot.category_counts as Record<MedicalCategory, number>;

export function medicalIconFile(category?: MedicalCategory | null) {
  return category ? ICON_FILES[category] : 'medical-multiple.svg';
}

export function medicalSpecialtyLabel(code: string, language: Language) {
  const specialty = SOPC_SPECIALTIES.find((item) => item.code === code);
  return specialty ? (language === 'en' ? specialty.en : specialty.tc) : code;
}

export function medicalSpecialtyDirectoryUrl(code?: string) {
  if (!code) return HA_SOPC_DIRECTORY_URL;
  const url = new URL('https://www.ha.org.hk/visitor/ha_isf_result.asp');
  url.searchParams.set('lang', 'CHIB5');
  url.searchParams.set('service_code_id', '460');
  url.searchParams.set('service_type', 'SC');
  url.searchParams.set('location', '');
  url.searchParams.set('service_item', code);
  return url.toString();
}

export function medicalCoordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}
