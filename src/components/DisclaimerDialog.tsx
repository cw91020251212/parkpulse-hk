import { useEffect, useRef } from 'react';
import { text, type Language } from '../i18n';

type Props = { language: Language; onClose: () => void };

const sections = [
  ['disclaimerDataTitle', 'disclaimerData'],
  ['disclaimerNoGuaranteeTitle', 'disclaimerNoGuarantee'],
  ['disclaimerThirdPartyTitle', 'disclaimerThirdParty'],
  ['disclaimerPrivacyTitle', 'disclaimerPrivacy'],
] as const;

export function DisclaimerDialog({ language, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return <div className="help-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialogRef} className="help-dialog disclaimer-dialog" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title" tabIndex={-1}>
      <div className="help-dialog-heading"><div><p className="eyebrow">PARKPULSE HK</p><h2 id="disclaimer-title">{text(language, 'disclaimerTitle')}</h2></div><button type="button" className="close-help" onClick={onClose} aria-label={text(language, 'disclaimerClose')}>×</button></div>
      <p className="help-intro">{text(language, 'disclaimerIntro')}</p>
      <div className="help-steps">{sections.map(([title, body]) => <section key={title}><h3>{text(language, title)}</h3><p>{text(language, body)}</p></section>)}</div>
      <button type="button" className="help-done" onClick={onClose}>{text(language, 'disclaimerClose')}</button>
    </section>
  </div>;
}
