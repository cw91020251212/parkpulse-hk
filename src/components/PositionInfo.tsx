import { Official3DLink } from './Official3DLink';
import { text, type Language } from '../i18n';
import type { Coordinates } from '../types';
import './PositionInfo.css';

export function PositionInfo({ point, language, gps, areaName }: {
  point: Coordinates; language: Language; gps: boolean; areaName: string;
}) {
  return <section className="position-info">
    <strong>{text(language, gps ? 'pinGpsLocation' : 'pinSearchLocation')}</strong>
    {!gps && areaName && <p>{areaName}</p>}
    <p className="position-info-coordinates">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>
    <small>{text(language, 'pinLocationSource')}</small>
    <div className="position-info-actions"><Official3DLink point={point} language={language} compact={false} /></div>
  </section>;
}
