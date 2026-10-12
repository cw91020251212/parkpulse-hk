import { publicAsset } from '../api/site';
import { formatDistance } from '../domain/distance';
import {
  HA_GO_EASYQ_URL,
  HA_SOPC_WAITING_TIME_URL,
  MEDICAL_CATEGORY_LABEL_KEYS,
  MEDICAL_CATEGORY_ORDER,
  medicalIconFile,
  medicalSpecialtyDirectoryUrl,
  medicalSpecialtyLabel,
  SOPC_SPECIALTIES,
  type SopcSpecialtyCode,
} from '../domain/medicalLocations';
import { text, type Language } from '../i18n';
import { googleMapsPlaceUrl } from '../domain/placeLinks';
import type { MedicalCategory, MedicalCategoryFilter, MedicalLocationViewModel } from '../types';

const iconUrl = (category: MedicalCategory) => publicAsset(`icons/medical/${medicalIconFile(category)}`);
const categoryLabel = (language: Language, category: MedicalCategory) => text(language, MEDICAL_CATEGORY_LABEL_KEYS[category]);
const BOOKING_NOTE_KEYS: Partial<Record<MedicalCategory, string>> = {
  'ha-family-medicine-clinic': 'medicalBookingFamilyNote',
  'dh-civil-servants-clinic': 'medicalBookingDhClinicNote',
  'dh-civil-servants-referral-centre': 'medicalBookingReferralNote',
  'civil-service-chinese-medicine-clinic': 'medicalBookingChineseMedicineNote',
  'cmhhk-designated-civil-service-services': 'medicalBookingCmhhkNote',
};

export function MedicalCategoryFilters({
  language,
  selected,
  counts,
  onChange,
  specialty,
  specialtyCounts,
  onSpecialtyChange,
}: {
  language: Language;
  selected: MedicalCategoryFilter;
  counts: Partial<Record<MedicalCategory, number>>;
  onChange: (category: MedicalCategoryFilter) => void;
  specialty: SopcSpecialtyCode | 'all';
  specialtyCounts: Partial<Record<SopcSpecialtyCode, number>>;
  onSpecialtyChange: (code: SopcSpecialtyCode | 'all') => void;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);
  const allowSpecialtyFilter = selected === 'all' || selected === 'ha-specialist-outpatient-clinic';
  return <>
    <div className="medical-category-filters" role="group" aria-label={text(language, 'medicalCategories')}>
      <button type="button" className={selected === 'all' ? 'medical-category-chip is-active' : 'medical-category-chip'} aria-pressed={selected === 'all'} onClick={() => { onChange('all'); onSpecialtyChange('all'); }}>
        <span>{text(language, 'medicalAll')}</span><b>{total}</b>
      </button>
      {MEDICAL_CATEGORY_ORDER.map((category) => <button key={category} type="button" className={selected === category ? `medical-category-chip is-${category} is-active` : `medical-category-chip is-${category}`} aria-pressed={selected === category} onClick={() => { onChange(category); onSpecialtyChange('all'); }}>
        <img src={iconUrl(category)} alt="" aria-hidden="true" /><span>{categoryLabel(language, category)}</span><b>{counts[category] ?? 0}</b>
      </button>)}
    </div>
    {allowSpecialtyFilter && <div className="medical-specialty-filter">
      <label htmlFor="medical-specialty-select">{text(language, 'medicalSpecialtyFilter')}</label>
      <select id="medical-specialty-select" value={specialty} onChange={(event) => onSpecialtyChange(event.target.value as SopcSpecialtyCode | 'all')}>
        <option value="all">{text(language, 'medicalAllSpecialties')}</option>
        {SOPC_SPECIALTIES.map(({ code }) => <option key={code} value={code}>{medicalSpecialtyLabel(code, language)} · {specialtyCounts[code] ?? 0}</option>)}
      </select>
    </div>}
  </>;
}

