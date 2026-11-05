import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Cartesian3, Entity, Viewer } from 'cesium';
import { attachLandsDScene, getLandsD3DConfig, loadCesium } from '../api/landsd3d';
import { loadNamedPlaces } from '../api/namedPlaces';
import { findNamedPlaces, type NamedPlaceSnapshot } from '../domain/namedPlaces';
import { CAPTURE_3D_EVENT, type LiveMapCapture } from '../domain/official3d';
import { rangeToZoom, zoomToRange } from '../domain/scene3d';
import { useScreenNavigation } from '../hooks/ScreenNavigation';
import { text, type Language } from '../i18n';
import type { Coordinates, MapViewport, SearchScope } from '../types';
import type { MapLibreMarker } from './MapLibreView';
import './PositionInfo.css';
import './MapLibreView.css';
import './CesiumView.css';

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

type CesiumSdk = typeof import('cesium');
type SceneState = { phase: 'loading' | 'preview' | 'refining' | 'ready' | 'error'; pending: number };
type PopupState = { kind: 'position' } | { kind: 'facility'; key: string };
type MarkerEntry = {
  element: HTMLButtonElement;
  html: string;
  world: Cartesian3;
  onSelect: () => void;
  transform: string;
  dispose: () => void;
};
type SceneRuntime = {
  C: CesiumSdk;
  viewer: Viewer;
  viewport: () => MapViewport;
  focus: (point: Coordinates, zoom?: number, bearing?: number) => void;
  project: () => void;
  syncRadius: () => void;
};

// Same native position information as MapLibreView; no Leaflet context or hidden map.
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

function makeMarker(layer: HTMLDivElement, C: CesiumSdk, value: MapLibreMarker): MarkerEntry {
  const element = document.createElement('button');
  element.type = 'button';
  const entry: MarkerEntry = { element, html: '', world: C.Cartesian3.fromDegrees(value.point.lng, value.point.lat), onSelect: value.onSelect, transform: '', dispose: () => {} };
  const click = (event: MouseEvent) => { event.stopPropagation(); entry.onSelect(); };
  const stop = (event: Event) => event.stopPropagation();
  element.addEventListener('click', click);
  const stoppedEvents = ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'keydown', 'keyup', 'dblclick', 'wheel'];
  for (const name of stoppedEvents) element.addEventListener(name, stop);
  entry.dispose = () => {
    element.removeEventListener('click', click);
    for (const name of stoppedEvents) element.removeEventListener(name, stop);
    element.remove();
  };
  updateMarker(entry, C, value);
  layer.appendChild(element);
  return entry;
}

function updateMarker(entry: MarkerEntry, C: CesiumSdk, value: MapLibreMarker) {
  entry.onSelect = value.onSelect;
  if (entry.html !== value.html) { entry.element.innerHTML = value.html; entry.html = value.html; }
  // Deliberately identical to MapLibre's descriptors, including viewed treatment.
  entry.element.className = `maplibregl-marker maplibregl-marker-anchor-bottom maplibre-dom-marker ${value.className}${value.viewed ? ' is-viewed' : ''}`;
  entry.element.style.width = `${value.width}px`;
  entry.element.style.height = `${value.height}px`;
  entry.element.style.zIndex = value.viewed ? '650' : '300';
  entry.element.title = value.title;
  entry.element.setAttribute('aria-label', value.title);
  entry.world = C.Cartesian3.fromDegrees(value.point.lng, value.point.lat);
}

function radiusRing(C: CesiumSdk, point: Coordinates): Cartesian3[] {
  const latitude = C.Math.toRadians(point.lat);
  const longitude = C.Math.toRadians(point.lng);
  const distance = 2_000 / 6_371_008.8;
  const points: Cartesian3[] = [];
  for (let i = 0; i <= 96; i++) {
    const bearing = i / 96 * Math.PI * 2;
    const lat = Math.asin(Math.sin(latitude) * Math.cos(distance) + Math.cos(latitude) * Math.sin(distance) * Math.cos(bearing));
    const lng = longitude + Math.atan2(Math.sin(bearing) * Math.sin(distance) * Math.cos(latitude), Math.cos(distance) - Math.sin(latitude) * Math.sin(lat));
    points.push(C.Cartesian3.fromRadians(lng, lat));
  }
  return points;
}

