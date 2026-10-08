import { formatDistance } from '../domain/distance';
import { text, type Language } from '../i18n';
import type { OnStreetParkingViewModel } from '../types';

type Props = { language: Language; item: OnStreetParkingViewModel; onClose: () => void };

export function OnStreetParkingDetail({ language, item, onClose }: Props) {
  const { onStreet, distanceKm } = item;
  const type = onStreet.kind === 'metered' ? text(language, 'meteredParking') : text(language, 'nonMeteredTrial');
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${onStreet.latitude},${onStreet.longitude}&travelmode=driving`;
  const fee = onStreet.paymentUnit && onStreet.timeUnit ? `$${onStreet.paymentUnit} / ${onStreet.timeUnit} ${language === 'en' ? 'min' : '分鐘'}` : text(language, 'unavailable');
  const period = onStreet.operatingPeriod === 'D' ? text(language, 'daily') : onStreet.operatingPeriod ?? text(language, 'unavailable');
  const sections = onStreet.sections.length ? onStreet.sections : [onStreet.address].filter(Boolean);

  return <aside className="detail-panel on-street-detail" aria-label={`${onStreet.name} ${text(language, 'details')}`}>
    <button className="close-detail" type="button" onClick={onClose} aria-label={text(language, 'closeDetails')}>×</button>
    <p className="eyebrow">{formatDistance(distanceKm)} · {type}{onStreet.snapshot ? ` · ${text(language, 'snapshot')}` : ''}</p>
    <h2>{onStreet.name}</h2>
    <p className="detail-address">{onStreet.address || text(language, 'addressUnavailable')}</p>
    <div className={`detail-status on-street-status is-${onStreet.occupancy}`}><strong>{text(language, 'onStreetVacantTotal', { vacant: onStreet.vacant, total: onStreet.total })}</strong><span>{text(language, 'onStreetOccupiedUnavailable', { occupied: onStreet.occupied, unavailable: onStreet.unavailable })}</span></div>
    <dl className="detail-grid">
      <div><dt>{text(language, 'totalSpaces')}</dt><dd>{onStreet.total}</dd></div>
      <div><dt>{text(language, 'meterVacant')}</dt><dd>{onStreet.vacant}</dd></div>
      <div><dt>{text(language, 'meterOccupied')}</dt><dd>{onStreet.occupied}</dd></div>
      <div><dt>{text(language, 'meterUnavailable')}</dt><dd>{onStreet.unavailable}</dd></div>
      <div><dt>{text(language, 'meterPeriod')}</dt><dd>{period}</dd></div>
      <div><dt>{text(language, 'hourlyRate')}</dt><dd>{fee}</dd></div>
    </dl>
    <section className="detail-section"><h3>{text(language, 'onStreetSections')}</h3><p>{sections.join('、') || text(language, 'unavailable')}</p></section>
    <section className="detail-section"><h3>{text(language, 'onStreetDataScope')}</h3><p>{text(language, 'onStreetDataScopeDetail')}</p></section>
    {onStreet.kind === 'metered' && <section className="detail-section"><h3>{text(language, 'payments')}</h3><p>{text(language, 'meterPaymentHint')}</p></section>}
    <div className="detail-actions"><a className="primary-action" href={directions} target="_blank" rel="noreferrer">{text(language, 'drivingNavigation')}</a></div>
    <p className="data-note">{onStreet.source} · {language === 'en' ? 'Counts are for reference; check the meter and road signs on arrival.' : '數量只供參考；到達後請以咪錶及道路標誌為準。'}</p>
  </aside>;
}
