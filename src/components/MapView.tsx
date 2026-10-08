import { useEffect } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { formatDistance } from '../domain/distance';
import type { Coordinates, ParkViewModel, PublicToiletViewModel } from '../types';

type Props = {
  position: Coordinates;
  parks: ParkViewModel[];
  toilets: PublicToiletViewModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLocationSelect: (coordinates: Coordinates, label: string, behavior: { recenter: boolean }) => void;
  recenterRequest: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onShowResults: () => void;
  resultsLabel: string;
};

const LANDSD_BASEMAP_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png';
const LANDSD_LABEL_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/WGS84/{z}/{x}/{y}.png';
const LANDSD_LOGO_URL = 'https://api.hkmapservice.gov.hk/mapapi/landsdlogo.jpg';

function Recenter({ position, request }: { position: Coordinates; request: number }) {
  const map = useMap();
  useEffect(() => {
    if (request === 0) return;
    map.setView([position.lat, position.lng], 14, { animate: true });
  }, [map, position.lat, position.lng, request]);
  return null;
}

function FocusSelected({ park }: { park?: ParkViewModel }) {
  const map = useMap();
  useEffect(() => {
    if (park) map.flyTo([park.info.latitude, park.info.longitude], Math.max(map.getZoom(), 15), { duration: 0.35 });
  }, [map, park]);
  return null;
}

function ResizeMap({ expanded }: { expanded: boolean }) {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize({ animate: true }), 220);
    return () => window.clearTimeout(timer);
  }, [expanded, map]);
  return null;
}

function LongPressPicker({ onPick }: { onPick: (coordinates: Coordinates) => void }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let timer: number | undefined;
    let start: { x: number; y: number } | undefined;
    let startView: { center: L.LatLng; zoom: number } | undefined;
    let dragLocked = false;
    let draggingWasEnabled = false;
    const isBlocked = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('.leaflet-marker-icon, .leaflet-control'));
    const cancel = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      start = undefined;
      startView = undefined;
    };
    const finish = () => {
      cancel();
      if (dragLocked && draggingWasEnabled) map.dragging.enable();
      dragLocked = false;
      draggingWasEnabled = false;
    };
    const begin = (x: number, y: number, target: EventTarget | null) => {
      if (isBlocked(target)) return;
      start = { x, y };
      startView = { center: map.getCenter(), zoom: map.getZoom() };
      draggingWasEnabled = map.dragging.enabled();
      timer = window.setTimeout(() => {
        if (!start || !startView) return;
        map.stop();
        map.setView(startView.center, startView.zoom, { animate: false });
        if (draggingWasEnabled) {
          map.dragging.disable();
          dragLocked = true;
        }
        const bounds = container.getBoundingClientRect();
        const size = map.getSize();
        const latLng = map.containerPointToLatLng([
          (x - bounds.left) * (size.x / bounds.width),
          (y - bounds.top) * (size.y / bounds.height),
        ]);
        onPick({ lat: latLng.lat, lng: latLng.lng });
        window.navigator.vibrate?.(18);
        cancel();
      }, 700);
    };
    const move = (x: number, y: number) => {
      if (start && Math.hypot(x - start.x, y - start.y) > 12) cancel();
    };
    const touchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) begin(touch.clientX, touch.clientY, event.target);
    };
    const touchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) move(touch.clientX, touch.clientY);
    };
    const mouseDown = (event: MouseEvent) => {
      if (event.button === 0) begin(event.clientX, event.clientY, event.target);
    };
    const mouseMove = (event: MouseEvent) => move(event.clientX, event.clientY);
    const preventContextMenu = (event: Event) => event.preventDefault();

    container.addEventListener('touchstart', touchStart, { passive: true });
    container.addEventListener('touchmove', touchMove, { passive: true });
    container.addEventListener('touchend', finish);
    container.addEventListener('touchcancel', finish);
    container.addEventListener('mousedown', mouseDown);
    container.addEventListener('mousemove', mouseMove);
    container.addEventListener('mouseup', finish);
    container.addEventListener('mouseleave', finish);
    container.addEventListener('contextmenu', preventContextMenu);
    return () => {
      finish();
      container.removeEventListener('touchstart', touchStart);
      container.removeEventListener('touchmove', touchMove);
      container.removeEventListener('touchend', finish);
      container.removeEventListener('touchcancel', finish);
      container.removeEventListener('mousedown', mouseDown);
      container.removeEventListener('mousemove', mouseMove);
      container.removeEventListener('mouseup', finish);
      container.removeEventListener('mouseleave', finish);
      container.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [map, onPick]);
  return null;
}

