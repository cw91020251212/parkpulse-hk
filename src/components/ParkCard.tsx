import { formatAge, formatHeight, formatPrice, isAvailable, PAYMENT_LABELS } from '../domain/carpark';
import { formatDistance } from '../domain/distance';
import type { ParkViewModel, VehicleType } from '../types';

type Props = {
  park: ParkViewModel;
  vehicleType: VehicleType;
  selected: boolean;
  onSelect: () => void;
};

export function ParkCard({ park, vehicleType, selected, onSelect }: Props) {
  const { info, status, distanceKm, heightLimit } = park;
  const facilities = info.facilities ?? [];
  const paymentSummary = (info.paymentMethods ?? [])
    .map((method) => PAYMENT_LABELS[method] ?? method)
    .slice(0, 2)
    .join('／');
  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`;

  return (
    <article className={selected ? 'park-card is-selected' : 'park-card'}>
      <button className="park-card-main" type="button" onClick={onSelect} aria-label={`查看${info.name}詳情`}>
        <div className="card-heading">
          <span className={`status-dot status-${status.kind}`} aria-hidden="true" />
          <div>
            <h3>{info.name}</h3>
            <p>{info.district || info.displayAddress || '香港'}</p>
          </div>
          <strong className="distance">{formatDistance(distanceKm)}</strong>
        </div>
        <div className="availability-line">
          <strong className={`availability status-${status.kind}`}>{status.label}</strong>
          <span>{status.sourceCategory === 'MONTHLY' ? '月租' : vehicleType === 'privateCar' ? '私家車' : '即時資料'}</span>
          {status.stale && <span className="stale-badge">資料可能延遲</span>}
        </div>
        <div className="card-facts">
          <span>車高 {formatHeight(heightLimit)}</span>
          <span>時租 {formatPrice(info, vehicleType)}</span>
          {paymentSummary && <span>{paymentSummary}</span>}
          {facilities.includes('evCharger') && <span>充電</span>}
          {facilities.includes('disabilities') && <span>無障礙</span>}
        </div>
        <p className="updated">{formatAge(status.updatedAt)}</p>
      </button>
      <a className="nav-link" href={navigateUrl} target="_blank" rel="noreferrer" aria-label={`導航至${info.name}`}>
        導航
      </a>
      {!isAvailable(status) && status.kind === 'unknown' && <span className="card-note">營辦商未提供空位資料</span>}
    </article>
  );
}
