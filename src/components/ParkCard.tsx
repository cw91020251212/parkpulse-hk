import { formatPrice, getOfficialPricingNotes, getVerifiedOperatorRate, isAvailable } from '../domain/carpark';
import { formatDistance } from '../domain/distance';
import { heightLabel, paymentLabel, text, updatedLabel, vacancyLabel, vehicleLabel, type Language } from '../i18n';
import type { ParkViewModel, VehicleType } from '../types';

type Props = { language: Language; park: ParkViewModel; vehicleType: VehicleType; selected: boolean; lastViewed: boolean; onSelect: () => void };

function chargingSummary(park: ParkViewModel, language: Language) {
  if (park.evCharger) return language === 'en'
    ? (park.evCharger.available === null ? `${park.evCharger.total} chargers` : `${park.evCharger.available}/${park.evCharger.total} chargers available`)
    : (park.evCharger.available === null ? `充電 ${park.evCharger.total} 支` : `充電 ${park.evCharger.available}/${park.evCharger.total} 支可用`);
  return (park.info.facilities ?? []).includes('evCharger') ? text(language, 'evFacilities') : null;
}

export function ParkCard({ language, park, vehicleType, selected, lastViewed, onSelect }: Props) {
  const { info, status, distanceKm, heightLimit } = park;
  const isMotorcycle = vehicleType === 'motorCycle';
  const facilities = info.facilities ?? [];
  const charging = isMotorcycle ? null : chargingSummary(park, language);
  const paymentSummary = (info.paymentMethods ?? []).map((method) => paymentLabel(language, method)).slice(0, 2).join('／');
  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`;
  const operatorRate = getVerifiedOperatorRate(info, vehicleType);
  const price = operatorRate ? undefined : formatPrice(info, vehicleType, language);
  const pricingReference = price ? undefined : getOfficialPricingNotes(info, vehicleType)[0];
  const cardPricing = operatorRate ? operatorRate.cardSummary[language] : pricingReference ? `${text(language, 'officialRateReference')} ${pricingReference}` : undefined;
  const totalSpaces = info[vehicleType]?.space;
  const cardClass = `park-card${selected ? ' is-selected' : ''}${lastViewed ? ' is-last-viewed' : ''}`;
  const detailLabel = `${lastViewed ? `${text(language, 'lastViewed')} · ` : ''}${text(language, 'details')}: ${info.name}`;

  return <article className={cardClass}>
    <div className="park-card-main">
      <button className="park-card-select" type="button" onClick={onSelect} aria-current={lastViewed ? 'true' : undefined} aria-label={detailLabel}>
        <div className="card-heading"><span className={`status-dot status-${status.kind}`} aria-hidden="true" /><div><div className="park-title-row"><h3>{info.name}</h3></div><p>{info.district || info.displayAddress || 'Hong Kong'}</p></div><strong className="distance">{formatDistance(distanceKm)}</strong></div>
        <div className="availability-line"><strong className={`availability status-${status.kind}`}>{vacancyLabel(language, status)}</strong><span>{status.sourceCategory === 'MONTHLY' ? text(language, 'monthly') : vehicleLabel(language, vehicleType)}</span>{status.stale && <span className="stale-badge">{text(language, 'stale')}</span>}</div>
        <div className="card-facts">{typeof totalSpaces === 'number' && <span className="total-spaces">{text(language, 'totalSpaces')} {totalSpaces}</span>}{!isMotorcycle && <span>{text(language, 'height')} {heightLabel(language, heightLimit)}</span>}{price ? <span>{text(language, 'hourlyRate')} {price}</span> : !cardPricing && <span>{isMotorcycle ? text(language, 'motorcycleRateNotVerified') : `${text(language, 'hourlyRate')} ${text(language, 'officialRateNotProvided')}`}</span>}{paymentSummary && <span>{paymentSummary}</span>}{charging && <span className="charging-fact">{charging}</span>}{!isMotorcycle && facilities.includes('disabilities') && <span>{text(language, 'accessible')}</span>}</div>
        {cardPricing && <p className="card-pricing-summary">{cardPricing}</p>}
        <p className="updated">{updatedLabel(language, status.updatedAt)}</p>
      </button>
      {info.googleRating && <a className="park-card-rating" href={info.googleRating.placeUrl} target="_blank" rel="noreferrer" title={`${text(language, 'googleUserRating')} · ${text(language, 'ratingCount', { count: info.googleRating.userRatingCount })}`}>★ {info.googleRating.rating.toFixed(1)}</a>}
    </div>
    <a className="nav-link" href={navigateUrl} target="_blank" rel="noreferrer" aria-label={`${text(language, 'navigation')}: ${info.name}`}>{text(language, 'navigation')}</a>
    {info.officialSource && (status.noLiveData || info.officialSource.availability === 'snapshot') ? <span className="card-note">{info.officialSource.sourceLabel[language]} · {info.officialSource.availability === 'snapshot' ? text(language, 'officialAvailabilitySnapshot') : text(language, 'noLiveData')}</span> : !isAvailable(status) && status.kind === 'unknown' && <span className="card-note">{text(language, 'operatorNoVacancy')}</span>}
  </article>;
}