function markerIcon(park: ParkViewModel) {
  const label = park.status.kind === 'count' ? String(park.status.count) : park.status.kind === 'available' ? '有' : park.status.kind === 'full' ? '滿' : park.status.kind === 'closed' ? '關' : '–';
  return L.divIcon({
    className: 'parking-marker-shell',
    html: `<span class="parking-marker marker-${park.status.kind}"><b>${label}</b></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });
}

const selectedCenterIcon = L.divIcon({
  className: 'selected-center-marker-shell',
  html: '<span class="selected-center-marker" aria-hidden="true">📍</span>',
  iconSize: [32, 36],
  iconAnchor: [16, 36],
});

const toiletIcon = L.divIcon({
  className: 'toilet-marker-shell',
  html: '<span class="toilet-marker"><span aria-hidden="true">🚻</span></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

function MapFocusIcon({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <svg className="map-focus-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3 3 3 3-3M9 21l3-3 3 3M3 9l3 3-3 3M21 9l-3 3 3 3" /></svg>
  ) : (
    <svg className="map-focus-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6m0-6 7 7M15 3h6v6m0-6-7 7M9 21H3v-6m0 6 7-7m5 7h6v-6m0 6-7-7" /></svg>
  );
}

export function MapView({ position, parks, toilets, selectedId, onSelect, onLocationSelect, recenterRequest, expanded, onToggleExpanded, onShowResults, resultsLabel }: Props) {
  const selected = parks.find((park) => park.info.park_Id === selectedId);
  const visibleResultCount = parks.length + toilets.length;
  const selectMapPoint = (coordinates: Coordinates) => {
    onLocationSelect(coordinates, '地圖選取位置', { recenter: false });
  };

  return (
    <div className={expanded ? 'map-wrap is-expanded' : 'map-wrap'} aria-label="附近停車場及洗手間地圖">
      <MapContainer center={[position.lat, position.lng]} zoom={14} minZoom={8} maxZoom={20} scrollWheelZoom inertia={false} className="landsd-map">
        <TileLayer
          attribution='&copy; <a href="https://api.portal.hkmapservice.gov.hk/disclaimer" target="_blank" rel="noreferrer">Map information from Lands Department</a>'
          url={LANDSD_BASEMAP_URL}
        />
        <TileLayer url={LANDSD_LABEL_URL} opacity={1} zIndex={10} />
        <Recenter position={position} request={recenterRequest} />
        <FocusSelected park={selected} />
        <ResizeMap expanded={expanded} />
        <LongPressPicker onPick={selectMapPoint} />
        <Circle center={[position.lat, position.lng]} radius={2_000} pathOptions={{ color: '#14B8A6', fillColor: '#14B8A6', fillOpacity: 0.1, weight: 2, dashArray: '6 6' }} />
        <Marker position={[position.lat, position.lng]} icon={selectedCenterIcon} zIndexOffset={1_000} keyboard={false} />
        {parks.map((park) => (
          <Marker
            key={park.info.park_Id}
            position={[park.info.latitude, park.info.longitude]}
            icon={markerIcon(park)}
            eventHandlers={{ click: () => onSelect(park.info.park_Id) }}
          >
            <Tooltip direction="top" offset={[0, -38]} opacity={0.95}>{park.info.name} · {park.status.label}</Tooltip>
          </Marker>
        ))}
        {toilets.map(({ toilet, distanceKm }) => (
          <Marker key={toilet.id} position={[toilet.latitude, toilet.longitude]} icon={toiletIcon} zIndexOffset={300}>
            <Popup><div className="toilet-popup"><strong>{toilet.name}</strong><small>{formatDistance(distanceKm)} · {toilet.openingHours ?? '開放時間未提供'}</small>{toilet.address && <small>{toilet.address}</small>}<a href={`https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`} target="_blank" rel="noreferrer">導航</a></div></Popup>
          </Marker>
        ))}
      </MapContainer>

      <button className="map-focus-toggle" type="button" onClick={onToggleExpanded} aria-pressed={expanded} aria-label={expanded ? '縮細地圖' : '放大地圖'} title={expanded ? '縮細地圖' : '放大地圖'}><MapFocusIcon expanded={expanded} /></button>
      {!expanded && visibleResultCount > 0 && <button className="map-results-link" type="button" onClick={onShowResults}>查看 {resultsLabel} ↓</button>}
      <a className="landsd-credit" href="https://api.portal.hkmapservice.gov.hk/disclaimer" target="_blank" rel="noreferrer">
        <span>地圖資料：地政總署</span><img src={LANDSD_LOGO_URL} alt="地政總署標誌" />
      </a>
    </div>
  );
}