function fieldOfView(viewer: Viewer): number | undefined {
  const frustum = viewer.camera.frustum;
  return 'fovy' in frustum && typeof frustum.fovy === 'number' ? frustum.fovy : undefined;
}

function installLongPress(runtime: SceneRuntime, container: HTMLDivElement, pick: (point: Coordinates) => void) {
  const { C, viewer } = runtime;
  const pointers = new Set<number>();
  const controller = viewer.scene.screenSpaceCameraController;
  let hold: { id: number; x: number; y: number; timer: number } | undefined;
  let restore: { enabled: boolean; spin: number; translate: number; zoom: number } | undefined;
  let restoreFrame = 0;
  let suppressClickUntil = 0;
  const cancel = () => { if (hold) window.clearTimeout(hold.timer); hold = undefined; };
  const restoreInputs = () => {
    cancelAnimationFrame(restoreFrame);
    if (restore && !viewer.isDestroyed()) {
      controller.enableInputs = restore.enabled;
      controller.inertiaSpin = restore.spin;
      controller.inertiaTranslate = restore.translate;
      controller.inertiaZoom = restore.zoom;
      viewer.scene.requestRender();
    }
    restore = undefined;
  };
  const finish = () => {
    cancel();
    // Let Cesium receive pointerup and consume the held gesture before re-enabling it.
    if (restore) {
      cancelAnimationFrame(restoreFrame);
      restoreFrame = requestAnimationFrame(() => { restoreFrame = requestAnimationFrame(restoreInputs); });
    }
  };
  const blocked = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('.maplibre-dom-marker, .maplibregl-popup, .cesium-map-controls, .cesium-widget-credits, .cesium-credit-lightbox'));
  const down = (event: PointerEvent) => {
    pointers.add(event.pointerId);
    if (pointers.size !== 1 || !event.isPrimary) { cancel(); return; }
    if (event.button !== 0 || blocked(event.target)) return;
    finish();
    viewer.camera.cancelFlight();
    const current = { id: event.pointerId, x: event.clientX, y: event.clientY, timer: 0 };
    hold = current;
    current.timer = window.setTimeout(() => {
      if (hold !== current || pointers.size !== 1 || viewer.isDestroyed()) return;
      const bounds = viewer.canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) { cancel(); return; }
      const screen = new C.Cartesian2((current.x - bounds.left) * viewer.canvas.clientWidth / bounds.width, (current.y - bounds.top) * viewer.canvas.clientHeight / bounds.height);
      let world: Cartesian3 | undefined;
      // Location selection may use the visible mesh; viewport capture never uses roofs.
      if (viewer.scene.pickPositionSupported) {
        try { world = viewer.scene.pickPosition(screen); } catch { /* Try ground below. */ }
      }
      const ray = viewer.camera.getPickRay(screen);
      world ??= ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
      world ??= viewer.camera.pickEllipsoid(screen, viewer.scene.globe.ellipsoid);
      cancel();
      if (!world) return;
      restoreInputs();
      restore = { enabled: controller.enableInputs, spin: controller.inertiaSpin, translate: controller.inertiaTranslate, zoom: controller.inertiaZoom };
      controller.enableInputs = false;
      controller.inertiaSpin = 0;
      controller.inertiaTranslate = 0;
      controller.inertiaZoom = 0;
      viewer.camera.cancelFlight();
      suppressClickUntil = Date.now() + 1_000;
      const coordinates = C.Cartographic.fromCartesian(world);
      pick({ lat: C.Math.toDegrees(coordinates.latitude), lng: C.Math.toDegrees(coordinates.longitude) });
      viewer.scene.requestRender();
    }, 700);
  };
  const move = (event: PointerEvent) => {
    if (hold && event.pointerId === hold.id && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 12) cancel();
  };
  const up = (event: PointerEvent) => { pointers.delete(event.pointerId); if (!hold || event.pointerId === hold.id) finish(); };
  const blur = () => { pointers.clear(); cancel(); restoreInputs(); };
  const contextmenu = (event: Event) => { if (!blocked(event.target)) event.preventDefault(); };
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

