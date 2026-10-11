import { publicAsset } from '../api/site';
import { formatDistance } from '../domain/distance';
import { formatHaUpdateTime } from '../domain/emergencyWait';
import { googleMapsPlaceUrl } from '../domain/placeLinks';
import { text, type Language } from '../i18n';
import type { EmergencyWaitTime, NearbyFacilityViewModel } from '../types';

type Props = { language: Language; item: NearbyFacilityViewModel; onClose: () => void };
const AED_SYMBOL_URL = `${publicAsset('icons/iso-7010-e010-aed.svg')}?v=20261011d`;
const EMERGENCY_SYMBOL_URL = publicAsset('icons/emergency-pill.svg');

function formatSnapshotTime(language: Language, value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language === 'en' ? 'en-HK' : 'zh-HK', { dateStyle: 'medium', timeStyle: 'short', hour12: false });
}

function priorityValue(language: Language, value: string, managed: boolean) {
  if (managed) return text(language, 'emergencyImmediate');
  return value || text(language, 'emergencyNotProvided');
}

function EmergencyWaitingTimes({ language, wait }: { language: Language; wait?: EmergencyWaitTime }) {
  if (!wait) return null;
  return <section className="detail-section emergency-waiting-section">
    <h3>{text(language, 'emergencyWaitingTimes')}</h3>
    <dl className="emergency-wait-grid">
      <div><dt>{text(language, 'emergencyPriority1')}</dt><dd>{priorityValue(language, wait.priority1Wait, wait.priority1Managed)}</dd></div>
      <div><dt>{text(language, 'emergencyPriority2')}</dt><dd>{priorityValue(language, wait.priority2Wait, wait.priority2Managed)}</dd></div>
      <div><dt>{text(language, 'emergencyPriority3')}</dt><dd>{text(language, 'emergencyMedian', { value: wait.priority3Median || text(language, 'emergencyNotProvided') })}<br /><small>{text(language, 'emergencyP95', { value: wait.priority3P95 || text(language, 'emergencyNotProvided') })}</small></dd></div>
      <div><dt>{text(language, 'emergencyPriority45')}</dt><dd>{text(language, 'emergencyMedian', { value: wait.priority45Median || text(language, 'emergencyNotProvided') })}<br /><small>{text(language, 'emergencyP95', { value: wait.priority45P95 || text(language, 'emergencyNotProvided') })}</small></dd></div>
    </dl>
    <p className="emergency-update">{text(language, 'emergencyUpdated', { value: formatHaUpdateTime(language, wait.updatedAt) })}</p>
  </section>;
}

export function NearbyFacilityDetail({ language, item: { facility, distanceKm }, onClose }: Props) {
  const fuel = facility.kind === 'fuel';
  const aed = facility.kind === 'aed';
  const emergency = facility.kind === 'emergency';
  const typeLabel = text(language, emergency ? 'emergencyDepartment' : aed ? 'aed' : fuel ? 'fuel' : 'atmBank');
  const placeUrl = googleMapsPlaceUrl(facility.name, facility.address, facility.latitude, facility.longitude);
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}${fuel || emergency ? '&travelmode=driving' : '&travelmode=walking'}`;

  return <aside className="detail-panel nearby-facility-detail-panel" role="dialog" aria-modal="true" aria-label={`${facility.name} ${text(language, 'details')}`}>
    <button className="close-detail" type="button" onClick={onClose} aria-label={text(language, 'closeDetails')}>×</button>
    <p className="eyebrow">{aed && <img className="aed-detail-symbol" src={AED_SYMBOL_URL} alt="" />}{emergency && <img className="emergency-detail-symbol" src={EMERGENCY_SYMBOL_URL} alt="" />} {typeLabel} · {formatDistance(distanceKm)}</p>
    <h2>{facility.name}</h2>
    {emergency && <p className="emergency-urgent-notice" role="note">{text(language, 'emergencyUrgentNotice')}</p>}
    <section className="detail-section">
      <h3>{text(language, 'fullAddress')}</h3>
      <p className="detail-address"><a href={placeUrl} target="_blank" rel="noreferrer">{facility.address || text(language, 'addressUnavailable')}</a></p>
      {emergency && <p className="emergency-location-note">{text(language, 'emergencyLocationNote')}</p>}
    </section>
    {emergency && <EmergencyWaitingTimes language={language} wait={facility.emergencyWait} />}
    <dl className="detail-grid">
      <div><dt>{text(language, 'facilityType')}</dt><dd>{typeLabel}</dd></div>
      <div><dt>{text(language, 'facilityProvider')}</dt><dd>{facility.brand || facility.source}</dd></div>
    </dl>
    {facility.openingHours && <section className="detail-section"><h3>{text(language, 'openStatus')}</h3><p>{facility.openingHours}</p></section>}
    {facility.remarks && <section className="detail-section"><h3>{text(language, 'details')}</h3><p>{facility.remarks}</p></section>}
    <div className="detail-actions nearby-facility-actions">
      <a className="primary-action" href={navigationUrl} target="_blank" rel="noreferrer">{fuel || emergency ? text(language, 'drivingNavigation') : text(language, 'walkingNavigation')}</a>
      <a className="secondary-action" href={placeUrl} target="_blank" rel="noreferrer">{text(language, 'openPlaceOnMap')}</a>
    </div>
    <p className="data-note">{emergency ? <><a href={facility.sourceUrl} target="_blank" rel="noreferrer">{text(language, 'emergencyWaitSource')}</a>{facility.locationSourceUrl && <> · <a href={facility.locationSourceUrl} target="_blank" rel="noreferrer">{text(language, 'emergencyLocationSource')}</a></>}{facility.coordinateTransformSourceUrl && <> · <a href={facility.coordinateTransformSourceUrl} target="_blank" rel="noreferrer">{text(language, 'emergencyCoordinateSource')}</a></>}</> : facility.sourceUrl ? <a href={facility.sourceUrl} target="_blank" rel="noreferrer">{facility.source}</a> : facility.source}{aed && facility.snapshotGeneratedAt ? <> · {text(language, 'aedSnapshot', { value: formatSnapshotTime(language, facility.snapshotGeneratedAt) })}</> : null} · {text(language, 'dataDisclaimer', { label: typeLabel })}</p>
  </aside>;
}
