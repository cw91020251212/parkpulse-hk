import { useEffect, useRef } from 'react';
import { useScreenNavigation } from '../hooks/ScreenNavigation';
import { text, type Language } from '../i18n';
import type { Coordinates } from '../types';
import { Official3DLink } from './Official3DLink';

export function MapExtraTools({ point, language, onEditWater }: { point: Coordinates; language: Language; onEditWater?: () => void }) {
  const navigation = useScreenNavigation();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const menu = ref.current;
      if (menu?.open && navigation.isTop('map-tools') && event.target instanceof Node && !menu.contains(event.target)) {
        navigation.close('map-tools');
      }
    };
    document.addEventListener('pointerdown', closeOutside, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      navigation.retire('map-tools');
    };
  }, [navigation]);

  return <details ref={ref} className="map-extra-tools" onToggle={(event) => {
    if (event.currentTarget.open) {
      if (!navigation.open('map-tools', () => { if (ref.current) ref.current.open = false; })) event.currentTarget.open = false;
    } else if (navigation.isTop('map-tools')) navigation.close('map-tools');
  }}>
    <summary aria-label={text(language, 'mapExtraTools')} title={text(language, 'mapExtraTools')}>⋯</summary>
    <div className="map-extra-tools-panel">
      <button type="button" onClick={() => navigation.close('map-tools')}>{text(language, 'closeScreen')} ×</button>
      {onEditWater && <button type="button" onClick={onEditWater}>{text(language, 'editFacilityOptions', { label: text(language, 'drinkingWater') })}</button>}
      <Official3DLink point={point} language={language} compact onLaunch={() => navigation.close('map-tools')} />
    </div>
  </details>;
}
