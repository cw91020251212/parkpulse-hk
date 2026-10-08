import { formatDistance } from '../domain/distance';
import type { PublicToiletViewModel } from '../types';

type Props = { toilet: PublicToiletViewModel };

export function ToiletCard({ toilet: { toilet, distanceKm } }: Props) {
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`;

  return (
    <article className="toilet-card">
      <div className="toilet-card-main">
        <div className="card-heading">
          <span className="toilet-card-icon" aria-hidden="true">🚻</span>
          <div><h3>{toilet.name}</h3><p>{toilet.address ?? '食環署公廁'}</p></div>
          <span className="distance">{formatDistance(distanceKm)}</span>
        </div>
        <div className="toilet-facts">
          <span>{toilet.openingHours ? `開放：${toilet.openingHours}` : '開放時間未提供'}</span>
          {toilet.remarks && <span>{toilet.remarks}</span>}
        </div>
      </div>
      <a className="nav-link" href={navigationUrl} target="_blank" rel="noreferrer" aria-label={`導航至${toilet.name}`}>導航</a>
    </article>
  );
}
