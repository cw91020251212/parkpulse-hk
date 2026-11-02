import { useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { CAPTURE_3D_EVENT, type LiveMapCapture } from '../domain/official3d';
import { DomEvent } from 'leaflet';
import { Official3DLink } from './Official3DLink';
import { text, type Language } from '../i18n';
import type { Coordinates } from '../types';

export type Restore3DView = { center: Coordinates; zoom: number; request: number };
export function Restore3DMapView({ view }: { view?: Restore3DView }) {
  const map = useMap();
  useEffect(() => { if (view) map.stop().setView([view.center.lat, view.center.lng], view.zoom, { animate: false }); }, [map, view]);
  return null;
}
export function Official3DMapControl({ language, canReturn, onReturn }: { language: Language; canReturn: boolean; onReturn: () => void }) {
  const map = useMap();
  const [point, setPoint] = useState(() => ({ lat: map.getCenter().lat, lng: map.getCenter().lng }));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const capture = (event: Event) => {
      // Freeze in-flight GPS/pan animations before leaving; report synchronously even in a background tab.
      map.stop();
      const current = map.getCenter();
      // A stopped flyTo can still expose fractional zoom before zoomSnap finishes.
      map.setView([current.lat, current.lng], Math.round(map.getZoom()), { animate: false });
      const c = map.getCenter(); const b = map.getBounds();
      (event as CustomEvent<LiveMapCapture>).detail.viewport = { center: { lat: c.lat, lng: c.lng }, zoom: map.getZoom(), north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() };
    };
    window.addEventListener(CAPTURE_3D_EVENT, capture);
    return () => window.removeEventListener(CAPTURE_3D_EVENT, capture);
  }, [map]);
  useMapEvents({ moveend() { const c = map.getCenter(); setPoint({ lat: c.lat, lng: c.lng }); } });
  useEffect(() => { if (ref.current) { DomEvent.disableClickPropagation(ref.current); DomEvent.disableScrollPropagation(ref.current); } }, []);
  return <div ref={ref} className="official-3d-map-control leaflet-top leaflet-right">
    <Official3DLink point={point} language={language} compact />
    {canReturn && <p className="official-3d-map-note">{text(language, 'official3dFirstVisit')}</p>}
    {canReturn && <button type="button" className="official-3d-return" onClickCapture={onReturn}>{text(language, 'official3dReturn')}</button>}
  </div>;
}
