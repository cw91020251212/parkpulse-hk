import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Map as LibreMap, Marker, NavigationControl, Popup, setWorkerUrl, type ErrorEvent as LibreErrorEvent, type GeoJSONSource } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { loadNamedPlaces } from '../api/namedPlaces';
import { findNamedPlaces, type NamedPlaceSnapshot } from '../domain/namedPlaces';
import { CAPTURE_3D_EVENT, type LiveMapCapture } from '../domain/official3d';
import { text, type Language } from '../i18n';
import type { Coordinates, MapViewport, SearchScope } from '../types';
import { useScreenNavigation } from '../hooks/ScreenNavigation';
import 'maplibre-gl/dist/maplibre-gl.css';
import './PositionInfo.css';
import './MapLibreView.css';

// MapLibre v6 ESM workers must be explicitly bundled by Vite, including Pages base paths.
setWorkerUrl(workerUrl);

export type MapLibreMarker = {
  key: string;
  point: Coordinates;
  html: string;
  className: string;
  width: number;
  height: number;
  title: string;
  viewed?: boolean;
  onSelect: () => void;
  popup?: ReactNode;
};

type Props = {
  language: Language;
  position: Coordinates;
  initialView?: { center: Coordinates; zoom: number; request: number };
  markers: MapLibreMarker[];
  searchScope: SearchScope;
  showPositionMarker: boolean;
  positionHtml: string;
  positionIsGps: boolean;
  positionLabel: string;
  startupLocating: boolean;
  recenterRequest: number;
  selectedPoint?: Coordinates;
  expanded: boolean;
  onViewportChange: (viewport: MapViewport) => void;
  onLocationSelect: (point: Coordinates, behavior: { recenter: boolean; showManualMarker?: boolean }) => void;
  onError: () => void;
};

// Based on the official example, using OpenStreetMap-derived heights, not LandsD models:
// https://www.maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/
const STYLE_URL = 'https://tiles.openfreemap.org/styles/bright';
const BUILDINGS_ID = 'parkpulse-3d-buildings';
const RADIUS_ID = 'parkpulse-search-radius';
const RADIUS_FILL_ID = `${RADIUS_ID}-fill`;
const RADIUS_LINE_ID = `${RADIUS_ID}-line`;
const STYLE_TIMEOUT_MS = 20_000;
const BASEMAP_SOURCE_LAYERS = ['transportation', 'building', 'landuse', 'water'] as const;

function viewportOf(map: LibreMap): MapViewport {
  const bounds = map.getBounds();
  const center = map.getCenter();
  return {
    north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest(),
    center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom(),
  };
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function focus(map: LibreMap, point: Coordinates, zoom?: number) {
  map.easeTo({ center: [point.lng, point.lat], ...(zoom === undefined ? {} : { zoom }), duration: reducedMotion() ? 0 : 400 });
}

function radiusCircle(point: Coordinates): { type: 'Feature'; properties: Record<string, never>; geometry: { type: 'Polygon'; coordinates: number[][][] } } {
  const radians = Math.PI / 180;
  const latitude = point.lat * radians;
  const longitude = point.lng * radians;
  const distance = 2_000 / 6_371_008.8;
  const ring: number[][] = [];
  for (let i = 0; i < 96; i++) {
    const bearing = i / 96 * Math.PI * 2;
    const lat = Math.asin(Math.sin(latitude) * Math.cos(distance) + Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing));
    const lng = longitude + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude), Math.cos(distance) - Math.sin(latitude) * Math.sin(lat));
    ring.push([lng / radians, lat / radians]);
  }
  ring.push([...ring[0]]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

function syncRadius(map: LibreMap, props: Props) {
  const visible = props.searchScope === 'radius' && !props.startupLocating;
  (map.getSource(RADIUS_ID) as GeoJSONSource | undefined)?.setData(radiusCircle(props.position));
  for (const id of [RADIUS_FILL_ID, RADIUS_LINE_ID]) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }
}

