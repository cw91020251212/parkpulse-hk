import { FACILITY_LABELS, formatAge, formatHeight, formatPrice, PAYMENT_LABELS } from '../domain/carpark';
import { formatDistance } from '../domain/distance';
import { isStaticPages } from '../api/site';
import { mapsPhotoSearchUrl, usePlacePhoto } from '../hooks/usePlacePhoto';
import type { CarparkInfo, ParkViewModel, VehicleType } from '../types';

type Props = {
  park: ParkViewModel;
  vehicleType: VehicleType;
  onClose: () => void;
};

function formatEpdUpdate(value?: string) {
  if (!value) return '未提供更新時間';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('zh-HK', { hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric' });
}

export function ParkDetail({ park, vehicleType, onClose }: Props) {
  const { info, status, distanceKm, heightLimit, evCharger } = park;
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`;
  const mapsPhotosUrl = mapsPhotoSearchUrl({ name: info.name, address: info.displayAddress });
  const facilities = (info.facilities ?? [])
    .filter((item) => item !== 'evCharger' || !evCharger)
    .map((item) => FACILITY_LABELS[item] ?? item);
  const payments = (info.paymentMethods ?? []).map((item) => PAYMENT_LABELS[item] ?? item);
  const [photoState, setPhotoState] = usePlacePhoto({ id: info.park_Id, name: info.name, address: info.displayAddress, latitude: info.latitude, longitude: info.longitude }, !isStaticPages);

  return (
    <aside className="detail-panel" aria-label={`${info.name}詳情`}>
      <button className="close-detail" type="button" onClick={onClose} aria-label="關閉詳情">×</button>
      <p className="eyebrow">{formatDistance(distanceKm)} · {info.district || '香港'}</p>
      <h2>{info.name}</h2>
      <p className="detail-address">{info.displayAddress || '未提供地址'}</p>
      <div className={`detail-status status-${status.kind}`}><strong>{status.label}</strong><span>{formatAge(status.updatedAt)}</span></div>
      {status.stale && <p className="warning">資料已超過 5 分鐘，實際情況可能有變。</p>}

      {evCharger && (
        <section className="charging-detail">
          <div className="detail-section-heading"><h3>電動車充電</h3><span>位置核實</span></div>
          <p><strong>{evCharger.available === null ? `共 ${evCharger.total} 支充電器` : `${evCharger.available}/${evCharger.total} 支可用`}</strong>{evCharger.types.length ? ` · ${evCharger.types.join('、')}` : ''}</p>
          <small>環境保護署資料 · {formatEpdUpdate(evCharger.updatedAt)} · 與停車場相距約 {evCharger.distanceMeters} 米</small>
        </section>
      )}

      <section className="detail-photo-section" aria-live="polite">
        <div className="detail-section-heading"><h3>附近實景</h3><span>{isStaticPages ? 'Google Maps' : '位置核實'}</span></div>
        {isStaticPages ? (
          <>
            <p className="photo-state">GitHub Pages 版會直接開啟 Google Maps 的相片頁。</p>
            <a className="photo-link" href={mapsPhotosUrl} target="_blank" rel="noreferrer" aria-label={`在 Google Maps 查看${info.name}相片`}>開啟 Google Maps 相片 ↗</a>
          </>
        ) : (
          <>
            {photoState.kind === 'loading' && <p className="photo-state">正在尋找可核實的公開相片…</p>}
            {photoState.kind === 'found' && (
              <figure className="detail-photo">
                <img
                  src={photoState.photo.photoUrl}
                  alt={`${info.name}附近實景相片`}
                  loading="lazy"
                  onError={() => setPhotoState({ kind: 'unavailable', placeUrl: photoState.photo.placeUrl })}
                />
                <figcaption>與停車場位置相距約 {photoState.photo.distanceMeters} 米 · {photoState.photo.attribution} 提供</figcaption>
              </figure>
            )}
            {photoState.kind === 'not_found' && <p className="photo-state">暫未找到可核實的公開相片。</p>}
            {photoState.kind === 'unavailable' && <p className="photo-state">相片暫時未能載入，請到地圖查看。</p>}
            {photoState.kind === 'found' && <a className="photo-link" href={photoState.photo.placeUrl} target="_blank" rel="noreferrer">在 Google Maps 查看更多相片</a>}
            {(photoState.kind === 'not_found' || photoState.kind === 'unavailable') && <a className="photo-link" href={photoState.placeUrl} target="_blank" rel="noreferrer">在 Google Maps 查看更多相片</a>}
          </>
        )}
      </section>

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
      <p className="data-note">空位資料：香港政府 data.gov.hk；充電器：環境保護署；相片：Google Maps。資料只供參考，請以現場情況為準。</p>
    </aside>
  );
}
