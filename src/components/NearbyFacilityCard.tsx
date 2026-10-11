import { publicAsset } from '../api/site';
import { getFacilityBrandIcon } from '../domain/brandIcons';
import { formatDistance } from '../domain/distance';
import { text, type Language } from '../i18n';
import type { NearbyFacilityViewModel } from '../types';

type Props = { language: Language; item: NearbyFacilityViewModel };
const AED_SYMBOL_URL = `${publicAsset('icons/iso-7010-e010-aed.svg')}?v=20261011d`;

export function NearbyFacilityCard({ language, item }: Props) {
  const { facility, distanceKm, onSelect } = item;
  const fuel = facility.kind === 'fuel';
  const aed = facility.kind === 'aed';
  const tone = fuel ? 'is-fuel' : aed ? 'is-aed' : 'is-atm';
  const brandIcon = aed ? undefined : getFacilityBrandIcon(fuel ? 'fuel' : 'atm', facility.brand);
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}${fuel ? '&travelmode=driving' : '&travelmode=walking'}`;
  const navigation = fuel ? text(language, 'drivingNavigation') : text(language, 'walkingNavigation');
  const openDetailByKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onSelect();
  };

  return <article className={`toilet-card nearby-facility-card ${tone}`}>
    <div className="toilet-card-main nearby-facility-main" role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} aria-haspopup={onSelect ? 'dialog' : undefined} aria-label={onSelect ? `${text(language, 'viewFacilityDetails')}: ${facility.name}` : undefined} onClick={onSelect} onKeyDown={openDetailByKeyboard}>
      <div className="card-heading">
        <span className={`toilet-card-icon ${tone}${brandIcon ? ' is-brand' : ''}`} aria-hidden="true">{brandIcon ? <img src={brandIcon.src} alt="" /> : aed ? <img className="aed-symbol" src={AED_SYMBOL_URL} alt="" /> : fuel ? '⛽' : '🏧'}</span>
        <div><h3>{facility.name}</h3><p>{facility.address}</p></div>
        <span className="distance">{formatDistance(distanceKm)}</span>
      </div>
      <div className="toilet-facts">
        <span className={`washroom-source ${tone}`}>{facility.brand ?? facility.source}</span>
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
