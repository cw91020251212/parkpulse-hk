import { useEffect, useState } from 'react';
import { FACILITY_LABELS, formatAge, formatHeight, formatPrice, PAYMENT_LABELS } from '../domain/carpark';
import { formatDistance } from '../domain/distance';
import type { CarparkInfo, ParkViewModel, VehicleType } from '../types';

type Props = {
  park: ParkViewModel;
  vehicleType: VehicleType;
  onClose: () => void;
};

type PlacePhoto = {
  photoUrl: string;
  placeUrl: string;
  placeName: string;
  distanceMeters: number;
  attribution: string;
};

type PhotoState =
  | { kind: 'loading' }
  | { kind: 'found'; photo: PlacePhoto }
  | { kind: 'not_found'; placeUrl: string }
  | { kind: 'unavailable'; placeUrl: string };

function mapsPhotoSearchUrl(info: CarparkInfo) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${info.name} ${info.displayAddress ?? ''}`.trim())}`;
}

function usePlacePhoto(info: CarparkInfo) {
  const [state, setState] = useState<PhotoState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    const fallbackUrl = mapsPhotoSearchUrl(info);
    setState({ kind: 'loading' });

    const parameters = new URLSearchParams({
      name: info.name,
      address: info.displayAddress ?? '',
      lat: String(info.latitude),
      lng: String(info.longitude),
    });

    fetch(`/api/place-photo?${parameters}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { state?: string } & Partial<PlacePhoto>;
        if (payload.state === 'found' && payload.photoUrl && payload.placeUrl && payload.placeName && typeof payload.distanceMeters === 'number' && payload.attribution) {
          setState({ kind: 'found', photo: payload as PlacePhoto });
          return;
        }
        setState({ kind: payload.state === 'not_found' ? 'not_found' : 'unavailable', placeUrl: payload.placeUrl ?? fallbackUrl });
      })
      .catch((error: unknown) => {
        if ((error as DOMException).name !== 'AbortError') setState({ kind: 'unavailable', placeUrl: fallbackUrl });
      });

    return () => controller.abort();
  }, [info.park_Id, info.name, info.displayAddress, info.latitude, info.longitude]);

  return [state, setState] as const;
}

export function ParkDetail({ park, vehicleType, onClose }: Props) {
  const { info, status, distanceKm, heightLimit } = park;
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`;
  const facilities = (info.facilities ?? []).map((item) => FACILITY_LABELS[item] ?? item);
  const payments = (info.paymentMethods ?? []).map((item) => PAYMENT_LABELS[item] ?? item);
  const [photoState, setPhotoState] = usePlacePhoto(info);

  return (
    <aside className="detail-panel" aria-label={`${info.name}詳情`}>
      <button className="close-detail" type="button" onClick={onClose} aria-label="關閉詳情">×</button>
      <p className="eyebrow">{formatDistance(distanceKm)} · {info.district || '香港'}</p>
      <h2>{info.name}</h2>
      <p className="detail-address">{info.displayAddress || '未提供地址'}</p>
      <div className={`detail-status status-${status.kind}`}><strong>{status.label}</strong><span>{formatAge(status.updatedAt)}</span></div>
      {status.stale && <p className="warning">資料已超過 5 分鐘，實際情況可能有變。</p>}

      <section className="detail-photo-section" aria-live="polite">
        <div className="detail-section-heading"><h3>附近實景</h3><span>位置核實</span></div>
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
        {photoState.kind !== 'loading' && (
          <a className="photo-link" href={photoState.kind === 'found' ? photoState.photo.placeUrl : photoState.placeUrl} target="_blank" rel="noreferrer">在 Google Maps 查看更多相片</a>
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
      <p className="data-note">空位資料：香港政府 data.gov.hk；相片：Google Maps。相片只供辨認位置，請以現場情況為準。</p>
    </aside>
  );
}
