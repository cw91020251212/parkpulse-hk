import { publicAsset } from '../api/site';
import { getFacilityBrandIcon } from '../domain/brandIcons';
import { borderWaitSummary, formatBorderSnapshotTime } from '../domain/borderWait';
import { formatDistance } from '../domain/distance';
import { emergencyWaitSummary, formatHaUpdateTime } from '../domain/emergencyWait';
import { text, type Language } from '../i18n';
import type { NearbyFacilityViewModel } from '../types';

type Props = { language: Language; item: NearbyFacilityViewModel };
const AED_SYMBOL_URL = `${publicAsset('icons/iso-7010-e010-aed.svg')}?v=20261011d`;
const EMERGENCY_SYMBOL_URL = publicAsset('icons/emergency-pill.svg');
const BORDER_SYMBOL_URL = `${publicAsset('icons/border-control.svg')}?v=20261012b`;

export function NearbyFacilityCard({ language, item }: Props) {
  const { facility, distanceKm, onSelect } = item;
  const fuel = facility.kind === 'fuel';
  const aed = facility.kind === 'aed';
  const emergency = facility.kind === 'emergency';
  const border = facility.kind === 'border';
  const tone = fuel ? 'is-fuel' : aed ? 'is-aed' : emergency ? 'is-emergency' : border ? 'is-border' : 'is-atm';
  const brandIcon = aed || emergency || border ? undefined : getFacilityBrandIcon(fuel ? 'fuel' : 'atm', facility.brand);
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}${fuel || emergency || border ? '&travelmode=driving' : '&travelmode=walking'}`;
  const navigation = fuel || emergency || border ? text(language, 'drivingNavigation') : text(language, 'walkingNavigation');
  const openDetailByKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onSelect();
  };

  return <article className={`toilet-card nearby-facility-card ${tone}`}>
    <div className="toilet-card-main nearby-facility-main" role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} aria-haspopup={onSelect ? 'dialog' : undefined} aria-label={onSelect ? `${text(language, 'viewFacilityDetails')}: ${facility.name}` : undefined} onClick={onSelect} onKeyDown={openDetailByKeyboard}>
      <div className="card-heading">
        <span className={`toilet-card-icon ${tone}${brandIcon ? ' is-brand' : ''}`} aria-hidden="true">{brandIcon ? <img src={brandIcon.src} alt="" /> : aed ? <img className="aed-symbol" src={AED_SYMBOL_URL} alt="" /> : emergency ? <img className="emergency-pill-symbol" src={EMERGENCY_SYMBOL_URL} alt="" /> : border ? <img className="border-control-symbol" src={BORDER_SYMBOL_URL} alt="" /> : fuel ? '⛽' : '🏧'}</span>
        <div><h3>{facility.name}</h3><p>{facility.address}</p></div>
        <span className="distance">{formatDistance(distanceKm)}</span>
      </div>
      <div className="toilet-facts">
        <span className={`washroom-source ${tone}`}>{emergency ? text(language, 'emergencySources') : border ? text(language, 'borderSources') : facility.brand ?? facility.source}</span>
        {emergency && <span className="emergency-wait-summary">{emergencyWaitSummary(language, facility.emergencyWait)}</span>}
        {emergency && <span>{text(language, 'emergencyUpdated', { value: formatHaUpdateTime(language, facility.emergencyWait?.updatedAt) })}</span>}
        {emergency && <span className="emergency-location-note">{text(language, 'emergencyLocationNote')}</span>}
        {border && <span className="border-wait-summary">{borderWaitSummary(language, facility.borderWait)}</span>}
        {border && <span>{text(language, 'borderSnapshot', { value: formatBorderSnapshotTime(language, facility.borderWait?.snapshotGeneratedAt) })}</span>}
        {border && <span className="border-location-note">{text(language, 'borderLocationNote')}</span>}
        {facility.openingHours && <span>{text(language, 'serviceHours', { value: facility.openingHours })}</span>}
        {facility.remarks && <span>{facility.remarks}</span>}
      </div>
    </div>
    <div className="toilet-card-actions">
      {onSelect && <button className="facility-details-button" type="button" onClick={onSelect}>{text(language, 'viewFacilityDetails')}</button>}
      <a className="nav-link" href={navigationUrl} target="_blank" rel="noreferrer" aria-label={`${navigation}: ${facility.name}`}>{navigation}</a>
    </div>
  </article>;
}
