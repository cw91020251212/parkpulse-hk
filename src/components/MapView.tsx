import { useEffect, useState, type FormEvent } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Coordinates, ParkViewModel } from '../types';

type Props = {
  position: Coordinates;
  parks: ParkViewModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLocationSelect: (coordinates: Coordinates, label: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  onShowResults: () => void;
};

type District = {
  label: string;
  aliases: string[];
  coordinates: Coordinates;
};

const LANDSD_BASEMAP_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png';
const LANDSD_LABEL_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/WGS84/{z}/{x}/{y}.png';
const LANDSD_LOGO_URL = 'https://api.hkmapservice.gov.hk/mapapi/landsdlogo.jpg';

const DISTRICTS: District[] = [
  { label: '中西區', aliases: ['中西區', '中西', 'central and western'], coordinates: { lat: 22.2855, lng: 114.1546 } },
  { label: '灣仔區', aliases: ['灣仔區', '灣仔', 'wan chai'], coordinates: { lat: 22.279, lng: 114.173 } },
  { label: '東區', aliases: ['東區', 'eastern'], coordinates: { lat: 22.284, lng: 114.224 } },
  { label: '南區', aliases: ['南區', 'southern'], coordinates: { lat: 22.247, lng: 114.158 } },
  { label: '油尖旺區', aliases: ['油尖旺區', '油尖旺', 'yau tsim mong'], coordinates: { lat: 22.319, lng: 114.169 } },
  { label: '深水埗區', aliases: ['深水埗區', '深水埗', 'sham shui po'], coordinates: { lat: 22.329, lng: 114.16 } },
  { label: '九龍城區', aliases: ['九龍城區', '九龍城', 'kowloon city'], coordinates: { lat: 22.33, lng: 114.188 } },
  { label: '黃大仙區', aliases: ['黃大仙區', '黃大仙', 'wong tai sin'], coordinates: { lat: 22.341, lng: 114.193 } },
  { label: '觀塘區', aliases: ['觀塘區', '觀塘', 'kwun tong'], coordinates: { lat: 22.313, lng: 114.225 } },
  { label: '葵青區', aliases: ['葵青區', '葵青', 'kwai tsing'], coordinates: { lat: 22.353, lng: 114.129 } },
  { label: '荃灣區', aliases: ['荃灣區', '荃灣', 'tsuen wan'], coordinates: { lat: 22.371, lng: 114.117 } },
  { label: '屯門區', aliases: ['屯門區', '屯門', 'tuen mun'], coordinates: { lat: 22.391, lng: 113.975 } },
  { label: '元朗區', aliases: ['元朗區', '元朗', 'yuen long'], coordinates: { lat: 22.445, lng: 114.022 } },
  { label: '北區', aliases: ['北區', 'north district'], coordinates: { lat: 22.5, lng: 114.132 } },
  { label: '大埔區', aliases: ['大埔區', '大埔', 'tai po'], coordinates: { lat: 22.4501, lng: 114.1688 } },
  { label: '沙田區', aliases: ['沙田區', '沙田', 'sha tin'], coordinates: { lat: 22.387, lng: 114.195 } },
  { label: '西貢區', aliases: ['西貢區', '西貢', 'sai kung'], coordinates: { lat: 22.383, lng: 114.271 } },
  { label: '離島區', aliases: ['離島區', '離島', 'islands'], coordinates: { lat: 22.281, lng: 113.943 } },
];

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s-]+/g, '');

