import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { publicAsset } from '../api/site';
import { getFacilityBrandIcon } from '../domain/brandIcons';
import { borderWaitSummary, formatBorderSnapshotTime } from '../domain/borderWait';
import { formatDistance } from '../domain/distance';
import { emergencyWaitSummary, formatHaUpdateTime } from '../domain/emergencyWait';
import { googleMapsPlaceUrl } from '../domain/placeLinks';
import { text, vacancyLabel, type Language } from '../i18n';
import type { Coordinates, MapViewport, NearbyFacility, NearbyFacilityViewModel, OnStreetParkingGroup, OnStreetParkingViewModel, ParkViewModel, PublicToilet, PublicToiletViewModel, SearchScope } from '../types';
import { washroomSymbolMarkup } from './WashroomSymbol';

type Props = {
  language: Language; position: Coordinates; parks: ParkViewModel[];
  nearbyItems: Array<PublicToiletViewModel | NearbyFacilityViewModel | OnStreetParkingViewModel>;
  selectedId: string | null; viewedMarkerId: string | null;
  onSelect: (id: string) => void; onSelectOnStreet: (id: string) => void; onSelectToilet: (id: string) => void; onViewPopup: (markerKey: string) => void;
  onBeginManualPositionEdit: (id: string) => void; onManualPositionChange: (id: string, coordinates: Coordinates) => void; onCompleteManualPositionEdit: (id: string, coordinates: Coordinates) => void; onCancelManualPositionEdit: () => void;
  manualPositionEditorId: string | null;
  onLocationSelect: (coordinates: Coordinates, behavior: { recenter: boolean }) => void;
  recenterRequest: number; startupLocating: boolean; startupRecenter: boolean; expanded: boolean; searchScope: SearchScope; onViewportChange: (viewport: MapViewport) => void; onToggleExpanded: () => void; onShowResults: () => void; resultsLabel: string;
};

const LANDSD_BASEMAP_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png';
const LANDSD_LABEL_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/WGS84/{z}/{x}/{y}.png';
const LANDSD_MIN_NATIVE_ZOOM = 10;
const LANDSD_MAX_NATIVE_ZOOM = 20;
const MAP_MAX_ZOOM = 22;
const LANDSD_LOGO_URL = 'https://api.hkmapservice.gov.hk/mapapi/landsdlogo.jpg';
const AED_SYMBOL_URL = `${publicAsset('icons/iso-7010-e010-aed.svg')}?v=20261011d`;
const EMERGENCY_SYMBOL_URL = publicAsset('icons/emergency-pill.svg');
const BORDER_SYMBOL_URL = `${publicAsset('icons/border-control.svg')}?v=20261012b`;

function Recenter({ position, request, startup }: { position: Coordinates; request: number; startup: boolean }) { const map = useMap(); const startupFlightUsed = useRef(false); useEffect(() => { if (request === 0) return; if (startup && !startupFlightUsed.current) { startupFlightUsed.current = true; map.flyTo([position.lat, position.lng], 14, { duration: 1.4 }); return; } map.setView([position.lat, position.lng], 14, { animate: true }); }, [map, position.lat, position.lng, request, startup]); return null; }
function FocusSelected({ park }: { park?: ParkViewModel }) { const map = useMap(); useEffect(() => { if (park) map.flyTo([park.info.latitude, park.info.longitude], Math.max(map.getZoom(), 15), { duration: 0.35 }); }, [map, park]); return null; }
function ResizeMap({ expanded }: { expanded: boolean }) { const map = useMap(); useEffect(() => { const timer = window.setTimeout(() => map.invalidateSize({ animate: true }), 220); return () => window.clearTimeout(timer); }, [expanded, map]); return null; }
function ReportViewport({ onChange }: { onChange: (viewport: MapViewport) => void }) {
  const map = useMap();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    let frame = 0;
    const report = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const bounds = map.getBounds();
        const center = map.getCenter();
        onChangeRef.current({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest(), center: { lat: center.lat, lng: center.lng } });
      });
    };
    map.on('moveend zoomend resize', report);
    report();
    return () => { map.off('moveend zoomend resize', report); window.cancelAnimationFrame(frame); };
  }, [map]);
  return null;
}

