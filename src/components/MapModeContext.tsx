import { createContext, useContext, type ReactNode } from 'react';
import type { Coordinates } from '../types';

export type MapMode = '2d' | '3d';
type MapModeControls = { mode: MapMode; toggle: () => void; show3d: (point: Coordinates) => void };
const MapModeContext = createContext<MapModeControls | null>(null);

export function MapModeProvider({ value, children }: { value: MapModeControls; children: ReactNode }) {
  return <MapModeContext.Provider value={value}>{children}</MapModeContext.Provider>;
}

export function useMapMode() {
  const controls = useContext(MapModeContext);
  if (!controls) throw new Error('3D map controls need the map mode provider');
  return controls;
}
