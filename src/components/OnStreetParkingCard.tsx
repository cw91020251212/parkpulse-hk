import { formatDistance } from '../domain/distance';
import { text, type Language } from '../i18n';
import type { OnStreetParkingViewModel } from '../types';

type Props = { language: Language; item: OnStreetParkingViewModel; onSelect: () => void };

function typeLabel(language: Language, kind: OnStreetParkingViewModel['onStreet']['kind']) {
  return kind === 'metered' ? text(language, 'meteredParking') : text(language, 'nonMeteredTrial');
}

export function OnStreetParkingCard({ language, item, onSelect }: Props) {
  const { onStreet, distanceKm } = item;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${onStreet.latitude},${onStreet.longitude}&travelmode=driving`;
  const summary = text(language, 'onStreetVacantTotal', { vacant: onStreet.vacant, total: onStreet.total });
  const availability = text(language, 'onStreetOccupiedUnavailable', { occupied: onStreet.occupied, unavailable: onStreet.unavailable });
  return <article className={`toilet-card on-street-card is-${onStreet.occupancy}`}>
    <button className="toilet-card-main on-street-card-main" type="button" onClick={onSelect} aria-label={`${text(language, 'details')}: ${onStreet.name}. ${summary}. ${availability}`}>
      <div className="card-heading"><span className={`toilet-card-icon is-onstreet is-${onStreet.occupancy}`} aria-hidden="true">{onStreet.vacant}</span><div><h3>{onStreet.name}</h3><p>{onStreet.address || text(language, 'addressUnavailable')}</p></div><strong className="distance">{formatDistance(distanceKm)}</strong></div>
      <div className="toilet-facts"><span className="washroom-source is-onstreet">{typeLabel(language, onStreet.kind)}{onStreet.snapshot ? ` · ${text(language, 'snapshot')}` : ''}</span><span className="onstreet-space-summary"><strong>{summary}</strong><em>{availability}</em></span><small className="onstreet-detail-hint">{text(language, 'onStreetTapForDetails')}</small></div>
    </button>
    <div className="toilet-card-actions"><a className="nav-link" href={directions} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{text(language, 'navigation')}</a></div>
  </article>;
}
