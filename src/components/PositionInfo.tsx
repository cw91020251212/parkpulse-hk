import { useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-leaflet';
import { Official3DLink } from './Official3DLink';
import { text, type Language } from '../i18n';
import { loadNamedPlaces } from '../api/namedPlaces';
import { findNamedPlaces, type NamedPlaceSnapshot } from '../domain/namedPlaces';
import type { Coordinates } from '../types';
import './PositionInfo.css';

export function PositionInfo({ point, language, gps, areaName }: {
  point: Coordinates; language: Language; gps: boolean; areaName: string;
}) {
  const map = useMap();
  const [snapshot, setSnapshot] = useState<NamedPlaceSnapshot>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const matches = useMemo(() => snapshot ? findNamedPlaces(snapshot.places, point) : [], [snapshot, point.lat, point.lng]);
  const primary = matches[0];
  const name = primary && (language === 'zh-Hant' ? primary.place.nameTc || primary.place.nameEn : primary.place.nameEn || primary.place.nameTc);
  const address = primary && (language === 'zh-Hant' ? primary.place.addressTc || primary.place.addressEn : primary.place.addressEn || primary.place.addressTc);

  useEffect(() => {
    let active = true;
    setFailed(false);
    loadNamedPlaces().then(value => { if (active) setSnapshot(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => map.eachLayer(layer => layer.getPopup?.()?.update()));
    return () => cancelAnimationFrame(frame);
  }, [map, snapshot, failed, matches.length, language, point.lat, point.lng]);

  return <section className="position-info" aria-live="polite" aria-busy={!snapshot && !failed}>
    {primary ? <>
      <strong className="position-info-name">{primary.relation === 'nearby' && <span>{text(language, 'pinNearbyPrefix')}</span>}{name}</strong>
      {address && <p className="position-info-address">{address}</p>}
      {primary.relation === 'nearby' && <p className="position-info-distance">{text(language, 'pinNearbyDistance').replace('{distance}', String(Math.round(primary.distanceMetres)))}</p>}
      {matches.slice(1).filter(match => match.relation === 'inside').map(({ place }) => {
        const otherName = language === 'zh-Hant' ? place.nameTc || place.nameEn : place.nameEn || place.nameTc;
        return otherName !== name && <p className="position-info-area" key={place.id}>{otherName}</p>;
      })}
      <a className="position-info-source" href={primary.place.sourceUrl || snapshot?.sourceUrl} target="_blank" rel="noopener noreferrer">{text(language, 'pinOfficialPlaceSource')}</a>
    </> : <>
      <strong>{text(language, gps ? 'pinGpsLocation' : 'pinSearchLocation')}</strong>
      {!gps && areaName && <p>{areaName}</p>}
      <p className="position-info-status">{text(language, failed ? 'pinPlaceLoadFailed' : snapshot ? 'pinPlaceNotFound' : 'pinPlaceLoading')}</p>
      {failed && <button className="position-info-retry" onClick={() => setRetry(value => value + 1)}>{text(language, 'retry')}</button>}
    </>}
    <details className="position-info-location-details" onToggle={() => map.eachLayer(layer => layer.getPopup?.()?.update())}>
      <summary>{text(language, 'pinCoordinateDetails')}</summary>
      <p className="position-info-type">{text(language, gps ? 'pinGpsLocation' : 'pinSearchLocation')}</p>
      <p className="position-info-coordinates">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>
      {snapshot && <small>{text(language, 'pinPlaceDataDate')} {new Date(primary?.place.updatedAt || snapshot.updatedAt || snapshot.generatedAt).toLocaleDateString(language === 'zh-Hant' ? 'zh-HK' : 'en-GB')}<br />{text(language, 'pinPlaceSnapshotDate')} {new Date(snapshot.generatedAt).toLocaleDateString(language === 'zh-Hant' ? 'zh-HK' : 'en-GB')}{snapshot.retrievalUrl && <> · <a href={snapshot.retrievalUrl} target="_blank" rel="noopener noreferrer">open-data.hk</a></>}</small>}
    </details>
    <div className="position-info-actions"><Official3DLink point={point} language={language} compact={false} /></div>
  </section>;
}
