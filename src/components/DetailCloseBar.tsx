import { text, type Language } from '../i18n';

export function DetailCloseBar({ language, onClose }: { language: Language; onClose: () => void }) {
  return <div className="detail-close-bar"><button className="close-detail" type="button" onClick={onClose} aria-label={text(language, 'closeDetails')}><span aria-hidden="true">×</span> {text(language, 'closeDetails')}</button></div>;
}