export default function CesiumView(props: Props): ReactNode {
  const navigation = useScreenNavigation();
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;
  const live = useRef(props);
  live.current = props;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const popupElementRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLSpanElement>(null);
  const runtimeRef = useRef<SceneRuntime | null>(null);
  const entries = useRef(new Map<string, MarkerEntry>());
  const positionEntry = useRef<MarkerEntry | null>(null);
  const popupRef = useRef<PopupState | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [runtime, setRuntime] = useState<SceneRuntime | null>(null);
  const [sceneState, setSceneState] = useState<SceneState>({ phase: 'loading', pending: 0 });
  const mountedCamera = useRef({ recenterRequest: props.recenterRequest, initialRequest: props.initialView?.request, selected: props.selectedPoint });
  const actionsRef = useRef<{ closePopup: () => void; selectFacility: (key: string) => void; openPosition: () => void }>({ closePopup: () => {}, selectFacility: () => {}, openPosition: () => {} });

  const closePopup = () => {
    if (!popupRef.current) return;
    popupRef.current = null;
    setPopup(null);
    queueMicrotask(() => { if (!popupRef.current) navigationRef.current.retire('popup'); });
  };
  const showPopup = (value: PopupState) => {
    popupRef.current = value;
    setPopup(value);
    navigationRef.current.open('popup', () => actionsRef.current.closePopup());
    runtimeRef.current?.viewer.scene.requestRender();
  };
  const selectFacility = (key: string) => {
    const descriptor = live.current.markers.find(value => value.key === key);
    if (!descriptor || !runtimeRef.current) return;
    closePopup();
    descriptor.onSelect();
    // Parking/roadside descriptors open their detail callback only, never a second popup.
    if (descriptor.popup === undefined || descriptor.popup === null) return;
    showPopup({ kind: 'facility', key });
  };
  const openPosition = () => {
    if (!runtimeRef.current) return;
    if (popupRef.current?.kind === 'position') { closePopup(); return; }
    closePopup();
    showPopup({ kind: 'position' });
  };
  actionsRef.current = { closePopup, selectFacility, openPosition };

  useEffect(() => {
    const container = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !wrapper) return;
    const abort = new AbortController();
    let disposed = false;
    let reportedError = false;
    let viewer: Viewer | undefined;
    let detachScene: (() => void) | undefined;
    let reportFrame = 0;
    let resizeFrame = 0;
    const cleanups: Array<() => void> = [];
    const fail = () => {
      if (disposed || reportedError || abort.signal.aborted) return;
      reportedError = true;
      setSceneState({ phase: 'error', pending: 0 });
      live.current.onError();
    };
    const initialise = async () => {
      try {
        const C: CesiumSdk = await loadCesium();
        if (disposed || abort.signal.aborted) return;
        const config = getLandsD3DConfig();
        if (!config) { fail(); return; }
        // SDK/static URL setup belongs to loadCesium. No ion basemap or World Terrain.
        const currentViewer = new C.Viewer(container, {
          baseLayer: false, baseLayerPicker: false, geocoder: false,
          timeline: false, animation: false, homeButton: false,
          sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false,
          selectionIndicator: false, infoBox: false, requestRenderMode: true,
          scene3DOnly: true, showRenderLoopErrors: false,
          maximumRenderTimeChange: Infinity,
        });
        viewer = currentViewer;
        const scene = currentViewer.scene;
        const officialCredit = new C.Credit(config.attribution, true);
        currentViewer.creditDisplay.addStaticCredit(officialCredit);
        cleanups.push(() => { if (!currentViewer.isDestroyed()) currentViewer.creditDisplay.removeStaticCredit(officialCredit); });
        scene.globe.baseColor = C.Color.fromCssColorString('#d8e5e7');
        scene.globe.depthTestAgainstTerrain = false;
        scene.backgroundColor = C.Color.fromCssColorString('#d8e5e7');
        currentViewer.camera.percentageChanged = 0.01;
        const initial = live.current.initialView;
        let lastCenter = initial?.center ?? live.current.position;
        let lastViewport: MapViewport | undefined;
        const viewport = (): MapViewport => {
          const canvas = currentViewer.canvas;
          const screen = new C.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
          // Exact 2D reference, independent of a progressively refined globe mesh.
          const ground = currentViewer.camera.pickEllipsoid(screen, scene.globe.ellipsoid);
          if (!ground && lastViewport) return lastViewport;
          const world = ground ?? C.Cartesian3.fromDegrees(lastCenter.lng, lastCenter.lat);
          const cartographic = C.Cartographic.fromCartesian(world);
          lastCenter = { lat: C.Math.toDegrees(cartographic.latitude), lng: C.Math.toDegrees(cartographic.longitude) };
          const range = C.Cartesian3.distance(currentViewer.camera.positionWC, world);
          const zoom = rangeToZoom(range, lastCenter.lat, Math.max(1, canvas.clientHeight), fieldOfView(currentViewer));
          const bounds = currentViewer.camera.computeViewRectangle(scene.globe.ellipsoid);
          const span = 360 / (2 ** zoom) * Math.max(1, canvas.clientWidth) / 256;
          const latitudeSpan = span * Math.cos(cartographic.latitude) * Math.max(1, canvas.clientHeight) / Math.max(1, canvas.clientWidth);
          lastViewport = {
            center: lastCenter, zoom,
            north: bounds ? C.Math.toDegrees(bounds.north) : lastCenter.lat + latitudeSpan / 2,
            south: bounds ? C.Math.toDegrees(bounds.south) : lastCenter.lat - latitudeSpan / 2,
            east: bounds ? C.Math.toDegrees(bounds.east) : lastCenter.lng + span / 2,
            west: bounds ? C.Math.toDegrees(bounds.west) : lastCenter.lng - span / 2,
          };
          return lastViewport;
        };
        const focus = (point: Coordinates, zoom?: number, bearing?: number) => {
          if (disposed || currentViewer.isDestroyed()) return;
          const desiredZoom = zoom ?? viewport().zoom ?? 14;
          const target = C.Cartesian3.fromDegrees(point.lng, point.lat);
          const range = zoomToRange(desiredZoom, point.lat, Math.max(1, currentViewer.canvas.clientHeight), fieldOfView(currentViewer));
          const heading = bearing ?? currentViewer.camera.heading;
          const pitch = Math.max(-Math.PI / 2, Math.min(-0.1, currentViewer.camera.pitch));
          currentViewer.camera.cancelFlight();
          currentViewer.camera.lookAt(target, new C.HeadingPitchRange(heading, pitch, range));
          currentViewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
          lastCenter = point;
          lastViewport = undefined;
          scene.requestRender();
        };
        // Match MapLibre's -15° bearing, 55° pitch (Cesium -35°), preserving fractional zoom.
        const target = C.Cartesian3.fromDegrees(lastCenter.lng, lastCenter.lat);
        currentViewer.camera.lookAt(target, new C.HeadingPitchRange(C.Math.toRadians(-15), C.Math.toRadians(-35), zoomToRange(initial?.zoom ?? 14, lastCenter.lat, Math.max(1, currentViewer.canvas.clientHeight), fieldOfView(currentViewer))));
        currentViewer.camera.lookAtTransform(C.Matrix4.IDENTITY);
        const scratch = new C.Cartesian2();
        const difference = new C.Cartesian3();
        const projectPoint = (world: Cartesian3) => {
          C.Cartesian3.subtract(world, currentViewer.camera.positionWC, difference);
          if (C.Cartesian3.dot(difference, currentViewer.camera.directionWC) <= 0) return undefined;
          const screenPoint = C.SceneTransforms.worldToWindowCoordinates(scene, world, scratch);
          if (!screenPoint || !Number.isFinite(screenPoint.x) || !Number.isFinite(screenPoint.y)) return undefined;
          if (screenPoint.x < -80 || screenPoint.y < -80 || screenPoint.x > currentViewer.canvas.clientWidth + 80 || screenPoint.y > currentViewer.canvas.clientHeight + 80) return undefined;
          return screenPoint;
        };
        const project = () => {
          if (disposed || currentViewer.isDestroyed()) return;
          const projectEntry = (entry: MarkerEntry) => {
            const point = projectPoint(entry.world);
            entry.element.hidden = !point;
            if (!point) return;
            const transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -100%)`;
            if (transform !== entry.transform) { entry.element.style.transform = transform; entry.transform = transform; }
          };
          for (const entry of entries.current.values()) projectEntry(entry);
          if (positionEntry.current) projectEntry(positionEntry.current);
          if (compassRef.current) compassRef.current.style.transform = `rotate(${-C.Math.toDegrees(currentViewer.camera.heading)}deg)`;
          const panel = popupElementRef.current;
          const open = popupRef.current;
          if (!panel || !open) return;
          const descriptor = open.kind === 'facility' ? live.current.markers.find(value => value.key === open.key) : undefined;
          const position = open.kind === 'position' ? live.current.position : descriptor?.point;
          const point = position && projectPoint(C.Cartesian3.fromDegrees(position.lng, position.lat));
          panel.hidden = !point;
          if (!point) return;
          const halfWidth = panel.offsetWidth / 2;
          const canvasWidth = currentViewer.canvas.clientWidth;
          const canvasHeight = currentViewer.canvas.clientHeight;
          panel.style.left = `${Math.max(halfWidth + 8, Math.min(canvasWidth - halfWidth - 8, point.x))}px`;
          const markerHeight = open.kind === 'position' ? 40 : descriptor?.height ?? 40;
          panel.style.top = `${Math.max(panel.offsetHeight + 8, Math.min(canvasHeight - 42, point.y - markerHeight - 8))}px`;
        };
        let radiusFill: Entity | undefined;
        let radiusLine: Entity | undefined;
        const syncRadius = () => {
          const current = live.current;
          if (radiusFill) currentViewer.entities.remove(radiusFill);
          if (radiusLine) currentViewer.entities.remove(radiusLine);
          radiusFill = undefined;
          radiusLine = undefined;
          if (current.searchScope === 'radius' && !current.startupLocating) {
            radiusFill = currentViewer.entities.add({
              id: 'parkpulse-search-radius-fill',
              position: C.Cartesian3.fromDegrees(current.position.lng, current.position.lat),
              ellipse: { semiMajorAxis: 2_000, semiMinorAxis: 2_000, material: C.Color.fromCssColorString('#14b8a6').withAlpha(0.09), classificationType: C.ClassificationType.BOTH },
            });
            radiusLine = currentViewer.entities.add({
              id: 'parkpulse-search-radius-line',
              polyline: { positions: radiusRing(C, current.position), width: 2, clampToGround: true, material: C.Color.fromCssColorString('#0d9488'), classificationType: C.ClassificationType.BOTH },
            });
          }
          scene.requestRender();
        };
        const value: SceneRuntime = { C, viewer: currentViewer, viewport, focus, project, syncRadius };
        runtimeRef.current = value;
        const report = () => {
          cancelAnimationFrame(reportFrame);
          reportFrame = requestAnimationFrame(() => { if (!disposed) live.current.onViewportChange(viewport()); });
        };
        const resize = () => {
          cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => { if (!disposed) { currentViewer.resize(); scene.requestRender(); project(); report(); } });
        };
        cleanups.push(scene.postRender.addEventListener(project));
        cleanups.push(currentViewer.camera.moveEnd.addEventListener(report));
        cleanups.push(currentViewer.camera.changed.addEventListener(report));
        // renderError is a failed render loop/GPU event, not a tileset's tileFailed event.
        cleanups.push(scene.renderError.addEventListener(() => fail()));
        const contextLost = () => fail();
        currentViewer.canvas.addEventListener('webglcontextlost', contextLost);
        cleanups.push(() => currentViewer.canvas.removeEventListener('webglcontextlost', contextLost));
        const capture = (event: Event) => {
          const detail = (event as CustomEvent<LiveMapCapture>).detail;
          if (detail && !disposed) detail.viewport = viewport();
        };
        window.addEventListener(CAPTURE_3D_EVENT, capture);
        cleanups.push(() => window.removeEventListener(CAPTURE_3D_EVENT, capture));
        const outsidePopup = (event: PointerEvent) => {
          if (!popupRef.current || !navigationRef.current.isTop('popup')) return;
          if (event.target instanceof Element && event.target.closest('.maplibregl-popup, .maplibre-dom-marker')) return;
          actionsRef.current.closePopup();
        };
        document.addEventListener('pointerdown', outsidePopup, true);
        cleanups.push(() => document.removeEventListener('pointerdown', outsidePopup, true));
        cleanups.push(installLongPress(value, wrapper, point => live.current.onLocationSelect(point, { recenter: false, showManualMarker: true })));
        const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
        observer?.observe(container);
        cleanups.push(() => observer?.disconnect());
        const stopGesture = (event: Event) => event.stopPropagation();
        const overlayEvents = ['pointerdown', 'pointermove', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'wheel', 'dblclick'];
        const overlay = overlayRef.current;
        // Stop popup/marker events before they can reach Cesium's screen-space handler.
        for (const name of overlayEvents) overlay?.addEventListener(name, stopGesture);
        cleanups.push(() => { for (const name of overlayEvents) overlay?.removeEventListener(name, stopGesture); });
        setRuntime(value);
        syncRadius();
        report();
        const detach = await attachLandsDScene(C, currentViewer, config, (state: SceneState) => {
          if (disposed || abort.signal.aborted || reportedError) return;
          if (state.phase === 'error') { fail(); return; }
          setSceneState(state);
          scene.requestRender();
        }, abort.signal);
        if (disposed || abort.signal.aborted) { try { detach(); } catch { /* Viewer already disposed. */ } }
        else detachScene = detach;
      } catch {
        // Async SDK/root failures fall back once; an aborted mount is not an error.
        fail();
      }
    };
    void initialise();
    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(reportFrame);
      cancelAnimationFrame(resizeFrame);
      for (const cleanup of cleanups.reverse()) { try { cleanup(); } catch { /* Continue GPU cleanup. */ } }
      try { detachScene?.(); } catch { /* A root may already have been removed. */ }
      const hadPopup = popupRef.current !== null;
      popupRef.current = null;
      if (hadPopup) queueMicrotask(() => { if (!popupRef.current) navigationRef.current.retire('popup'); });
      for (const entry of entries.current.values()) entry.dispose();
      entries.current.clear();
      positionEntry.current?.dispose();
      positionEntry.current = null;
      runtimeRef.current = null;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
    // One viewer per mount. All asynchronous handlers read the current props through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = overlayRef.current;
    if (!runtime || !layer) return;
    const keys = new Set(props.markers.map(value => value.key));
    for (const [key, entry] of entries.current) if (!keys.has(key)) { entry.dispose(); entries.current.delete(key); }
    for (const descriptor of props.markers) {
      const value = { ...descriptor, onSelect: () => actionsRef.current.selectFacility(descriptor.key) };
      const entry = entries.current.get(value.key);
      if (entry) updateMarker(entry, runtime.C, value);
      else entries.current.set(value.key, makeMarker(layer, runtime.C, value));
    }
    const open = popupRef.current;
    if (open?.kind === 'facility') {
      const descriptor = props.markers.find(value => value.key === open.key);
      if (!descriptor || descriptor.popup === undefined || descriptor.popup === null) actionsRef.current.closePopup();
    }
    runtime.project();
    runtime.viewer.scene.requestRender();
  }, [runtime, props.markers]);

  useEffect(() => {
    const layer = overlayRef.current;
    if (!runtime || !layer) return;
    if (!props.showPositionMarker || props.startupLocating) {
      if (popupRef.current?.kind === 'position') actionsRef.current.closePopup();
      positionEntry.current?.dispose();
      positionEntry.current = null;
    } else {
      const value: MapLibreMarker = {
        key: 'position', point: props.position, html: props.positionHtml,
        className: `selected-center-marker-shell${props.positionIsGps ? ' is-current-location' : ''}`,
        width: props.positionIsGps ? 36 : 32, height: props.positionIsGps ? 40 : 36,
        title: text(props.language, 'pinOpenInfo'), onSelect: () => actionsRef.current.openPosition(),
      };
      if (positionEntry.current) updateMarker(positionEntry.current, runtime.C, value);
      else positionEntry.current = makeMarker(layer, runtime.C, value);
      positionEntry.current.element.style.zIndex = props.positionIsGps ? '10000' : '1000';
    }
    runtime.project();
    runtime.viewer.scene.requestRender();
  }, [runtime, props.showPositionMarker, props.startupLocating, props.position.lat, props.position.lng, props.positionHtml, props.positionIsGps, props.positionLabel, props.language]);

  useEffect(() => { runtime?.syncRadius(); }, [runtime, props.searchScope, props.startupLocating, props.position.lat, props.position.lng]);
  useEffect(() => {
    if (!runtime) return;
    if (props.initialView?.request === mountedCamera.current.initialRequest) return;
    mountedCamera.current.initialRequest = props.initialView?.request;
    if (props.initialView) runtime.focus(props.initialView.center, props.initialView.zoom);
  }, [runtime, props.initialView?.request, props.initialView?.center.lat, props.initialView?.center.lng, props.initialView?.zoom]);
  useEffect(() => {
    if (!runtime || props.recenterRequest === mountedCamera.current.recenterRequest) return;
    mountedCamera.current.recenterRequest = props.recenterRequest;
    if (props.recenterRequest !== 0) runtime.focus(live.current.position);
  }, [runtime, props.recenterRequest]);
  useEffect(() => {
    if (!runtime) return;
    const prior = mountedCamera.current.selected;
    const next = props.selectedPoint;
    mountedCamera.current.selected = next;
    if (next && (next.lat !== prior?.lat || next.lng !== prior?.lng)) runtime.focus(next);
  }, [runtime, props.selectedPoint?.lat, props.selectedPoint?.lng]);
  useEffect(() => {
    if (!runtime) return;
    runtime.viewer.resize();
    runtime.viewer.scene.requestRender();
    const timer = window.setTimeout(() => { runtime.viewer.resize(); runtime.viewer.scene.requestRender(); runtime.project(); }, 240);
    return () => window.clearTimeout(timer);
  }, [runtime, props.expanded]);
  useEffect(() => {
    if (!runtime) return;
    runtime.project();
    runtime.viewer.scene.requestRender();
  }, [runtime, popup, props.markers, props.language, props.positionLabel, sceneState.phase]);

  const english = props.language === 'en';
  const failed = sceneState.phase === 'error';
  const descriptor = popup?.kind === 'facility' ? props.markers.find(value => value.key === popup.key) : undefined;
  const zoomBy = (amount: number) => {
    const current = runtimeRef.current;
    if (!current) return;
    const view = current.viewport();
    current.focus(view.center, (view.zoom ?? 14) + amount);
  };
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();
  return <div ref={wrapperRef} className={`maplibre-wrap cesium-wrap${props.expanded ? ' is-expanded' : ''}`} aria-label={text(props.language, 'mapLabel')}>
    <div ref={containerRef} className="maplibre-view cesium-view" />
    <div ref={overlayRef} className="cesium-dom-overlay">
      {popup && <div ref={popupElementRef} className={`maplibregl-popup maplibregl-popup-anchor-bottom maplibre-position-popup cesium-dom-popup${popup.kind === 'facility' ? ' maplibre-facility-popup' : ''}`} role="dialog" aria-label={popup.kind === 'position' ? text(props.language, 'pinOpenInfo') : descriptor?.title} onPointerDown={stop} onClick={stop}>
        <div className="maplibregl-popup-content">
          <button className="maplibregl-popup-close-button" type="button" aria-label={english ? 'Close' : '關閉'} onClick={() => actionsRef.current.closePopup()}>×</button>
          {popup.kind === 'position' ? <NativePositionInfo point={props.position} language={props.language} gps={props.positionIsGps} areaName={props.positionLabel} /> : descriptor?.popup}
        </div>
        <div className="maplibregl-popup-tip" />
      </div>}
    </div>
    <div className="cesium-map-controls" onPointerDown={stop} onMouseDown={stop} onTouchStart={stop} onWheel={stop} onDoubleClick={stop}>
      <button type="button" title={english ? 'Zoom in' : '放大'} aria-label={english ? 'Zoom in' : '放大'} disabled={!runtime || failed} onClick={() => zoomBy(1)}>+</button>
      <button type="button" title={english ? 'Zoom out' : '縮小'} aria-label={english ? 'Zoom out' : '縮小'} disabled={!runtime || failed} onClick={() => zoomBy(-1)}>−</button>
      <button type="button" title={english ? 'Reset bearing' : '重設方向'} aria-label={english ? 'Reset bearing' : '重設方向'} disabled={!runtime || failed} onClick={() => { const current = runtimeRef.current; if (current) current.focus(current.viewport().center, undefined, 0); }}><span ref={compassRef} className="cesium-compass" aria-hidden="true">↑</span></button>
    </div>
    {(sceneState.phase === 'loading' || props.startupLocating) && !failed && <div className="maplibre-loading-state" role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <span>{props.startupLocating ? text(props.language, 'startupLocationLoading') : english ? 'Loading official textured 3D scene…' : '正在載入官方實景 3D 地圖…'}</span>
    </div>}
    {failed && <div className="maplibre-loading-state" role="status">{english ? '3D is unavailable. Returning to 2D…' : '暫未能載入 3D，正在返回 2D 地圖…'}</div>}
    {!failed && sceneState.phase !== 'loading' && <small className="maplibre-reference-note cesium-scene-status" role="status" aria-live="polite">
      {sceneState.phase === 'ready' ? (english ? 'LandsD official textured 3D · reference only' : '地政總署官方實景 3D · 只供參考') : (english ? 'Official scene visible · automatically refining detail…' : '官方實景已顯示 · 正自動載入更精細細節…')}
    </small>}
  </div>;
}
