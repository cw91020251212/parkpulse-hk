import { useEffect, useRef } from 'react';
import { text, type Language } from '../i18n';

type Props = { language: Language; onClose: () => void };

const steps = [1, 2, 3, 4, 5, 6] as const;

export function HelpDialog({ language, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="help-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" tabIndex={-1}>
        <div className="help-dialog-heading">
          <div><p className="eyebrow">PARKPULSE HK</p><h2 id="help-title">{text(language, 'helpTitle')}</h2></div>
          <button type="button" className="close-help" onClick={onClose} aria-label={text(language, 'helpClose')}>×</button>
        </div>
        <p className="help-intro">{text(language, 'helpIntro')}</p>
        <ol className="help-steps">
          {steps.map((step) => <li key={step}><h3>{text(language, `helpStep${step}Title`)}</h3><p>{text(language, `helpStep${step}`)}</p></li>)}
        </ol>
        <button type="button" className="help-done" onClick={onClose}>{text(language, 'helpClose')}</button>
      </section>
    </div>
  );
}
