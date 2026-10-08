import { useEffect } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Coordinates, ParkViewModel } from '../types';

type Props = {
  position: Coordinates;
  parks: ParkViewModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
};

const LANDSD_BASEMAP_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/basemap/WGS84/{z}/{x}/{y}.png';
const LANDSD_LABEL_URL = 'https://mapapi.geodata.gov.hk/gs/api/v1.0.0/xyz/label/hk/tc/WGS84/{z}/{x}/{y}.png';
const LANDSD_LOGO_URL = 'https://api.hkmapservice.gov.hk/mapapi/landsdlogo.jpg';

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

function markerIcon(park: ParkViewModel) {
  const label = park.status.kind === 'count' ? String(park.status.count) : park.status.kind === 'available' ? '有' : park.status.kind === 'full' ? '滿' : park.status.kind === 'closed' ? '關' : '–';
  return L.divIcon({
    className: 'parking-marker-shell',
    html: `<span class="parking-marker marker-${park.status.kind}"><b>${label}</b></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });
}

export function MapView({ position, parks, selectedId, onSelect, expanded, onToggleExpanded }: Props) {
  const selected = parks.find((park) => park.info.park_Id === selectedId);

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
      <button className="map-focus-toggle" type="button" onClick={onToggleExpanded} aria-pressed={expanded}>{expanded ? '縮細地圖' : '放大地圖'}</button>
      <div className="map-key" aria-label="地圖狀態圖例"><span><i className="key-dot available" />有位</span><span><i className="key-dot full" />已滿</span><span><i className="key-dot unknown" />未知</span></div>
      <a className="landsd-credit" href="https://api.portal.hkmapservice.gov.hk/disclaimer" target="_blank" rel="noreferrer">
        <span>地圖資料：地政總署</span><img src={LANDSD_LOGO_URL} alt="地政總署標誌" />
      </a>
    </div>
  );
}
