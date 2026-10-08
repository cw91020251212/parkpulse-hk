import { formatDistance } from '../domain/distance';
import type { NearbyFacilityViewModel } from '../types';

type Props = { item: NearbyFacilityViewModel };

export function NearbyFacilityCard({ item: { facility, distanceKm } }: Props) {
  const fuel = facility.kind === 'fuel';
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}${fuel ? '&travelmode=driving' : '&travelmode=walking'}`;
  return (
    <article className={fuel ? 'toilet-card nearby-facility-card is-fuel' : 'toilet-card nearby-facility-card is-atm'}>
      <div className="toilet-card-main">
        <div className="card-heading">
          <span className={fuel ? 'toilet-card-icon is-fuel' : 'toilet-card-icon is-atm'} aria-hidden="true">{fuel ? '⛽' : '🏧'}</span>
          <div><h3>{facility.name}</h3><p>{facility.address}</p></div>
          <span className="distance">{formatDistance(distanceKm)}</span>
        </div>
        <div className="toilet-facts">
          <span className={fuel ? 'washroom-source is-fuel' : 'washroom-source is-atm'}>{facility.brand ?? facility.source}</span>
          {facility.openingHours && <span>服務時間：{facility.openingHours}</span>}
          {facility.remarks && <span>{facility.remarks}</span>}
        </div>
      </div>
      <div className="toilet-card-actions"><a className="nav-link" href={navigationUrl} target="_blank" rel="noreferrer" aria-label={`${fuel ? '駕駛導航' : '步行導航'}至${facility.name}`}>{fuel ? '駕駛導航' : '步行導航'}</a></div>
    </article>
  );
}