function ManualToiletLongPress({ editorId, onBegin, onMove, onComplete, onCancel }: { editorId: string | null; onBegin: (id: string) => void; onMove: (id: string, coordinates: Coordinates) => void; onComplete: (id: string, coordinates: Coordinates) => void; onCancel: () => void }) {
  const map = useMap();
  const hold = useRef<{ id: string; timer: number; x: number; y: number; touchId?: number; active: boolean; moved: boolean; position?: Coordinates; draggingWasEnabled: boolean } | null>(null);
  const editorIdRef = useRef(editorId); editorIdRef.current = editorId;
  const callbacks = useRef({ onBegin, onMove, onComplete, onCancel }); callbacks.current = { onBegin, onMove, onComplete, onCancel };
  const stop = useCallback(() => {
    const current = hold.current;
    if (!current) return;
    if (current.timer) window.clearTimeout(current.timer);
    if (current.active && current.draggingWasEnabled) map.dragging.enable();
    hold.current = null;
  }, [map]);
  useEffect(() => {
    const container = map.getContainer();
    let suppressClickId: string | null = null;
    let suppressClickUntil = 0;
    const getPoint = (event: MouseEvent | TouchEvent, touchId?: number) => {
      if ('clientX' in event) return { x: event.clientX, y: event.clientY };
      const touch = [...Array.from(event.touches), ...Array.from(event.changedTouches)].find((item) => touchId === undefined || item.identifier === touchId);
      return touch ? { x: touch.clientX, y: touch.clientY } : undefined;
    };
    const toCoordinates = (point: { x: number; y: number }) => {
      const bounds = container.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return undefined;
      const size = map.getSize();
      const latLng = map.containerPointToLatLng([(point.x - bounds.left) * (size.x / bounds.width), (point.y - bounds.top) * (size.y / bounds.height)]);
      return { lat: latLng.lat, lng: latLng.lng };
    };
    const start = (event: MouseEvent | TouchEvent) => {
      if (editorIdRef.current || !(event.target instanceof Element)) return;
      if ('button' in event && event.button !== 0) return;
      const target = event.target.closest<HTMLElement>('[data-manual-toilet-id]');
      if (!target) return;
      const touchId = 'changedTouches' in event ? (event.touches[0] ?? event.changedTouches[0])?.identifier : undefined;
      const point = getPoint(event, touchId);
      const id = decodeURIComponent(target.dataset.manualToiletId ?? '');
      if (!point || !id) return;
      stop();
      const current = { id, timer: 0, ...point, touchId, active: false, moved: false, draggingWasEnabled: false } as { id: string; timer: number; x: number; y: number; touchId?: number; active: boolean; moved: boolean; position?: Coordinates; draggingWasEnabled: boolean };
      hold.current = current;
      current.timer = window.setTimeout(() => {
        if (hold.current !== current) return;
        current.active = true;
        current.timer = 0;
        current.draggingWasEnabled = map.dragging.enabled();
        if (current.draggingWasEnabled) map.dragging.disable();
        callbacks.current.onBegin(current.id);
      }, 1_300);
    };
    const move = (event: MouseEvent | TouchEvent) => {
      const current = hold.current;
      if (!current) return;
      if ('changedTouches' in event && event.touches.length > 1) {
        if (current.active) {
          if (current.moved && current.position) {
            suppressClickId = encodeURIComponent(current.id);
            suppressClickUntil = Date.now() + 500;
            callbacks.current.onComplete(current.id, current.position);
          } else callbacks.current.onCancel();
        }
        stop();
        return;
      }
      const point = getPoint(event, current.touchId);
      if (!point) return;
      if (!current.active) {
        if (Math.hypot(point.x - current.x, point.y - current.y) > 14) stop();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (Math.hypot(point.x - current.x, point.y - current.y) < 3) return;
      const coordinates = toCoordinates(point);
      if (!coordinates) return;
      current.moved = true;
      current.position = coordinates;
      callbacks.current.onMove(current.id, coordinates);
    };
    const finish = (event: MouseEvent | TouchEvent) => {
      const current = hold.current;
      if (!current) return;
      if ('changedTouches' in event && current.touchId !== undefined && !Array.from(event.changedTouches).some((touch) => touch.identifier === current.touchId)) return;
      if (current.active) {
        if (current.moved && current.position) {
          const point = getPoint(event, current.touchId);
          const coordinates = point ? toCoordinates(point) ?? current.position : current.position;
          suppressClickId = encodeURIComponent(current.id);
          suppressClickUntil = Date.now() + 500;
          callbacks.current.onComplete(current.id, coordinates);
        } else callbacks.current.onCancel();
      }
      stop();
    };
    const suppressDraggedClick = (event: MouseEvent) => {
      if (Date.now() > suppressClickUntil || !suppressClickId || !(event.target instanceof Element)) return;
      const marker = event.target.closest<HTMLElement>('[data-manual-toilet-id]');
      if (marker?.dataset.manualToiletId !== suppressClickId) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      suppressClickId = null;
    };
    const startMouse = (event: MouseEvent) => start(event);
    const startTouch = (event: TouchEvent) => start(event);
    const moveMouse = (event: MouseEvent) => move(event);
    const moveTouch = (event: TouchEvent) => move(event);
    container.addEventListener('mousedown', startMouse, true);
    container.addEventListener('touchstart', startTouch, { capture: true, passive: false });
    window.addEventListener('mousemove', moveMouse, true);
    window.addEventListener('touchmove', moveTouch, { capture: true, passive: false });
    window.addEventListener('mouseup', finish, true);
    window.addEventListener('touchend', finish, true);
    window.addEventListener('touchcancel', finish, true);
    container.addEventListener('click', suppressDraggedClick, true);
    return () => {
      const current = hold.current;
      if (current?.active) {
        if (current.moved && current.position) callbacks.current.onComplete(current.id, current.position);
        else callbacks.current.onCancel();
      }
      stop();
      container.removeEventListener('mousedown', startMouse, true);
      container.removeEventListener('touchstart', startTouch, true);
      window.removeEventListener('mousemove', moveMouse, true);
      window.removeEventListener('touchmove', moveTouch, true);
      window.removeEventListener('mouseup', finish, true);
      window.removeEventListener('touchend', finish, true);
      window.removeEventListener('touchcancel', finish, true);
      container.removeEventListener('click', suppressDraggedClick, true);
    };
  }, [map, stop]);
  return null;
}

function PopupHistory() {
  const map = useMap(); const popupOpen = useRef(false); const historyEntry = useRef(false);
  useEffect(() => {
    const onPopupOpen = () => { popupOpen.current = true; if (historyEntry.current) return; window.history.pushState({ ...(window.history.state ?? {}), parkspotPopup: true }, ''); historyEntry.current = true; };
    const onPopupClose = () => { popupOpen.current = false; window.queueMicrotask(() => { if (popupOpen.current || !historyEntry.current) return; historyEntry.current = false; if (window.history.state?.parkspotPopup === true) window.history.back(); }); };
    const onPopState = (event: PopStateEvent) => { if (!historyEntry.current || event.state?.parkspotPopup === true) return; historyEntry.current = false; popupOpen.current = false; map.closePopup(); };
    map.on('popupopen', onPopupOpen); map.on('popupclose', onPopupClose); window.addEventListener('popstate', onPopState);
    return () => { map.off('popupopen', onPopupOpen); map.off('popupclose', onPopupClose); window.removeEventListener('popstate', onPopState); };
  }, [map]);
  return null;
}

function LongPressPicker({ onPick }: { onPick: (coordinates: Coordinates) => void }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer(); let timer: number | undefined; let start: { x: number; y: number } | undefined; let startView: { center: L.LatLng; zoom: number } | undefined; let dragLocked = false; let draggingWasEnabled = false;
    const isBlocked = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('.leaflet-marker-icon, .leaflet-control'));
    const cancel = () => { if (timer !== undefined) window.clearTimeout(timer); timer = undefined; start = undefined; startView = undefined; };
    const finish = () => { cancel(); if (dragLocked && draggingWasEnabled) map.dragging.enable(); dragLocked = false; draggingWasEnabled = false; };
    const begin = (x: number, y: number, target: EventTarget | null) => { if (isBlocked(target)) return; start = { x, y }; startView = { center: map.getCenter(), zoom: map.getZoom() }; draggingWasEnabled = map.dragging.enabled(); timer = window.setTimeout(() => { if (!start || !startView) return; map.stop(); map.setView(startView.center, startView.zoom, { animate: false }); if (draggingWasEnabled) { map.dragging.disable(); dragLocked = true; } const bounds = container.getBoundingClientRect(); const size = map.getSize(); const latLng = map.containerPointToLatLng([(x - bounds.left) * (size.x / bounds.width), (y - bounds.top) * (size.y / bounds.height)]); onPick({ lat: latLng.lat, lng: latLng.lng }); window.navigator.vibrate?.(18); cancel(); }, 700); };
    const move = (x: number, y: number) => { if (start && Math.hypot(x - start.x, y - start.y) > 12) cancel(); };
    const touchStart = (event: TouchEvent) => { const touch = event.touches[0]; if (touch) begin(touch.clientX, touch.clientY, event.target); }; const touchMove = (event: TouchEvent) => { const touch = event.touches[0]; if (touch) move(touch.clientX, touch.clientY); }; const mouseDown = (event: MouseEvent) => { if (event.button === 0) begin(event.clientX, event.clientY, event.target); }; const mouseMove = (event: MouseEvent) => move(event.clientX, event.clientY); const preventContextMenu = (event: Event) => event.preventDefault();
    container.addEventListener('touchstart', touchStart, { passive: true }); container.addEventListener('touchmove', touchMove, { passive: true }); container.addEventListener('touchend', finish); container.addEventListener('touchcancel', finish); container.addEventListener('mousedown', mouseDown); container.addEventListener('mousemove', mouseMove); container.addEventListener('mouseup', finish); container.addEventListener('mouseleave', finish); container.addEventListener('contextmenu', preventContextMenu);
    return () => { finish(); container.removeEventListener('touchstart', touchStart); container.removeEventListener('touchmove', touchMove); container.removeEventListener('touchend', finish); container.removeEventListener('touchcancel', finish); container.removeEventListener('mousedown', mouseDown); container.removeEventListener('mousemove', mouseMove); container.removeEventListener('mouseup', finish); container.removeEventListener('mouseleave', finish); container.removeEventListener('contextmenu', preventContextMenu); };
  }, [map, onPick]); return null;
}

