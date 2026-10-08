import { formatPrice, isAvailable } from '../domain/carpark';
import { formatDistance } from '../domain/distance';
import { heightLabel, paymentLabel, text, updatedLabel, vacancyLabel, vehicleLabel, type Language } from '../i18n';
import type { ParkViewModel, VehicleType } from '../types';

type Props = { language: Language; park: ParkViewModel; vehicleType: VehicleType; selected: boolean; onSelect: () => void };

function chargingSummary(park: ParkViewModel, language: Language) {
  if (park.evCharger) return language === 'en'
    ? (park.evCharger.available === null ? `${park.evCharger.total} chargers` : `${park.evCharger.available}/${park.evCharger.total} chargers available`)
    : (park.evCharger.available === null ? `充電 ${park.evCharger.total} 支` : `充電 ${park.evCharger.available}/${park.evCharger.total} 可用`);
  return (park.info.facilities ?? []).includes('evCharger') ? text(language, 'evFacilities') : null;
}

export function ParkCard({ language, park, vehicleType, selected, onSelect }: Props) {
  const { info, status, distanceKm, heightLimit } = park;
  const facilities = info.facilities ?? [];
  const charging = chargingSummary(park, language);
  const paymentSummary = (info.paymentMethods ?? []).map((method) => paymentLabel(language, method)).slice(0, 2).join('／');
  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`;
  const price = formatPrice(info, vehicleType);

  return <article className={selected ? 'park-card is-selected' : 'park-card'}>
    <button className="park-card-main" type="button" onClick={onSelect} aria-label={`${text(language, 'details')}: ${info.name}`}>
      <div className="card-heading"><span className={`status-dot status-${status.kind}`} aria-hidden="true" /><div><h3>{info.name}</h3><p>{info.district || info.displayAddress || 'Hong Kong'}</p></div><strong className="distance">{formatDistance(distanceKm)}</strong></div>
      <div className="availability-line"><strong className={`availability status-${status.kind}`}>{vacancyLabel(language, status)}</strong><span>{status.sourceCategory === 'MONTHLY' ? text(language, 'monthly') : vehicleType === 'privateCar' ? vehicleLabel(language, vehicleType) : text(language, 'liveData')}</span>{status.stale && <span className="stale-badge">{text(language, 'stale')}</span>}</div>
      <div className="card-facts"><span>{text(language, 'height')} {heightLabel(language, heightLimit)}</span><span>{text(language, 'hourlyRate')} {price === '未提供' ? text(language, 'unavailable') : price}</span>{paymentSummary && <span>{paymentSummary}</span>}{charging && <span className="charging-fact">{charging}</span>}{facilities.includes('disabilities') && <span>{text(language, 'accessible')}</span>}</div>
      <p className="updated">{updatedLabel(language, status.updatedAt)}</p>
    </button>
    <a className="nav-link" href={navigateUrl} target="_blank" rel="noreferrer" aria-label={`${text(language, 'navigation')}: ${info.name}`}>{text(language, 'navigation')}</a>
    {!isAvailable(status) && status.kind === 'unknown' && <span className="card-note">{text(language, 'operatorNoVacancy')}</span>}
  </article>;
}
