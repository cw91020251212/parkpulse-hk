import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import { formatDistance } from '../domain/distance';
import { text, type Language } from '../i18n';
import type { NearbyFacilityViewModel } from '../types';

type Props = { items: NearbyFacilityViewModel[]; language: Language; viewedMarkerId: string | null };
type Cluster = { id: string; items: NearbyFacilityViewModel[]; latitude: number; longitude: number };
const CLUSTER_GRID_PX = 52;

function cameraIcon(viewed: boolean) {
  return L.divIcon({
    className: 'toilet-marker-shell',
    html: `<span class="toilet-marker is-traffic-camera${viewed ? ' is-viewed' : ''}"><span aria-hidden="true">📷</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

function cameraClusterIcon(count: number) {
  return L.divIcon({
    className: 'parking-marker-shell',
    html: `<span class="parking-marker marker-traffic-camera-cluster"><b>${count > 99 ? '99+' : count}</b></span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });
}

function groupByScreenGrid(items: NearbyFacilityViewModel[], map: L.Map) {
  const cells = new Map<string, NearbyFacilityViewModel[]>();
  const zoom = map.getZoom();
  for (const item of items) {
    const point = map.project([item.facility.latitude, item.facility.longitude], zoom);
    const key = `${Math.floor(point.x / CLUSTER_GRID_PX)}:${Math.floor(point.y / CLUSTER_GRID_PX)}`;
    const group = cells.get(key) ?? [];
    group.push(item);
    cells.set(key, group);
  }
  return [...cells.entries()].map(([cell, group]) => ({
    id: group.map(({ facility }) => facility.id).sort().join('|') || cell,
    items: group,
    latitude: group.reduce((total, { facility }) => total + facility.latitude, 0) / group.length,
    longitude: group.reduce((total, { facility }) => total + facility.longitude, 0) / group.length,
  } satisfies Cluster));
}

function zoomToCluster(map: L.Map, cluster: Cluster) {
  if (cluster.items.length === 1) {
    cluster.items[0].onSelect?.();
    return;
  }
  const bounds = L.latLngBounds(cluster.items.map(({ facility }) => [facility.latitude, facility.longitude] as L.LatLngTuple));
  if (bounds.getSouthWest().equals(bounds.getNorthEast())) {
    map.setView(bounds.getCenter(), Math.min(map.getZoom() + 2, 18), { animate: true });
  } else {
    map.fitBounds(bounds.pad(0.36), { maxZoom: 18, animate: true });
  }
}

export function TrafficCameraMapLayer({ items, language, viewedMarkerId }: Props) {
  const map = useMap();
  const [mapRevision, setMapRevision] = useState(0);
  useEffect(() => {
    const update = () => setMapRevision((current) => current + 1);
    map.on('moveend zoomend', update);
    return () => { map.off('moveend zoomend', update); };
  }, [map]);
  const clusters = useMemo(() => groupByScreenGrid(items, map), [items, map, mapRevision]);

  return <>{clusters.map((cluster) => {
    if (cluster.items.length > 1) return <Marker key={`traffic-cluster:${cluster.id}`} position={[cluster.latitude, cluster.longitude]} icon={cameraClusterIcon(cluster.items.length)} zIndexOffset={420} eventHandlers={{ click: () => zoomToCluster(map, cluster) }}>
      <Tooltip direction="top" offset={[0, -38]} opacity={0.95}>{text(language, 'trafficCameraCluster', { count: cluster.items.length })}</Tooltip>
    </Marker>;
    const item = cluster.items[0];
    const { facility } = item;
    const viewed = viewedMarkerId === `facility:${facility.id}`;
    return <Marker key={facility.id} position={[facility.latitude, facility.longitude]} icon={cameraIcon(viewed)} zIndexOffset={viewed ? 650 : 360} eventHandlers={{ click: () => item.onSelect?.() }}>
      <Tooltip direction="top" offset={[0, -34]} opacity={0.95}>{facility.name} · {formatDistance(item.distanceKm)}</Tooltip>
    </Marker>;
  })}</>;
}
