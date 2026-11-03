import { useEffect } from 'react';
import '../components/OverlayReadability.css';

/** Bridge the app preference to body portals without zooming their fixed frames. */
export function useOverlayTextScale(textScale: number): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const style = document.documentElement.style;
    const property = '--overlay-text-scale';
    const previousValue = style.getPropertyValue(property);
    const previousPriority = style.getPropertyPriority(property);
    const hadProperty = Array.from(style).includes(property);
    const percentage = Number.isFinite(textScale) ? textScale : 100;
    const scale = Math.min(130, Math.max(100, Math.round(percentage / 10) * 10)) / 100;
    style.setProperty(property, String(scale));

    return () => {
      if (hadProperty) style.setProperty(property, previousValue, previousPriority);
      else style.removeProperty(property);
    };
  }, [textScale]);
}
