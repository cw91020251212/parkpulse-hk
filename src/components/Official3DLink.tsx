import { text, type Language } from '../i18n';
import { captureLiveMap, isHkPoint, official3dUrl, OPEN_3D_EVENT } from '../domain/official3d';
import type { Coordinates } from '../types';
import './Official3D.css';

type Props = { point: Coordinates; language: Language; compact?: boolean };
export function Official3DLink({ point, language, compact = false }: Props) {
  if (!isHkPoint(point)) return <span className="official-3d-link is-compact is-disabled" aria-disabled="true">{text(language, 'official3dOutsideHK')}</span>;
  return <a className={`official-3d-link${compact ? ' is-compact' : ' secondary-action'}`}
    href={official3dUrl(point, language)} target="_blank" rel="noopener noreferrer"
    title={text(language, 'official3dLinkHint')}
    aria-label={text(language, 'official3dLinkHint')}
    onClickCapture={(event) => {
      const live = compact ? captureLiveMap(null) : null;
      if (live && isHkPoint(live.center)) event.currentTarget.href = official3dUrl(live.center, language);
      window.dispatchEvent(new Event(OPEN_3D_EVENT));
    }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10" /></svg>
    {text(language, compact ? 'official3dShort' : 'official3dAtPoint')}
  </a>;
}