function Recenter({ position }: { position: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], 14, { animate: true });
  }, [map, position.lat, position.lng]);
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

    const cancel = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      start = undefined;
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('.leaflet-marker-icon, .leaflet-control')) return;
      start = { x: event.clientX, y: event.clientY };
      timer = window.setTimeout(() => {
        const point = map.mouseEventToContainerPoint(event);
        const latLng = map.containerPointToLatLng(point);
        onPick({ lat: latLng.lat, lng: latLng.lng });
        window.navigator.vibrate?.(15);
        cancel();
      }, 900);
    };
    const pointerMove = (event: PointerEvent) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) cancel();
    };

    container.addEventListener('pointerdown', pointerDown);
    container.addEventListener('pointermove', pointerMove);
    container.addEventListener('pointerup', cancel);
    container.addEventListener('pointercancel', cancel);
    container.addEventListener('pointerleave', cancel);
    container.addEventListener('contextmenu', cancel);
    return () => {
      cancel();
      container.removeEventListener('pointerdown', pointerDown);
      container.removeEventListener('pointermove', pointerMove);
      container.removeEventListener('pointerup', cancel);
      container.removeEventListener('pointercancel', cancel);
      container.removeEventListener('pointerleave', cancel);
      container.removeEventListener('contextmenu', cancel);
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

export function MapView({ position, parks, selectedId, onSelect, onLocationSelect, expanded, onToggleExpanded, onShowResults }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const selected = parks.find((park) => park.info.park_Id === selectedId);

  const submitDistrict = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = normalize(query);
    const district = DISTRICTS.find(({ label, aliases }) => [label, ...aliases].some((name) => normalize(name) === normalizedQuery));
    if (!district) {
      setSearchMessage('請輸入香港 18 區，例如「大埔」或「Tai Po」。');
      return;
    }
    setSearchMessage('');
    setSearchOpen(false);
    onLocationSelect(district.coordinates, district.label);
  };

  return (
    <div className={expanded ? 'map-wrap is-expanded' : 'map-wrap'} aria-label="附近停車場地圖">
      <MapContainer center={[position.lat, position.lng]} zoom={14} minZoom={8} maxZoom={20} scrollWheelZoom className="landsd-map">
        <TileLayer
          attribution='&copy; <a href="https://api.portal.hkmapservice.gov.hk/disclaimer" target="_blank" rel="noreferrer">Map information from Lands Department</a>'
          url={LANDSD_BASEMAP_URL}
        />
        <TileLayer url={LANDSD_LABEL_URL} opacity={1} zIndex={10} />
        <Recenter position={position} />
        <FocusSelected park={selected} />
        <ResizeMap expanded={expanded} />
        <LongPressPicker onPick={(coordinates) => onLocationSelect(coordinates, '地圖選取位置')} />
        <Circle center={[position.lat, position.lng]} radius={2_000} pathOptions={{ color: '#14B8A6', fillColor: '#14B8A6', fillOpacity: 0.08, weight: 1 }} />
        <Circle center={[position.lat, position.lng]} radius={22} pathOptions={{ color: '#ffffff', fillColor: '#14B8A6', fillOpacity: 1, weight: 2 }} />
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
      </MapContainer>

      <button className="map-area-search-toggle" type="button" onClick={() => { setSearchOpen((current) => !current); setSearchMessage(''); }} aria-expanded={searchOpen}>
        搜尋地區
      </button>
      {!searchOpen && <span className="map-long-press-tip">長按地圖約 1 秒：選取 2 公里範圍</span>}
      {searchOpen && (
        <form className="map-area-search" onSubmit={submitDistrict}>
          <label htmlFor="district-search">搜尋中心</label>
          <div>
            <input id="district-search" list="district-options" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：大埔／Tai Po" autoFocus />
            <button type="submit">顯示</button>
          </div>
          <datalist id="district-options">
            {DISTRICTS.map((district) => <option key={district.label} value={district.label}>{district.aliases.at(-1)}</option>)}
          </datalist>
          <small>{searchMessage || '以所選地區中心顯示 2 公里內停車場'}</small>
        </form>
      )}

      <button className="map-focus-toggle" type="button" onClick={onToggleExpanded} aria-pressed={expanded}>{expanded ? '縮細地圖' : '放大地圖'}</button>
      {!expanded && <button className="map-results-link" type="button" onClick={onShowResults}>查看 {parks.length} 個停車場 ↓</button>}
      <a className="landsd-credit" href="https://api.portal.hkmapservice.gov.hk/disclaimer" target="_blank" rel="noreferrer">
        <span>地圖資料：地政總署</span><img src={LANDSD_LOGO_URL} alt="地政總署標誌" />
      </a>
    </div>
  );
}