function markerIcon(park: ParkViewModel, language: Language, viewed: boolean) { const label = park.status.kind === 'count' ? String(park.status.count) : park.status.kind === 'available' ? (language === 'en' ? 'A' : '有') : park.status.kind === 'full' ? (language === 'en' ? 'F' : '滿') : park.status.kind === 'closed' ? (language === 'en' ? 'C' : '關') : '–'; return L.divIcon({ className: 'parking-marker-shell', html: `<span class="parking-marker marker-${park.status.kind}${viewed ? ' is-viewed' : ''}"><b>${label}</b></span>`, iconSize: [38, 38], iconAnchor: [19, 38] }); }
const selectedCenterIcon = L.divIcon({ className: 'selected-center-marker-shell', html: '<span class="selected-center-marker" aria-hidden="true">📍</span>', iconSize: [32, 36], iconAnchor: [16, 36] });
function nearbyIcon(kind?: PublicToilet['kind'] | NearbyFacility['kind'] | OnStreetParkingGroup['kind'], occupancy?: OnStreetParkingGroup['occupancy'], vacant?: number, brand?: string, viewed = false, staticRoadside = false, total = 0, venueLocation = false, locationUnconfirmed = false, manualEditing = false, toiletId?: string) {
  const venue = kind === 'lcsdVenue' || kind === 'hadCommunityToilet' || venueLocation;
  const unconfirmedVenue = kind === 'hadCommunityToilet' || kind === 'afcdLongValleyTemporaryToilets' || locationUnconfirmed;
  const fuel = kind === 'fuel';
  const atm = kind === 'atm';
  const aed = kind === 'aed';
  const emergency = kind === 'emergency';
  const border = kind === 'border';
  const motorcycle = kind === 'motorcycle';
  const onStreet = kind === 'metered' || kind === 'nonMetered' || motorcycle;
  const washroom = !fuel && !atm && !aed && !emergency && !border && !onStreet;
  const brandIcon = fuel || atm ? getFacilityBrandIcon(fuel ? 'fuel' : 'atm', brand) : undefined;
  const count = staticRoadside ? total : vacant ?? 0;
  const label = onStreet ? String(count > 99 ? '99+' : count) : washroom ? washroomSymbolMarkup(venue) : aed ? `<img class="aed-symbol" src="${AED_SYMBOL_URL}" alt="" />` : emergency ? `<img class="emergency-pill-symbol" src="${EMERGENCY_SYMBOL_URL}" alt="" />` : border ? `<img class="border-control-symbol" src="${BORDER_SYMBOL_URL}" alt="" />` : fuel ? '⛽' : '🏧';
  const content = brandIcon ? `<span class="facility-brand-mark" aria-hidden="true"><img src="${brandIcon.src}" alt="" /></span>` : `<span aria-hidden="true">${label}</span>`;
  const editTarget = venue && toiletId ? ` data-manual-toilet-id="${encodeURIComponent(toiletId)}"` : '';
  const tone = venue ? ' is-venue' : fuel ? ' is-fuel' : atm ? ' is-atm' : aed ? ' is-aed' : emergency ? ' is-emergency' : border ? ' is-border' : onStreet ? ` is-onstreet is-${occupancy}${motorcycle ? ' is-motorcycle' : ''}` : '';
  return L.divIcon({ className: 'toilet-marker-shell', html: `<span${editTarget} class="toilet-marker${tone}${unconfirmedVenue ? ' is-location-unconfirmed' : ''}${brandIcon ? ' is-brand' : ''}${viewed ? ' is-viewed' : ''}${manualEditing ? ' is-being-adjusted' : ''}">${content}</span>`, iconSize: [34, 34], iconAnchor: [17, 34] });
}

