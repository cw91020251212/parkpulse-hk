import { useState } from 'react';
import { isStaticPages } from '../api/site';
import { formatDistance } from '../domain/distance';
import { mapsPhotoSearchUrl, usePlacePhoto } from '../hooks/usePlacePhoto';
import type { PublicToiletViewModel } from '../types';

type Props = { toilet: PublicToiletViewModel };

export function ToiletCard({ toilet: { toilet, distanceKm } }: Props) {
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`;
  const mapsPhotosUrl = mapsPhotoSearchUrl({ name: toilet.name, address: toilet.address });
  const isLcsdVenue = toilet.kind === 'lcsdVenue';
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoState, setPhotoState] = usePlacePhoto({ id: toilet.id, name: toilet.name, address: toilet.address, latitude: toilet.latitude, longitude: toilet.longitude }, showPhoto && !isStaticPages);

  return (
    <article className="toilet-card">
      <div className="toilet-card-main">
        <div className="card-heading">
          <span className={isLcsdVenue ? 'toilet-card-icon is-venue' : 'toilet-card-icon'} aria-hidden="true">{isLcsdVenue ? '🏟️' : '🚻'}</span>
          <div><h3>{toilet.name}</h3><p>{toilet.address ?? (isLcsdVenue ? '康文署場館' : '食環署公廁')}</p></div>
          <span className="distance">{formatDistance(distanceKm)}</span>
        </div>
        <div className="toilet-facts">
          <span className={isLcsdVenue ? 'washroom-source is-venue' : 'washroom-source'}>{isLcsdVenue ? '康文署場館洗手間（開放時段）' : '食環署公廁'}</span>
          <span>{toilet.openingHours ? `開放：${toilet.openingHours}` : '開放時間未提供'}</span>
          {toilet.remarks && <span>{toilet.remarks}</span>}
        </div>
        {showPhoto && !isStaticPages && <section className="toilet-photo-section" aria-live="polite">
          {photoState.kind === 'loading' && <p className="photo-state">正在尋找可核實的公開相片…</p>}
          {photoState.kind === 'found' && <figure className="toilet-photo"><img src={photoState.photo.photoUrl} alt={`${toilet.name}附近實景相片`} loading="lazy" onError={() => setPhotoState({ kind: 'unavailable', placeUrl: photoState.photo.placeUrl })} /><figcaption>相距約 {photoState.photo.distanceMeters} 米 · {photoState.photo.attribution} 提供</figcaption></figure>}
          {photoState.kind === 'not_found' && <p className="photo-state">暫未找到可核實的公開相片。</p>}
          {photoState.kind === 'unavailable' && <p className="photo-state">{isStaticPages ? 'GitHub Pages 版本未提供已核實相片，請到地圖查看。' : '相片暫時未能載入，請到地圖查看。'}</p>}
          {photoState.kind === 'found' && <a className="photo-link" href={photoState.photo.placeUrl} target="_blank" rel="noreferrer">在 Google Maps 查看更多相片</a>}
          {(photoState.kind === 'not_found' || photoState.kind === 'unavailable') && <a className="photo-link" href={photoState.placeUrl} target="_blank" rel="noreferrer">在 Google Maps 查看更多相片</a>}
        </section>}
      </div>
      <div className="toilet-card-actions">{isStaticPages ? <a className="toilet-photo-toggle" href={mapsPhotosUrl} target="_blank" rel="noreferrer" aria-label={`在 Google Maps 查看${toilet.name}相片`}>地圖相片 ↗</a> : <button className="toilet-photo-toggle" type="button" onClick={() => setShowPhoto((current) => !current)} aria-expanded={showPhoto}>{showPhoto ? '收起' : '相片'}</button>}<a className="nav-link" href={navigationUrl} target="_blank" rel="noreferrer" aria-label={`導航至${toilet.name}`}>導航</a></div>
    </article>
  );
}
