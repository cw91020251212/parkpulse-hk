import { useEffect } from 'react';
import L from 'leaflet';
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Coordinates, ParkViewModel } from '../types';

type Props = {
  position: Coordinates;
  parks: ParkViewModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

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

function markerIcon(park: ParkViewModel) {
  const label = park.status.kind === 'count' ? String(park.status.count) : park.status.kind === 'available' ? '有' : park.status.kind === 'full' ? '滿' : park.status.kind === 'closed' ? '關' : '–';
  return L.divIcon({
    className: 'parking-marker-shell',
    html: `<span class="parking-marker marker-${park.status.kind}"><b>${label}</b></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

export function MapView({ position, parks, selectedId, onSelect }: Props) {
  const selected = parks.find((park) => park.info.park_Id === selectedId);

  return (
    <div className="map-wrap" aria-label="附近停車場地圖">
      <MapContainer center={[position.lat, position.lng]} zoom={14} scrollWheelZoom className="map">
        <TileLayer
          attribution='Tiles &copy; <a href="https://www.esri.com/en-us/legal/terms/full-master-agreement">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
        <Recenter position={position} />
        <FocusSelected park={selected} />
        <Circle center={[position.lat, position.lng]} radius={2_000} pathOptions={{ color: '#14B8A6', fillColor: '#14B8A6', fillOpacity: 0.08, weight: 1 }} />
        <Circle center={[position.lat, position.lng]} radius={22} pathOptions={{ color: '#ffffff', fillColor: '#14B8A6', fillOpacity: 1, weight: 2 }} />
        {parks.map((park) => (
          <Marker
            key={park.info.park_Id}
            position={[park.info.latitude, park.info.longitude]}
            icon={markerIcon(park)}
            eventHandlers={{ click: () => onSelect(park.info.park_Id) }}
          >
            <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>{park.info.name} · {park.status.label}</Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-key" aria-label="地圖狀態圖例"><span><i className="key-dot available" />有位</span><span><i className="key-dot full" />已滿</span><span><i className="key-dot unknown" />未知</span></div>
    </div>
  );
}
