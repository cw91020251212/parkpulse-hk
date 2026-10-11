import { publicAsset } from '../api/site';
import { formatDistance } from '../domain/distance';
import { googleMapsPlaceUrl } from '../domain/placeLinks';
import { text, type Language } from '../i18n';
import type { NearbyFacilityViewModel } from '../types';

type Props = { language: Language; item: NearbyFacilityViewModel; onClose: () => void };
const AED_SYMBOL_URL = `${publicAsset('icons/iso-7010-e010-aed.svg')}?v=20261011d`;

function formatSnapshotTime(language: Language, value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language === 'en' ? 'en-HK' : 'zh-HK', { dateStyle: 'medium', timeStyle: 'short', hour12: false });
}

export function NearbyFacilityDetail({ language, item: { facility, distanceKm }, onClose }: Props) {
  const fuel = facility.kind === 'fuel';
  const aed = facility.kind === 'aed';
  const typeLabel = text(language, aed ? 'aed' : fuel ? 'fuel' : 'atmBank');
  const placeUrl = googleMapsPlaceUrl(facility.name, facility.address, facility.latitude, facility.longitude);
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}${fuel ? '&travelmode=driving' : '&travelmode=walking'}`;

  return <aside className="detail-panel nearby-facility-detail-panel" role="dialog" aria-modal="true" aria-label={`${facility.name} ${text(language, 'details')}`}>
    <button className="close-detail" type="button" onClick={onClose} aria-label={text(language, 'closeDetails')}>×</button>
    <p className="eyebrow">{aed && <img className="aed-detail-symbol" src={AED_SYMBOL_URL} alt="" />} {typeLabel} · {formatDistance(distanceKm)}</p>
    <h2>{facility.name}</h2>
    <section className="detail-section">
      <h3>{text(language, 'fullAddress')}</h3>
      <p className="detail-address"><a href={placeUrl} target="_blank" rel="noreferrer">{facility.address || text(language, 'addressUnavailable')}</a></p>
    </section>
    <dl className="detail-grid">
      <div><dt>{text(language, 'facilityType')}</dt><dd>{typeLabel}</dd></div>
      <div><dt>{text(language, 'facilityProvider')}</dt><dd>{facility.brand || facility.source}</dd></div>
    </dl>
    {facility.openingHours && <section className="detail-section"><h3>{text(language, 'openStatus')}</h3><p>{facility.openingHours}</p></section>}
    {facility.remarks && <section className="detail-section"><h3>{text(language, 'details')}</h3><p>{facility.remarks}</p></section>}
    <div className="detail-actions nearby-facility-actions">
      <a className="primary-action" href={navigationUrl} target="_blank" rel="noreferrer">{fuel ? text(language, 'drivingNavigation') : text(language, 'walkingNavigation')}</a>
      <a className="secondary-action" href={placeUrl} target="_blank" rel="noreferrer">{text(language, 'openPlaceOnMap')}</a>
    </div>
    <p className="data-note">{facility.sourceUrl ? <a href={facility.sourceUrl} target="_blank" rel="noreferrer">{facility.source}</a> : facility.source}{aed && facility.snapshotGeneratedAt ? <> · {text(language, 'aedSnapshot', { value: formatSnapshotTime(language, facility.snapshotGeneratedAt) })}</> : null} · {text(language, 'dataDisclaimer', { label: typeLabel })}</p>
  </aside>;
}
