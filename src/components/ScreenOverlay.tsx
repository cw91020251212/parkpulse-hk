import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/** Fixed screens must not inherit the zoom/containing block of the map/sidebar. */
export function ScreenOverlay({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
