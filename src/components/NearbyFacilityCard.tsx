import { formatDistance } from '../domain/distance';
import { getFacilityBrandIcon } from '../domain/brandIcons';
import { text, type Language } from '../i18n';
import type { NearbyFacilityViewModel } from '../types';

type Props = { language: Language; item: NearbyFacilityViewModel };

export function NearbyFacilityCard({ language, item: { facility, distanceKm } }: Props) {
  const fuel = facility.kind === 'fuel';
  const brandIcon = getFacilityBrandIcon(fuel ? 'fuel' : 'atm', facility.brand);
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}${fuel ? '&travelmode=driving' : '&travelmode=walking'}`;
  const navigation = fuel ? text(language, 'drivingNavigation') : text(language, 'walkingNavigation');
  return <article className={fuel ? 'toilet-card nearby-facility-card is-fuel' : 'toilet-card nearby-facility-card is-atm'}><div className="toilet-card-main"><div className="card-heading"><span className={`${fuel ? 'toilet-card-icon is-fuel' : 'toilet-card-icon is-atm'}${brandIcon ? ' is-brand' : ''}`} aria-hidden="true">{brandIcon ? <img src={brandIcon.src} alt="" /> : fuel ? '⛽' : '🏧'}</span><div><h3>{facility.name}</h3><p>{facility.address}</p></div><span className="distance">{formatDistance(distanceKm)}</span></div><div className="toilet-facts"><span className={fuel ? 'washroom-source is-fuel' : 'washroom-source is-atm'}>{facility.brand ?? facility.source}</span>{facility.openingHours && <span>{text(language, 'serviceHours', { value: facility.openingHours })}</span>}{facility.remarks && <span>{facility.remarks}</span>}</div></div><div className="toilet-card-actions"><a className="nav-link" href={navigationUrl} target="_blank" rel="noreferrer" aria-label={`${navigation}: ${facility.name}`}>{navigation}</a></div></article>;
}
