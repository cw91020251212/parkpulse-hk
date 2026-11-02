import { useState } from 'react';
import { formatDistance } from '../domain/distance';
import { text, type Language } from '../i18n';
import type { NearbyFacilityViewModel } from '../types';
import './TrafficCameraCard.css';

type Props = { language: Language; item: NearbyFacilityViewModel };

export function TrafficCameraCard({ language, item: { facility, distanceKm, onSelect } }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageAvailable = Boolean(facility.snapshotUrl) && !imageFailed;
  const headingId = `camera-card-${facility.id}`;

  return <article className="nearby-facility-card is-traffic-camera traffic-camera-list-card">
    <button className="camera-card-main" type="button" onClick={onSelect} aria-haspopup="dialog" aria-labelledby={headingId} disabled={!onSelect}>
      <span className="camera-card-image-wrap">
        {imageAvailable ? <><img className="camera-card-image" src={facility.snapshotUrl} alt={text(language, 'trafficCameraImageAlt', { name: facility.name })} width="320" height="240" loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={() => setImageLoaded(true)} onError={() => setImageFailed(true)} />{!imageLoaded && <span className="camera-card-image-loading">{text(language, 'trafficCameraImageLoading')}</span>}</> : <span className="camera-card-image-fallback" role="status">{text(language, 'trafficCameraCardImageFailed')}</span>}
      </span>
      <span className="camera-card-description">
        <span className="camera-card-heading">
          <strong id={headingId}>{facility.name}</strong>
          <span className="camera-card-distance">{formatDistance(distanceKm)}</span>
        </span>
        <span className="camera-card-location">{facility.region} · {facility.district}</span>
        <span className="camera-card-key">{text(language, 'trafficCameraKey', { value: facility.cameraKey ?? facility.id })}</span>
      </span>
    </button>
    <div className="camera-card-footer">
      <span className="camera-card-source">{text(language, 'trafficCameraShortSource')}</span>
      <div className="camera-card-footer-actions">
        {onSelect && <button className="facility-details-button camera-card-detail" type="button" onClick={onSelect}>{text(language, 'details')}</button>}
        {facility.snapshotUrl && <a className="camera-card-original" href={facility.snapshotUrl} target="_blank" rel="noreferrer">{text(language, 'trafficCameraOriginalImage')}</a>}
      </div>
    </div>
  </article>;
}
