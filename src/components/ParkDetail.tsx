import { FACILITY_LABELS, formatAge, formatHeight, formatPrice, PAYMENT_LABELS } from '../domain/carpark';
import { formatDistance } from '../domain/distance';
import type { ParkViewModel, VehicleType } from '../types';

type Props = {
  park: ParkViewModel;
  vehicleType: VehicleType;
  onClose: () => void;
};

export function ParkDetail({ park, vehicleType, onClose }: Props) {
  const { info, status, distanceKm, heightLimit } = park;
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`;
  const facilities = (info.facilities ?? []).map((item) => FACILITY_LABELS[item] ?? item);
  const payments = (info.paymentMethods ?? []).map((item) => PAYMENT_LABELS[item] ?? item);

  return (
    <aside className="detail-panel" aria-label={`${info.name}詳情`}>
      <button className="close-detail" type="button" onClick={onClose} aria-label="關閉詳情">×</button>
      <p className="eyebrow">{formatDistance(distanceKm)} · {info.district || '香港'}</p>
      <h2>{info.name}</h2>
      <p className="detail-address">{info.displayAddress || '未提供地址'}</p>
      <div className={`detail-status status-${status.kind}`}><strong>{status.label}</strong><span>{formatAge(status.updatedAt)}</span></div>
      {status.stale && <p className="warning">資料已超過 5 分鐘，實際情況可能有變。</p>}
      <dl className="detail-grid">
        <div><dt>車高限制</dt><dd>{formatHeight(heightLimit)}</dd></div>
        <div><dt>基本時租</dt><dd>{formatPrice(info, vehicleType)}</dd></div>
        <div><dt>開放狀態</dt><dd>{info.opening_status === 'CLOSED' ? '已關閉' : '開放中／請以現場為準'}</dd></div>
        <div><dt>聯絡電話</dt><dd>{info.contactNo || '未提供'}</dd></div>
      </dl>
      <section className="detail-section"><h3>設施</h3><p>{facilities.length ? facilities.join(' · ') : '未提供'}</p></section>
      <section className="detail-section"><h3>付款方式</h3><p>{payments.length ? payments.join(' · ') : '未提供'}</p></section>
      <div className="detail-actions">
        <a className="primary-action" href={navigationUrl} target="_blank" rel="noreferrer">開啟導航</a>
        {info.website && <a className="secondary-action" href={info.website} target="_blank" rel="noreferrer">停車場網站</a>}
      </div>
      <p className="data-note">資料來源：香港政府 data.gov.hk。空位資料僅供參考，請以現場情況為準。</p>
    </aside>
  );
}
