import { type Language } from '../i18n';
import type { Coordinates } from '../types';
import { useMapMode } from './MapModeContext';
import './Official3D.css';

// Keep the existing component at every entry point: no duplicate 3D controls.
type Props = { point: Coordinates; language: Language; compact?: boolean; onLaunch?: () => void };
export function Official3DLink({ point, language, compact = false, onLaunch }: Props) {
  const { mode, toggle, show3d } = useMapMode();
  const backTo2d = compact && mode === '3d';
  const hint = language === 'en'
    ? backTo2d ? 'Return to 2D map' : 'View this area in 3D in this website'
    : backTo2d ? '返回 2D 地圖' : '在本站查看此處 3D 地圖';
  return <button className={`official-3d-link${compact ? ' is-compact' : ' secondary-action'}${backTo2d ? ' is-active' : ''}`}
    type="button" title={hint} aria-label={hint} aria-pressed={compact ? mode === '3d' : undefined}
    onClick={() => {
      onLaunch?.();
      if (compact) toggle();
      else show3d(point);
    }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10" /></svg>
    {compact ? backTo2d ? '2D' : '3D' : language === 'en' ? 'View here in 3D' : '查看此處 3D'}
  </button>;
}
