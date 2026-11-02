import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { CAPTURE_3D_EVENT, type LiveMapCapture } from '../domain/official3d';
import type { Coordinates } from '../types';

export type Restore3DView = { center: Coordinates; zoom: number; request: number };
export function Restore3DMapView({ view }: { view?: Restore3DView }) {
  const map = useMap();
  useEffect(() => {
    if (view) map.stop().setView([view.center.lat, view.center.lng], view.zoom, { animate: false });
  }, [map, view]);
  return null;
}

/** Captures the map for external toolbar links. Intentionally renders no map UI. */
export function Capture3DMapView() {
  const map = useMap();
  useEffect(() => {
    const capture = (event: Event) => {
      map.stop();
      const current = map.getCenter();
      map.setView([current.lat, current.lng], Math.round(map.getZoom()), { animate: false });
      const center = map.getCenter();
      const bounds = map.getBounds();
      (event as CustomEvent<LiveMapCapture>).detail.viewport = {
        center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom(),
        north: bounds.getNorth(), south: bounds.getSouth(),
        east: bounds.getEast(), west: bounds.getWest(),
      };
    };
    window.addEventListener(CAPTURE_3D_EVENT, capture);
    return () => window.removeEventListener(CAPTURE_3D_EVENT, capture);
  }, [map]);
  return null;
}