function MapFocusIcon({ expanded }: { expanded: boolean }) { return expanded ? <svg className="map-focus-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3 3 3 3-3M9 21l3-3 3 3M3 9l3 3-3 3M21 9l-3 3 3 3" /></svg> : <svg className="map-focus-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6m0-6 7 7M15 3h6v6m0-6-7 7M9 21H3v-6m0 6 7-7m5 7h6v-6m0 6-7-7" /></svg>; }

export function MapView({ language, position, parks, nearbyItems, selectedId, viewedMarkerId, onSelect, onSelectOnStreet, onSelectToilet, onViewPopup, onBeginManualPositionEdit, onManualPositionChange, onCompleteManualPositionEdit, onCancelManualPositionEdit, manualPositionEditorId, onLocationSelect, recenterRequest, startupLocating, startupRecenter, expanded, searchScope, onViewportChange, onToggleExpanded, onShowResults, resultsLabel }: Props) {
  const selected = parks.find((park) => park.info.park_Id === selectedId); const visibleResultCount = parks.length + nearbyItems.length;
  const label = (kind?: PublicToilet['kind'] | NearbyFacility['kind'] | OnStreetParkingGroup['kind']) => kind === 'hadCommunityToilet' ? text(language, 'hadCommunityWashroom') : kind === 'afcdLongValleyTemporaryToilets' ? text(language, 'afcdLongValleyTemporaryWashrooms') : kind === 'afcdNatureCentreToilet' ? text(language, 'afcdNatureCentreWashroom') : kind === 'lcsdVenue' ? text(language, 'venueWashroom') : kind === 'lcsdParkToilet' ? text(language, 'lcsdParkWashroom') : kind === 'afcdCountryParkToilet' ? text(language, 'afcdCountryParkWashroom') : kind === 'landsdMapToilet' ? text(language, 'landsdMapToilet') : kind === 'fuel' ? (language === 'en' ? 'Consumer Council fuel station' : '消委會油站') : kind === 'atm' ? (language === 'en' ? 'HKMA ATM' : '金管局 ATM') : kind === 'aed' ? text(language, 'aed') : kind === 'emergency' ? text(language, 'emergencyDepartment') : kind === 'border' ? text(language, 'borderControlPoints') : kind === 'metered' ? text(language, 'meteredParking') : kind === 'nonMetered' ? text(language, 'nonMeteredTrial') : kind === 'motorcycle' ? text(language, 'motorcycleOnStreet') : text(language, 'publicToilet');

  return <div className={expanded ? 'map-wrap is-expanded' : 'map-wrap'} aria-label={text(language, 'mapLabel')}>
    <MapContainer center={[position.lat, position.lng]} zoom={startupLocating ? 10 : 14} minZoom={8} maxZoom={MAP_MAX_ZOOM} scrollWheelZoom inertia={false} className="landsd-map">
      <PopupHistory />
      <ReportViewport onChange={onViewportChange} />
      <ManualToiletLongPress editorId={manualPositionEditorId} onBegin={onBeginManualPositionEdit} onMove={onManualPositionChange} onComplete={onCompleteManualPositionEdit} onCancel={onCancelManualPositionEdit} />
      <TileLayer minNativeZoom={LANDSD_MIN_NATIVE_ZOOM} maxNativeZoom={LANDSD_MAX_NATIVE_ZOOM} maxZoom={MAP_MAX_ZOOM} attribution='&copy; <a href="https://api.portal.hkmapservice.gov.hk/disclaimer" target="_blank" rel="noreferrer">Map information from Lands Department</a>' url={LANDSD_BASEMAP_URL} />
      <TileLayer minNativeZoom={LANDSD_MIN_NATIVE_ZOOM} maxNativeZoom={LANDSD_MAX_NATIVE_ZOOM} maxZoom={MAP_MAX_ZOOM} url={LANDSD_LABEL_URL} opacity={1} zIndex={10} />
      <Recenter position={position} request={recenterRequest} startup={startupRecenter} />
      <FocusSelected park={selected} />
      <ResizeMap expanded={expanded} />
      <LongPressPicker onPick={(coordinates) => onLocationSelect(coordinates, { recenter: false })} />
      {!startupLocating && <>{searchScope === 'radius' && <><Circle center={[position.lat, position.lng]} radius={2_000} pathOptions={{ color: '#14B8A6', fillColor: '#14B8A6', fillOpacity: 0.1, weight: 2, dashArray: '6 6' }} /><Marker position={[position.lat, position.lng]} icon={selectedCenterIcon} zIndexOffset={1_000} keyboard={false} /></>}</>}
      {parks.map((park) => { const viewed = viewedMarkerId === `park:${park.info.park_Id}`; return <Marker key={park.info.park_Id} position={[park.info.latitude, park.info.longitude]} icon={markerIcon(park, language, viewed)} zIndexOffset={viewed ? 600 : 0} eventHandlers={{ click: () => onSelect(park.info.park_Id) }}><Tooltip direction="top" offset={[0, -38]} opacity={0.95}>{park.info.name} · {vacancyLabel(language, park.status)}</Tooltip></Marker>; })}
      {nearbyItems.map((item) => {
        const onStreet = 'onStreet' in item ? item.onStreet : undefined;
        const place = 'toilet' in item ? item.toilet : 'facility' in item ? item.facility : onStreet!;
        const venueLocation = 'toilet' in item && (item.toilet.locationPrecision === 'venue' || item.toilet.locationPrecision === 'venue-uncertain' || item.toilet.kind === 'lcsdVenue');
        const manualPositionEditing = 'toilet' in item && venueLocation && item.toilet.id === manualPositionEditorId;
        const locationUnconfirmed = 'toilet' in item && item.toilet.locationPrecision === 'venue-uncertain';
        const travel = place.kind === 'fuel' || place.kind === 'emergency' || place.kind === 'border' || onStreet ? '&travelmode=driving' : place.kind === 'atm' ? '&travelmode=walking' : '';
        const directions = place.kind === 'fuel' || place.kind === 'emergency' || place.kind === 'border' || onStreet ? text(language, 'drivingNavigation') : place.kind === 'atm' ? text(language, 'walkingNavigation') : venueLocation ? text(language, 'navigateToVenue') : text(language, 'navigation');
        const extra = onStreet ? (onStreet.static ? text(language, 'motorcycleOnStreetNoLive') : text(language, 'onStreetSpaceSummary', { vacant: onStreet.vacant, total: onStreet.total, occupied: onStreet.occupied, unavailable: onStreet.unavailable })) : place.kind === 'emergency' ? emergencyWaitSummary(language, place.emergencyWait) : place.kind === 'border' ? borderWaitSummary(language, place.borderWait) : 'openingHours' in place ? place.openingHours ?? text(language, 'openingUnavailable') : text(language, 'openingUnavailable');
        const markerKey = 'toilet' in item ? `toilet:${item.toilet.id}` : 'facility' in item ? `facility:${item.facility.id}` : `onstreet:${onStreet!.id}`;
        const viewed = viewedMarkerId === markerKey; const brand = 'brand' in place ? place.brand : undefined;
        const placeUrl = googleMapsPlaceUrl(place.name, place.address, place.latitude, place.longitude);
        const selectFacility = 'facility' in item ? item.onSelect : undefined;
        const selectToilet = 'toilet' in item ? () => onSelectToilet(item.toilet.id) : undefined;
        const markerEvents: L.LeafletEventHandlerFnMap = { ...(onStreet ? { click: () => onSelectOnStreet(onStreet.id) } : {}), ...(!onStreet && !manualPositionEditing ? { popupopen: () => onViewPopup(markerKey) } : {}) };
        return <Marker key={place.id} position={[place.latitude, place.longitude]} icon={nearbyIcon(place.kind, onStreet?.occupancy, onStreet?.vacant, brand, viewed, onStreet?.static, onStreet?.total, venueLocation, locationUnconfirmed, manualPositionEditing, venueLocation && 'toilet' in item ? item.toilet.id : undefined)} zIndexOffset={viewed || manualPositionEditing ? 600 : 300} draggable={false} bubblingMouseEvents={!venueLocation} eventHandlers={markerEvents}>
          {!onStreet && !manualPositionEditing && <Popup><div className="toilet-popup">
            {selectToilet ? <div className="toilet-popup-detail-row">
              <button className="toilet-popup-detail-trigger" type="button" aria-haspopup="dialog" aria-label={`${text(language, 'viewFacilityDetails')}: ${place.name}`} onClick={selectToilet}>
                <strong>{place.name}</strong>
                <small>{label(place.kind)}</small>
                <small>{venueLocation ? text(language, 'distanceToVenue', { value: formatDistance(item.distanceKm) }) : formatDistance(item.distanceKm)} · {extra}</small>
                {venueLocation && <small>{place.kind === 'hadCommunityToilet' ? text(language, 'hadVenuePrecision') : place.kind === 'afcdLongValleyTemporaryToilets' ? text(language, 'afcdLongValleyTemporaryPrecision') : text(language, 'venueLocationPrecision')}</small>}
                {'remarks' in place && place.remarks && <small>{place.remarks}</small>}
              </button>
              <button className="toilet-popup-detail-action" type="button" aria-haspopup="dialog" aria-label={`${text(language, 'viewFacilityDetails')}: ${place.name}`} onClick={selectToilet}>{text(language, 'details')}</button>
            </div> : <>{place.kind === 'emergency' ? <span className="emergency-popup-heading"><img src={EMERGENCY_SYMBOL_URL} alt="" /><strong>{place.name}</strong></span> : place.kind === 'border' ? <span className="border-popup-heading"><img src={BORDER_SYMBOL_URL} alt="" /><strong>{place.name}</strong></span> : <strong>{place.name}</strong>}<small>{place.kind === 'aed' ? `${label(place.kind)} · ${text(language, 'aedSources')}` : place.kind === 'emergency' ? `${label(place.kind)} · ${text(language, 'emergencySources')}` : place.kind === 'border' ? `${label(place.kind)} · ${text(language, 'borderSources')}` : label(place.kind)}</small><small className={place.kind === 'emergency' ? 'emergency-popup-wait' : place.kind === 'border' ? 'border-popup-wait' : undefined}>{formatDistance(item.distanceKm)} · {extra}</small></>}
            {place.kind === 'emergency' && <small className="emergency-popup-notice">{text(language, 'emergencyUrgentNotice')}</small>}
            {place.kind === 'emergency' && <small className="emergency-popup-update">{text(language, 'emergencyUpdated', { value: formatHaUpdateTime(language, place.emergencyWait?.updatedAt) })}</small>}{place.kind === 'border' && <small className="border-popup-update">{text(language, 'borderSnapshot', { value: formatBorderSnapshotTime(language, place.borderWait?.snapshotGeneratedAt) })}</small>}
            <a className="map-popup-address" href={placeUrl} target="_blank" rel="noreferrer">{place.address || text(language, 'addressUnavailable')}</a>
            {selectFacility && <button className="map-popup-detail-button" type="button" onClick={selectFacility}>{text(language, 'viewFacilityDetails')}</button>}
            <a className="map-popup-directions" href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}${travel}`} target="_blank" rel="noreferrer">{directions}</a>
          </div></Popup>}
        </Marker>;
      })}
    </MapContainer>
    {startupLocating && <div className="map-startup-location-state" role="status" aria-live="polite"><span className="loader" /><span>{text(language, 'startupLocationLoading')}</span></div>}
    <button className="map-focus-toggle" type="button" onClick={onToggleExpanded} aria-pressed={expanded} aria-label={expanded ? text(language, 'mapCollapse') : text(language, 'mapExpand')} title={expanded ? text(language, 'mapCollapse') : text(language, 'mapExpand')}><MapFocusIcon expanded={expanded} /></button>
    {!expanded && visibleResultCount > 0 && <button className="map-results-link" type="button" onClick={onShowResults}>{text(language, 'showResults', { count: resultsLabel })}</button>}
    <a className="landsd-credit" href="https://api.portal.hkmapservice.gov.hk/disclaimer" target="_blank" rel="noreferrer"><span>{text(language, 'landsdCredit')}</span><img src={LANDSD_LOGO_URL} alt={text(language, 'landsdLogo')} /></a>
  </div>;
}