export function MedicalLocationCard({ language, item, onSelect }: { language: Language; item: MedicalLocationViewModel; onSelect: () => void }) {
  const { location, distanceKm } = item;
  const name = language === 'en' && location.name_en ? location.name_en : location.name_tc;
  const address = language === 'en' && location.address_en ? location.address_en : location.address_tc;
  const category = categoryLabel(language, location.category);
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&travelmode=walking`;
  const activateByKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect();
  };
  const specialtyCodes = location.specialty_codes ?? [];
  return <article className={`toilet-card nearby-facility-card medical-location-card is-${location.category}`}>
    <div className="toilet-card-main nearby-facility-main" role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`${text(language, 'viewFacilityDetails')}: ${name}`} onClick={onSelect} onKeyDown={activateByKeyboard}>
      <div className="card-heading">
        <span className={`toilet-card-icon medical-category-icon is-${location.category}`} aria-hidden="true"><img src={iconUrl(location.category)} alt="" /></span>
        <div><h3>{name}</h3><p>{address}</p></div>
        <span className="distance">{formatDistance(distanceKm)}</span>
      </div>
      <div className="toilet-facts medical-location-facts">
        <span className={`medical-category-badge is-${location.category}`}>{category}</span>
        {(location.district_tc || location.cluster_tc) && <span>{language === 'en' ? (location.district_en || location.cluster_en || location.cluster_tc) : (location.district_tc || location.cluster_tc)}</span>}
        {location.relocation_note && <span className="medical-relocation-note">{language === 'en' ? 'Temporary relocation: ' : '臨時搬遷：'}{location.relocation_note}</span>}
      </div>
      {location.category === 'ha-specialist-outpatient-clinic' && <div className="medical-specialties-preview" aria-label={text(language, 'medicalSpecialtyLabel')}>
        {specialtyCodes.length ? <>{specialtyCodes.slice(0, 3).map((code) => <span className="medical-specialty-tag" key={code}>{medicalSpecialtyLabel(code, language)}</span>)}{specialtyCodes.length > 3 && <span className="medical-specialty-more">+{specialtyCodes.length - 3}</span>}</> : <span className="medical-specialty-unlisted">{text(language, 'medicalSpecialtyUnlisted')}</span>}
      </div>}
    </div>
    <div className="toilet-card-actions">
      <button className="facility-details-button" type="button" onClick={onSelect}>{text(language, 'viewFacilityDetails')}</button>
      <a className="nav-link" href={navigationUrl} target="_blank" rel="noreferrer">{text(language, 'walkingNavigation')}</a>
    </div>
  </article>;
}

export function MedicalLocationDetail({ language, item, onClose }: { language: Language; item: MedicalLocationViewModel; onClose: () => void }) {
  const { location, distanceKm } = item;
  const name = language === 'en' && location.name_en ? location.name_en : location.name_tc;
  const address = language === 'en' && location.address_en ? location.address_en : location.address_tc;
  const category = categoryLabel(language, location.category);
  const placeUrl = googleMapsPlaceUrl(name, address, location.latitude, location.longitude);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&travelmode=walking`;
  const bookingUrl = location.booking_url || location.booking_app_url;
  const sourceUrl = location.source_url;
  const bookingNoteKey = BOOKING_NOTE_KEYS[location.category];
  const specialtyCodes = location.specialty_codes ?? [];
  const isSpecialistClinic = location.category === 'ha-specialist-outpatient-clinic';
  return <aside className="detail-panel medical-detail-panel" role="dialog" aria-modal="true" aria-label={`${name} ${text(language, 'details')}`}>
    <button className="close-detail" type="button" onClick={onClose} aria-label={text(language, 'closeDetails')}>×</button>
    <p className="eyebrow"><img className="medical-detail-icon" src={iconUrl(location.category)} alt="" />{text(language, 'medicalFacilities')} · {category} · {formatDistance(distanceKm)}</p>
    <h2>{name}</h2>
    {location.relocation_note && <p className="medical-relocation-note">{language === 'en' ? 'Temporary relocation: ' : '臨時搬遷：'}{location.relocation_note}</p>}
    <section className="detail-section"><h3>{text(language, 'fullAddress')}</h3><p className="detail-address"><a href={placeUrl} target="_blank" rel="noreferrer">{address || text(language, 'addressUnavailable')}</a></p></section>
    {isSpecialistClinic && <>
      <section className="detail-section medical-specialty-detail"><h3>{text(language, 'medicalSpecialtyLabel')}</h3>
        {specialtyCodes.length ? <div className="medical-specialty-links">{specialtyCodes.map((code) => <a className="medical-specialty-tag" key={code} href={medicalSpecialtyDirectoryUrl(code)} target="_blank" rel="noreferrer">{medicalSpecialtyLabel(code, language)}</a>)}</div> : <p>{text(language, 'medicalSpecialtyUnlisted')}</p>}
      </section>
      <section className="detail-section medical-queue-section"><h3>{text(language, 'medicalQueueTitle')}</h3><p>{text(language, 'medicalEasyQHint')}</p>
        <div className="medical-official-links">
          <a className="secondary-action" href={HA_GO_EASYQ_URL} target="_blank" rel="noreferrer">{text(language, 'medicalEasyQLink')}</a>
          <a className="secondary-action" href={HA_SOPC_WAITING_TIME_URL} target="_blank" rel="noreferrer">{text(language, 'medicalSopcWaitLink')}</a>
          <a className="secondary-action" href={medicalSpecialtyDirectoryUrl(specialtyCodes[0])} target="_blank" rel="noreferrer">{text(language, 'medicalSopcDirectory')}</a>
        </div>
      </section>
    </>}
    {location.booking_phone && <section className="detail-section"><h3>{text(language, 'medicalContact')}</h3><p><a href={`tel:${location.booking_phone.replace(/[^+\d]/g, '')}`}>{location.booking_phone}</a>{location.contact_text ? ` · ${location.contact_text}` : ''}</p></section>}
    <dl className="detail-grid"><div><dt>{text(language, 'medicalCategory')}</dt><dd>{category}</dd></div>{(location.district_tc || location.cluster_tc) && <div><dt>{text(language, 'medicalDistrict')}</dt><dd>{language === 'en' ? (location.district_en || location.cluster_en || location.cluster_tc) : (location.district_tc || location.cluster_tc)}</dd></div>}<div><dt>{text(language, 'medicalChecked')}</dt><dd>{location.source_checked_at}</dd></div></dl>
    {bookingNoteKey && location.booking_notes && <section className="detail-section medical-booking-notes"><h3>{text(language, 'medicalBooking')}</h3><p>{text(language, bookingNoteKey)}</p></section>}
    <div className="detail-actions nearby-facility-actions">
      <a className="primary-action" href={directionsUrl} target="_blank" rel="noreferrer">{text(language, 'walkingNavigation')}</a>
      {bookingUrl && <a className="secondary-action" href={bookingUrl} target="_blank" rel="noreferrer">{text(language, 'medicalOfficialBooking')}</a>}
      <a className="secondary-action" href={placeUrl} target="_blank" rel="noreferrer">{text(language, 'openPlaceOnMap')}</a>
    </div>
    {sourceUrl && <p className="data-note"><a href={sourceUrl} target="_blank" rel="noreferrer">{text(language, 'medicalOfficialSource')}</a></p>}
  </aside>;
}
