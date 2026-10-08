import { formatDistance } from '../domain/distance';
import { text, type Language } from '../i18n';
import type { OnStreetParkingViewModel } from '../types';

type Props = { language: Language; item: OnStreetParkingViewModel };

function typeLabel(language: Language, kind: OnStreetParkingViewModel['onStreet']['kind']) {
  return kind === 'metered' ? text(language, 'meteredParking') : text(language, 'nonMeteredTrial');
}

function stateLabel(language: Language, state: OnStreetParkingViewModel['onStreet']['occupancy']) {
  return state === 'vacant' ? text(language, 'meterVacant') : state === 'occupied' ? text(language, 'meterOccupied') : text(language, 'meterUnavailable');
}

export function OnStreetParkingCard({ language, item }: Props) {
  const { onStreet, distanceKm } = item;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${onStreet.latitude},${onStreet.longitude}&travelmode=driving`;
  const fee = onStreet.paymentUnit && onStreet.timeUnit ? `$${onStreet.paymentUnit} / ${onStreet.timeUnit} ${language === 'en' ? 'min' : '分鐘'}` : undefined;
  return <article className={`toilet-card on-street-card is-${onStreet.occupancy}`}>
    <div className="toilet-card-main">
      <div className="card-heading"><span className={`toilet-card-icon is-onstreet is-${onStreet.occupancy}`} aria-hidden="true">P</span><div><h3>{onStreet.name}</h3><p>{onStreet.address || text(language, 'addressUnavailable')}</p></div><strong className="distance">{formatDistance(distanceKm)}</strong></div>
      <div className="toilet-facts"><span className="washroom-source is-onstreet">{typeLabel(language, onStreet.kind)}{onStreet.snapshot ? ` · ${text(language, 'snapshot')}` : ''}</span><span>{stateLabel(language, onStreet.occupancy)}</span>{fee && <span>{fee}</span>}{onStreet.operatingPeriod && <span>{text(language, 'meterPeriod')} {onStreet.operatingPeriod === 'D' ? text(language, 'daily') : onStreet.operatingPeriod}</span>}{onStreet.updatedAt && <span>{text(language, 'meterUpdated')} {onStreet.updatedAt}</span>}{onStreet.kind === 'metered' && <span>{text(language, 'meterPaymentHint')}</span>}</div>
    </div>
    <div className="toilet-card-actions"><a className="nav-link" href={directions} target="_blank" rel="noreferrer">{text(language, 'drivingNavigation')}</a></div>
  </article>;
}