function safeNameField(field: unknown): boolean {
  // Leave shields, route numbers and labels that depend on non-name properties alone.
  if (typeof field === 'string') return /^(?:\{name(?::[\w-]+)?\}\s*)+$/.test(field);
  if (!Array.isArray(field)) return false;
  let foundName = false;
  let safe = true;
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (value[0] === 'get' || value[0] === 'has') {
      if (typeof value[1] === 'string' && /^name(?::|_|$)/.test(value[1])) foundName = true;
      else safe = false;
    }
    value.forEach(visit);
  };
  visit(field);
  return foundName && safe;
}

function localizeLabels(map: LibreMap, language: Language) {
  const primary = language === 'en' ? 'name:en' : 'name:zh';
  const alternate = language === 'en' ? 'name_en' : 'name:nonlatin';
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol' || !safeNameField(layer.layout?.['text-field'])) continue;
    try {
      map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', primary], ['get', alternate], ['get', 'name'], ['get', 'name:latin'], ['get', 'name:en'], '']);
    } catch {
      // A label-specific compatibility issue must not discard an otherwise usable map.
    }
  }
}

function installLayers(map: LibreMap, props: Props) {
  const layers = map.getStyle().layers ?? [];
  const labels = layers.find(layer => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;
  // Reuse the vector source already loaded by Bright instead of requesting it twice.
  if (!map.getSource('openmaptiles')) throw new Error('OpenFreeMap vector source is unavailable');
  if (!map.getLayer(BUILDINGS_ID)) {
    map.addLayer({
      id: BUILDINGS_ID, type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14.5,
      filter: ['!=', ['get', 'hide_3d'], true],
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0], 0, '#cdd7db', 200, '#7ca2b3', 400, '#a7c4d0'],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15.5, ['coalesce', ['get', 'render_height'], 0]],
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15.5, ['coalesce', ['get', 'render_min_height'], 0]],
        'fill-extrusion-opacity': 0.88,
      },
    }, labels);
  }
  if (!map.getSource(RADIUS_ID)) map.addSource(RADIUS_ID, { type: 'geojson', data: radiusCircle(props.position) });
  if (!map.getLayer(RADIUS_FILL_ID)) map.addLayer({ id: RADIUS_FILL_ID, type: 'fill', source: RADIUS_ID, paint: { 'fill-color': '#14b8a6', 'fill-opacity': 0.09 } }, BUILDINGS_ID);
  if (!map.getLayer(RADIUS_LINE_ID)) map.addLayer({ id: RADIUS_LINE_ID, type: 'line', source: RADIUS_ID, paint: { 'line-color': '#0d9488', 'line-width': 2, 'line-dasharray': [3, 3] } }, BUILDINGS_ID);
  localizeLabels(map, props.language);
  syncRadius(map, props);
}

