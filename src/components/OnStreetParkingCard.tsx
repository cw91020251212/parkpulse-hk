import { formatDistance } from '../domain/distance';
import { text, type Language } from '../i18n';
import type { OnStreetParkingViewModel } from '../types';

type Props = { language: Language; item: OnStreetParkingViewModel; lastViewed: boolean; onSelect: () => void };

function typeLabel(language: Language, kind: OnStreetParkingViewModel['onStreet']['kind']) {
  return kind === 'metered' ? text(language, 'meteredParking') : kind === 'motorcycle' ? text(language, 'motorcycleOnStreet') : text(language, 'nonMeteredTrial');
}

export function OnStreetParkingCard({ language, item, lastViewed, onSelect }: Props) {
  const { onStreet, distanceKm } = item;
  const isStaticMotorcycle = onStreet.static === true;
  const name = language === 'en' ? onStreet.nameEn ?? onStreet.name : onStreet.name;
  const address = language === 'en' ? onStreet.addressEn ?? onStreet.address : onStreet.address;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${onStreet.latitude},${onStreet.longitude}&travelmode=driving`;
  const summary = isStaticMotorcycle ? text(language, 'motorcycleOnStreetSummary', { total: onStreet.total }) : text(language, 'onStreetVacantTotal', { vacant: onStreet.vacant, total: onStreet.total });
  const availability = isStaticMotorcycle ? text(language, 'motorcycleOnStreetNoLive') : text(language, 'onStreetOccupiedUnavailable', { occupied: onStreet.occupied, unavailable: onStreet.unavailable });
  const markerLabel = isStaticMotorcycle ? (onStreet.total > 99 ? '99+' : onStreet.total) : onStreet.vacant;
  const label = `${lastViewed ? `${text(language, 'lastViewed')} · ` : ''}${text(language, 'details')}: ${name}. ${summary}. ${availability}`;
  return <article className={`toilet-card on-street-card is-${onStreet.occupancy}${isStaticMotorcycle ? ' is-motorcycle' : ''}${lastViewed ? ' is-last-viewed' : ''}`}>
    <button className="toilet-card-main on-street-card-main" type="button" onClick={onSelect} aria-current={lastViewed ? 'true' : undefined} aria-label={label}>
      <div className="card-heading"><span className={`toilet-card-icon is-onstreet is-${onStreet.occupancy}${isStaticMotorcycle ? ' is-motorcycle' : ''}`} aria-hidden="true">{markerLabel}</span><div><h3>{name}</h3><p>{address || text(language, 'addressUnavailable')}</p></div><strong className="distance">{formatDistance(distanceKm)}</strong></div>
      <div className="toilet-facts"><span className={`washroom-source is-onstreet${isStaticMotorcycle ? ' is-motorcycle' : ''}`}>{typeLabel(language, onStreet.kind)}{onStreet.snapshot ? ` · ${text(language, 'snapshot')}` : ''}</span><span className="onstreet-space-summary"><strong>{summary}</strong><em>{availability}</em></span><small className="onstreet-detail-hint">{text(language, 'onStreetTapForDetails')}</small></div>
    </button>
    <div className="toilet-card-actions"><a className="nav-link" href={directions} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{text(language, 'navigation')}</a></div>
  </article>;
}
