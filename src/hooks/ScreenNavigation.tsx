import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ScreenHistory } from '../domain/screenHistory';

const NavigationContext = createContext<ScreenHistory | null>(null);
const regions: Partial<Record<NonNullable<ScreenHistory['topName']>, string>> = {
  'atm-banks': '.atm-bank-picker', 'water-options': '.water-environment-picker', detail: '.detail-panel', help: '#help-title',
  disclaimer: '#disclaimer-title', settings: '.settings-popover', 'map-tools': '.map-extra-tools-panel', district: '.area-search', legend: '.map-marker-legend',
};
function activeRegion(navigation: ScreenHistory): HTMLElement | null {
  const selector = navigation.topName && regions[navigation.topName];
  if (!selector) return null;
  const region = document.querySelector<HTMLElement>(selector);
  return region?.closest<HTMLElement>('.help-dialog') ?? region;
}
function focusable(region: HTMLElement): HTMLElement[] {
  const items = [...region.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select, textarea, summary, [tabindex="0"]')].filter((element) => element.getClientRects().length > 0);
  return items.filter((element) => {
    if (!(element instanceof HTMLInputElement) || element.type !== 'radio' || !element.name) return true;
    // A native radio group has one Tab stop, not one for every unchecked option.
    const group = items.filter((item): item is HTMLInputElement => item instanceof HTMLInputElement && item.type === 'radio' && item.name === element.name && item.form === element.form);
    return element === (group.find((item) => item.checked) ?? group[0]);
  });
}
export function ScreenNavigationProvider({ children }: { children: ReactNode }) {
  const [navigation] = useState(() => new ScreenHistory(window.history, `${Date.now()}-${Math.random()}`));
  const revision = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot);
  useEffect(() => {
    navigation.handlePop(window.history.state);
    const onBack = (event: PopStateEvent) => navigation.handlePop(event.state);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const region = activeRegion(navigation);
        if (!region) return;
        const items = focusable(region);
        const first = items[0]; const last = items.at(-1);
        if (!first || !last) return;
        if (!region.contains(document.activeElement) || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault(); (event.shiftKey ? last : first).focus({ preventScroll: true });
        }
        return;
      }
      if (event.key !== 'Escape' || navigation.depth === 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      navigation.close();
    };
    window.addEventListener('popstate', onBack);
    window.addEventListener('keydown', onEscape, true);
    return () => { window.removeEventListener('popstate', onBack); window.removeEventListener('keydown', onEscape, true); };
  }, [navigation]);
  useEffect(() => {
    const region = activeRegion(navigation);
    if (region && !region.contains(document.activeElement)) focusable(region)[0]?.focus({ preventScroll: true });
  }, [navigation, revision]);
  useEffect(() => {
    if (!navigation.locked) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [navigation, revision]);
  return <NavigationContext.Provider value={navigation}>{children}</NavigationContext.Provider>;
}
export function useScreenNavigation(): ScreenHistory {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error('ScreenNavigationProvider is required');
  return navigation;
}