function backgroundLongPress(map: LibreMap, pick: (point: Coordinates) => void) {
  const container = map.getContainer();
  const pointers = new Set<number>();
  let hold: { id: number; x: number; y: number; timer: number } | undefined;
  let restorePan = false;
  let suppressClickUntil = 0;
  const cancel = () => {
    if (hold) window.clearTimeout(hold.timer);
    hold = undefined;
  };
  const finish = () => {
    cancel();
    if (restorePan) map.dragPan.enable();
    restorePan = false;
  };
  const blocked = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('.maplibregl-marker, .maplibregl-control-container, .maplibregl-popup, .maplibre-reference-note'));
  const down = (event: PointerEvent) => {
    pointers.add(event.pointerId);
    if (pointers.size !== 1 || !event.isPrimary) { cancel(); return; }
    if (event.button !== 0 || blocked(event.target)) return;
    finish();
    map.stop();
    const current = { id: event.pointerId, x: event.clientX, y: event.clientY, timer: 0 };
    hold = current;
    current.timer = window.setTimeout(() => {
      if (hold !== current || pointers.size !== 1) return;
      map.stop();
      const canvas = map.getCanvas();
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) { cancel(); return; }
      const point = map.unproject([(current.x - bounds.left) * canvas.clientWidth / bounds.width, (current.y - bounds.top) * canvas.clientHeight / bounds.height]);
      restorePan = map.dragPan.isEnabled();
      if (restorePan) map.dragPan.disable();
      suppressClickUntil = Date.now() + 1_000;
      cancel();
      pick({ lat: point.lat, lng: point.lng });
    }, 700);
  };
  const move = (event: PointerEvent) => {
    if (hold && event.pointerId === hold.id && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 12) cancel();
  };
  const up = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (!hold || event.pointerId === hold.id) finish();
  };
  const blur = () => { pointers.clear(); finish(); };
  const contextmenu = (event: Event) => event.preventDefault();
  const click = (event: MouseEvent) => {
    if (Date.now() < suppressClickUntil && !blocked(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  container.addEventListener('pointerdown', down, true);
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);
  window.addEventListener('blur', blur);
  container.addEventListener('pointerleave', cancel);
  container.addEventListener('wheel', cancel, { passive: true });
  container.addEventListener('contextmenu', contextmenu);
  container.addEventListener('click', click, true);
  return () => {
    blur();
    container.removeEventListener('pointerdown', down, true);
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', up, true);
    window.removeEventListener('blur', blur);
    container.removeEventListener('pointerleave', cancel);
    container.removeEventListener('wheel', cancel);
    container.removeEventListener('contextmenu', contextmenu);
    container.removeEventListener('click', click, true);
  };
}

type MarkerEntry = { marker: Marker; element: HTMLButtonElement; html: string; onSelect: () => void; dispose: () => void };

function createMarker(select: () => void): MarkerEntry {
  const element = document.createElement('button');
  element.type = 'button';
  const marker = new Marker({ element, anchor: 'bottom', pitchAlignment: 'viewport', rotationAlignment: 'viewport', opacity: 1, opacityWhenCovered: 1 });
  const entry: MarkerEntry = { marker, element, html: '', onSelect: select, dispose: () => {} };
  const click = (event: MouseEvent) => { event.stopPropagation(); entry.onSelect(); };
  const stop = (event: Event) => event.stopPropagation();
  element.addEventListener('click', click);
  element.addEventListener('pointerdown', stop);
  element.addEventListener('mousedown', stop);
  element.addEventListener('touchstart', stop, { passive: true });
  element.addEventListener('keydown', stop);
  element.addEventListener('keyup', stop);
  entry.dispose = () => {
    element.removeEventListener('click', click);
    element.removeEventListener('pointerdown', stop);
    element.removeEventListener('mousedown', stop);
    element.removeEventListener('touchstart', stop);
    element.removeEventListener('keydown', stop);
    element.removeEventListener('keyup', stop);
    marker.remove();
  };
  return entry;
}

function updateMarker(entry: MarkerEntry, value: MapLibreMarker) {
  entry.onSelect = value.onSelect;
  if (entry.html !== value.html) { entry.element.innerHTML = value.html; entry.html = value.html; }
  entry.element.className = `maplibregl-marker maplibregl-marker-anchor-bottom maplibre-dom-marker ${value.className}${value.viewed ? ' is-viewed' : ''}`;
  entry.element.style.width = `${value.width}px`;
  entry.element.style.height = `${value.height}px`;
  entry.element.style.zIndex = value.viewed ? '650' : '300';
  entry.element.title = value.title;
  entry.element.setAttribute('aria-label', value.title);
  entry.marker.setLngLat([value.point.lng, value.point.lat]);
}

// PositionInfo currently calls react-leaflet's useMap; this native equivalent avoids
// constructing a hidden Leaflet map/context and intentionally adds no second 3D toggle.
function NativePositionInfo({ point, language, gps, areaName }: { point: Coordinates; language: Language; gps: boolean; areaName: string }) {
  const [snapshot, setSnapshot] = useState<NamedPlaceSnapshot>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const matches = useMemo(() => snapshot ? findNamedPlaces(snapshot.places, point) : [], [snapshot, point.lat, point.lng]);
  const primary = matches[0];
  const nameOf = (place: NamedPlaceSnapshot['places'][number]) => language === 'en' ? place.nameEn || place.nameTc : place.nameTc || place.nameEn;
  const address = primary && (language === 'en' ? primary.place.addressEn || primary.place.addressTc : primary.place.addressTc || primary.place.addressEn);
  useEffect(() => {
    let active = true;
    setFailed(false);
    loadNamedPlaces().then(value => { if (active) setSnapshot(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [retry]);
  return <section className="position-info" aria-live="polite" aria-busy={!snapshot && !failed}>
    {primary ? <>
      <strong className="position-info-name">{primary.relation === 'nearby' && <span>{text(language, 'pinNearbyPrefix')}</span>}{nameOf(primary.place)}</strong>
      {address && <p className="position-info-address">{address}</p>}
      {primary.relation === 'nearby' && <p className="position-info-distance">{text(language, 'pinNearbyDistance').replace('{distance}', String(Math.round(primary.distanceMetres)))}</p>}
      {matches.slice(1).filter(match => match.relation === 'inside').map(({ place }) => <p className="position-info-area" key={place.id}>{nameOf(place)}</p>)}
      <a className="position-info-source" href={primary.place.sourceUrl || snapshot?.sourceUrl} target="_blank" rel="noopener noreferrer">{text(language, 'pinOfficialPlaceSource')}</a>
    </> : <>
      <strong>{text(language, gps ? 'pinGpsLocation' : 'pinSearchLocation')}</strong>
      {!gps && areaName && <p>{areaName}</p>}
      <p className="position-info-status">{text(language, failed ? 'pinPlaceLoadFailed' : snapshot ? 'pinPlaceNotFound' : 'pinPlaceLoading')}</p>
      {failed && <button className="position-info-retry" type="button" onClick={() => setRetry(value => value + 1)}>{text(language, 'retry')}</button>}
    </>}
    <details className="position-info-location-details">
      <summary>{text(language, 'pinCoordinateDetails')}</summary>
      <p className="position-info-type">{text(language, gps ? 'pinGpsLocation' : 'pinSearchLocation')}</p>
      <p className="position-info-coordinates">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>
      <p className="position-info-status">{text(language, 'pinLocationSource')}</p>
    </details>
  </section>;
}

type PositionPopup = { popup: Popup; root: Root; close: () => void; disposed: boolean };

export default function MapLibreView(props: Props): ReactNode {
  const navigation = useScreenNavigation();
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const containerRef = useRef<HTMLDivElement>(null);
  const live = useRef(props);
  live.current = props;
  const mapRef = useRef<LibreMap | null>(null);
  const entries = useRef(new Map<string, MarkerEntry>());
  const positionEntry = useRef<MarkerEntry | null>(null);
  const positionPopup = useRef<PositionPopup | null>(null);
  const facilityPopup = useRef<(PositionPopup & { key: string }) | null>(null);
  const [map, setMap] = useState<LibreMap | null>(null);
  const [styleReady, setStyleReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const mountedCamera = useRef({ recenterRequest: props.recenterRequest, initialRequest: props.initialView?.request, selected: props.selectedPoint });

  const renderPositionPopup = () => {
    const value = positionPopup.current;
    if (!value || value.disposed) return;
    const current = live.current;
    value.popup.setLngLat([current.position.lng, current.position.lat]);
    value.root.render(<NativePositionInfo point={current.position} language={current.language} gps={current.positionIsGps} areaName={current.positionLabel} />);
  };

  const closePositionPopup = () => {
    const value = positionPopup.current;
    if (!value) return;
    positionPopup.current = null;
    value.popup.off('close', value.close);
    value.popup.remove();
    // React warns if another root is synchronously unmounted during this root's cleanup.
    if (!value.disposed) { value.disposed = true; queueMicrotask(() => value.root.unmount()); }
    queueMicrotask(() => { if (!positionPopup.current && !facilityPopup.current) navigationRef.current.retire('popup'); });
  };

  const closeFacilityPopup = () => {
    const value = facilityPopup.current;
    if (!value) return;
    facilityPopup.current = null;
    value.popup.off('close', value.close);
    value.popup.remove();
    if (!value.disposed) { value.disposed = true; queueMicrotask(() => value.root.unmount()); }
    queueMicrotask(() => { if (!positionPopup.current && !facilityPopup.current) navigationRef.current.retire('popup'); });
  };

  const selectFacility = (key: string) => {
    const descriptor = live.current.markers.find(value => value.key === key);
    const currentMap = mapRef.current;
    if (!descriptor || !currentMap) return;
    closePositionPopup();
    closeFacilityPopup();
    descriptor.onSelect();
    if (descriptor.popup === undefined || descriptor.popup === null) return;
    const content = document.createElement('div');
    const popup = new Popup({ className: 'maplibre-position-popup maplibre-facility-popup', maxWidth: '320px', offset: [0, -descriptor.height], closeButton: true, closeOnClick: true });
    const value = { popup, root: createRoot(content), close: closeFacilityPopup, disposed: false, key };
    facilityPopup.current = value;
    popup.setDOMContent(content).setLngLat([descriptor.point.lng, descriptor.point.lat]).addTo(currentMap);
    popup.on('close', value.close);
    value.root.render(descriptor.popup);
    navigationRef.current.open('popup', closeFacilityPopup);
  };

  const openPositionPopup = () => {
    const currentMap = mapRef.current;
    if (!currentMap) return;
    if (positionPopup.current) { closePositionPopup(); return; }
    closeFacilityPopup();
    const content = document.createElement('div');
    const popup = new Popup({ className: 'maplibre-position-popup', maxWidth: '280px', offset: [0, -40], closeButton: true, closeOnClick: true });
    const value: PositionPopup = { popup, root: createRoot(content), close: closePositionPopup, disposed: false };
    positionPopup.current = value;
    popup.setDOMContent(content).setLngLat([live.current.position.lng, live.current.position.lat]).addTo(currentMap);
    popup.on('close', value.close);
    renderPositionPopup();
    navigationRef.current.open('popup', closePositionPopup);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let errorReported = false;
    let styleLoaded = false;
    let basemapUsable = false;
    let reportFrame = 0;
    let resizeFrame = 0;
    let timeout = 0;
    let createdMap: LibreMap | undefined;
    let currentMap: LibreMap;
    const fail = () => {
      if (disposed || errorReported) return;
      errorReported = true;
      window.clearTimeout(timeout);
      setFailed(true);
      live.current.onError();
    };
    try {
      const initial = live.current.initialView;
      const center = initial?.center ?? live.current.position;
      currentMap = new LibreMap({
        container, style: STYLE_URL, center: [center.lng, center.lat], zoom: initial?.zoom ?? 14,
        minZoom: 8, maxZoom: 22, pitch: 55, bearing: -15,
        canvasContextAttributes: { antialias: true }, attributionControl: { compact: true },
        locale: live.current.language === 'en' ? undefined : {
          'NavigationControl.ZoomIn': '放大', 'NavigationControl.ZoomOut': '縮小',
          'NavigationControl.ResetBearing': '重設方向', 'AttributionControl.ToggleAttribution': '地圖資料來源',
        },
      });
      createdMap = currentMap;
      currentMap.addControl(new NavigationControl({ showZoom: true, showCompass: true, visualizePitch: true }), 'top-left');
    } catch {
      createdMap?.remove();
      fail();
      return () => { disposed = true; };
    }
    mapRef.current = currentMap;
    setMap(currentMap);
    const report = () => {
      cancelAnimationFrame(reportFrame);
      reportFrame = requestAnimationFrame(() => { if (!disposed) live.current.onViewportChange(viewportOf(currentMap)); });
    };
    const inspectBasemap = () => {
      if (disposed || errorReported || basemapUsable || !styleLoaded) return;
      try {
        // TileJSON/style readiness is not proof that the worker decoded any tiles.
        // One real vector feature suffices, including water-only views; do not wait
        // for every tile, labels, or global idle.
        const rendered = currentMap.queryRenderedFeatures().some(feature => feature.source === 'openmaptiles'
          && BASEMAP_SOURCE_LAYERS.some(layer => layer === feature.sourceLayer));
        const loaded = rendered || BASEMAP_SOURCE_LAYERS.some(sourceLayer =>
          currentMap.querySourceFeatures('openmaptiles', { sourceLayer }).length > 0);
        if (!loaded) return;
        basemapUsable = true;
        window.clearTimeout(timeout);
        setStyleReady(true);
      } catch {
        // Source content can still be in flight; the original watchdog stays armed.
      }
    };
    const sourceData = (event: { sourceId?: string; sourceDataType?: string }) => {
      if (event.sourceId === 'openmaptiles' && event.sourceDataType === 'content') inspectBasemap();
    };
    const load = () => {
      if (disposed || errorReported) return;
      try { installLayers(currentMap, live.current); }
      catch { fail(); return; }
      styleLoaded = true;
      inspectBasemap();
      report();
    };
    const error = (event: LibreErrorEvent) => {
      const metadata = event as LibreErrorEvent & { sourceId?: string; tile?: unknown };
      const cause = event.error as { message: string; url?: string; name?: string };
      if (metadata.sourceId === 'openmaptiles' && !metadata.tile) { fail(); return; }
      if (metadata.sourceId || metadata.tile) return;
      // Ignore individual tile, sprite and glyph errors. Only explicit root-style/GPU
      // errors trigger immediate fallback; missing vector content is covered by the timer.
      const rootStyle = cause.url?.split('?')[0] === STYLE_URL;
      const fatalGpu = cause.name === 'GPUInitializationError' || /failed to initialize webgl/i.test(cause.message);
      if (rootStyle || fatalGpu || (!styleLoaded && /(?:invalid style|style.*(?:validation|parse)|unsupported style version)/i.test(cause.message))) fail();
    };
    const contextLost = () => fail();
    const capture = (event: Event) => {
      const detail = (event as CustomEvent<LiveMapCapture>).detail;
      if (detail && !disposed) detail.viewport = viewportOf(currentMap);
    };
    const outsidePopup = (event: PointerEvent) => {
      if (!positionPopup.current && !facilityPopup.current) return;
      if (!navigationRef.current.isTop('popup')) return;
      if (event.target instanceof Element && event.target.closest('.maplibregl-popup, .maplibre-dom-marker')) return;
      closePositionPopup();
      closeFacilityPopup();
    };
    const removeLongPress = backgroundLongPress(currentMap, point => live.current.onLocationSelect(point, { recenter: false, showManualMarker: true }));
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => { if (!disposed) currentMap.resize(); });
    });
    observer?.observe(container);
    currentMap.on('style.load', load);
    currentMap.on('sourcedata', sourceData);
    currentMap.on('render', inspectBasemap);
    currentMap.on('webglcontextlost', contextLost);
    currentMap.on('error', error);
    currentMap.on('moveend', report);
    currentMap.on('resize', report);
    window.addEventListener(CAPTURE_3D_EVENT, capture);
    document.addEventListener('pointerdown', outsidePopup, true);
    timeout = window.setTimeout(() => { if (!basemapUsable) fail(); }, STYLE_TIMEOUT_MS);
    report();
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      cancelAnimationFrame(reportFrame);
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      removeLongPress();
      window.removeEventListener(CAPTURE_3D_EVENT, capture);
      document.removeEventListener('pointerdown', outsidePopup, true);
      currentMap.off('style.load', load);
      currentMap.off('sourcedata', sourceData);
      currentMap.off('render', inspectBasemap);
      currentMap.off('webglcontextlost', contextLost);
      currentMap.off('error', error);
      currentMap.off('moveend', report);
      currentMap.off('resize', report);
      closePositionPopup();
      closeFacilityPopup();
      for (const entry of entries.current.values()) entry.dispose();
      entries.current.clear();
      positionEntry.current?.dispose();
      positionEntry.current = null;
      mapRef.current = null;
      currentMap.remove();
    };
    // One map per mount; callbacks/props are deliberately read through the live ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;
    const keys = new Set(props.markers.map(value => value.key));
    for (const [key, entry] of entries.current) {
      if (!keys.has(key)) { entry.dispose(); entries.current.delete(key); }
    }
    for (const value of props.markers) {
      let entry = entries.current.get(value.key);
      if (!entry) {
        entry = createMarker(() => selectFacility(value.key));
        updateMarker(entry, { ...value, onSelect: () => selectFacility(value.key) });
        entry.marker.addTo(map);
        entries.current.set(value.key, entry);
      } else updateMarker(entry, { ...value, onSelect: () => selectFacility(value.key) });
    }
    const open = facilityPopup.current;
    if (open) {
      const descriptor = props.markers.find(value => value.key === open.key);
      if (!descriptor || descriptor.popup === undefined || descriptor.popup === null) closeFacilityPopup();
      else {
        open.popup.setLngLat([descriptor.point.lng, descriptor.point.lat]);
        open.root.render(descriptor.popup);
      }
    }
    // The marker's stable event handler delegates through current props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, props.markers]);

  useEffect(() => {
    if (!map) return;
    if (!props.showPositionMarker || props.startupLocating) {
      closePositionPopup();
      positionEntry.current?.dispose();
      positionEntry.current = null;
      return;
    }
    const value: MapLibreMarker = {
      key: 'position', point: props.position, html: props.positionHtml,
      className: `selected-center-marker-shell${props.positionIsGps ? ' is-current-location' : ''}`,
      width: props.positionIsGps ? 36 : 32, height: props.positionIsGps ? 40 : 36,
      title: text(props.language, 'pinOpenInfo'), onSelect: openPositionPopup,
    };
    if (!positionEntry.current) {
      positionEntry.current = createMarker(openPositionPopup);
      updateMarker(positionEntry.current, value);
      positionEntry.current.marker.addTo(map);
    } else updateMarker(positionEntry.current, value);
    positionEntry.current.element.style.zIndex = props.positionIsGps ? '10000' : '1000';
    renderPositionPopup();
    // Popup actions read live props; never reset the map while position information changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, props.showPositionMarker, props.startupLocating, props.position.lat, props.position.lng, props.positionHtml, props.positionIsGps, props.positionLabel, props.language]);

  useEffect(() => {
    if (map && styleReady) syncRadius(map, live.current);
  }, [map, styleReady, props.searchScope, props.startupLocating, props.position.lat, props.position.lng]);

  useEffect(() => {
    if (map && styleReady) localizeLabels(map, props.language);
  }, [map, styleReady, props.language]);

  useEffect(() => {
    if (!map) return;
    const request = props.initialView?.request;
    if (request === mountedCamera.current.initialRequest) return;
    mountedCamera.current.initialRequest = request;
    if (props.initialView) focus(map, props.initialView.center, props.initialView.zoom);
  }, [map, props.initialView?.request, props.initialView?.center.lat, props.initialView?.center.lng, props.initialView?.zoom]);

  useEffect(() => {
    if (!map || props.recenterRequest === mountedCamera.current.recenterRequest) return;
    mountedCamera.current.recenterRequest = props.recenterRequest;
    if (props.recenterRequest === 0) return;
    focus(map, live.current.position);
  }, [map, props.recenterRequest]);

  useEffect(() => {
    if (!map) return;
    const prior = mountedCamera.current.selected;
    const next = props.selectedPoint;
    mountedCamera.current.selected = next;
    if (next && (next.lat !== prior?.lat || next.lng !== prior?.lng)) focus(map, next);
  }, [map, props.selectedPoint?.lat, props.selectedPoint?.lng]);

  useEffect(() => {
    if (!map) return;
    map.resize();
    const timer = window.setTimeout(() => map.resize(), 240);
    return () => window.clearTimeout(timer);
  }, [map, props.expanded]);

  return <div className={`maplibre-wrap${props.expanded ? ' is-expanded' : ''}`} aria-label={text(props.language, 'mapLabel')}>
    <div ref={containerRef} className="maplibre-view" />
    {(!styleReady || props.startupLocating) && !failed && <div className="maplibre-loading-state" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <span>{props.startupLocating ? text(props.language, 'startupLocationLoading') : props.language === 'en' ? 'Loading 3D map…' : '正在載入 3D 地圖…'}</span>
    </div>}
    {failed && <div className="maplibre-loading-state" role="status">{props.language === 'en' ? '3D is unavailable. Returning to 2D…' : '暫未能載入 3D，正在返回 2D 地圖…'}</div>}
    <small className="maplibre-reference-note">{props.language === 'en' ? '3D buildings are for reference only' : '3D 建築資料只供參考'}</small>
  </div>;
}
