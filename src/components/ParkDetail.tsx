import { formatOfficialHourlyCharge, formatPrice, getOfficialHourlyCharges } from '../domain/carpark';
import { formatDistance } from '../domain/distance';
import { isStaticPages } from '../api/site';
import { usePlacePhoto } from '../hooks/usePlacePhoto';
import { facilityLabel, heightLabel, paymentLabel, text, updatedLabel, vacancyLabel, vehicleLabel, type Language } from '../i18n';
import type { ParkViewModel, VehicleType } from '../types';

type Props = { language: Language; park: ParkViewModel; vehicleType: VehicleType; onClose: () => void };

function formatEpdUpdate(value: string | undefined, language: Language) {
  if (!value) return text(language, 'unavailable');
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(language === 'en' ? 'en-HK' : 'zh-HK', { hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric' });
}

export function ParkDetail({ language, park, vehicleType, onClose }: Props) {
  const { info, status, distanceKm, heightLimit, evCharger } = park;
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${info.latitude},${info.longitude}`;
  const facilities = (info.facilities ?? []).filter((item) => item !== 'evCharger' || !evCharger).map((item) => facilityLabel(language, item));
  const payments = (info.paymentMethods ?? []).map((item) => paymentLabel(language, item));
  const [photoState, setPhotoState] = usePlacePhoto({ id: info.park_Id, name: info.name, address: info.displayAddress, latitude: info.latitude, longitude: info.longitude }, !isStaticPages);
  const hourlyCharges = getOfficialHourlyCharges(info, vehicleType);
  const price = formatPrice(info, vehicleType, language);
  const totalSpaces = info[vehicleType]?.space;
  const pricingSource = hourlyCharges.some((charge) => charge.source === 'remark') ? 'officialRateInNote' : 'officialRateStructured';

  return <aside className="detail-panel" aria-label={`${info.name} ${text(language, 'details')} `}>
    <button className="close-detail" type="button" onClick={onClose} aria-label={text(language, 'closeDetails')}>×</button>
    <p className="eyebrow">{formatDistance(distanceKm)} · {info.district || 'Hong Kong'}</p><h2>{info.name}</h2><p className="detail-address">{info.displayAddress || text(language, 'addressUnavailable')}</p>
    <div className={`detail-status status-${status.kind}`}><strong>{vacancyLabel(language, status)}</strong><span>{updatedLabel(language, status.updatedAt)}</span></div>
    {status.stale && <p className="warning">{language === 'en' ? 'Data is over 5 minutes old; conditions may have changed.' : '資料已超過 5 分鐘，實際情況可能有變。'}</p>}
    {evCharger && <section className="charging-detail"><div className="detail-section-heading"><h3>{text(language, 'evCharging')}</h3><span>{text(language, 'locationVerified')}</span></div><p><strong>{language === 'en' ? (evCharger.available === null ? `${evCharger.total} chargers` : `${evCharger.available}/${evCharger.total} chargers available`) : (evCharger.available === null ? `共 ${evCharger.total} 支充電器` : `${evCharger.available}/${evCharger.total} 支可用`)}</strong>{evCharger.types.length ? ` · ${evCharger.types.join('、')}` : ''}</p><small>{language === 'en' ? 'Environmental Protection Department' : '環境保護署'} · {formatEpdUpdate(evCharger.updatedAt, language)} · {language === 'en' ? `${evCharger.distanceMeters} m from the car park` : `與停車場相距約 ${evCharger.distanceMeters} 米`}</small></section>}
    <section className="detail-photo-section" aria-live="polite"><div className="detail-section-heading"><h3>{text(language, 'nearbyPhoto')}</h3><span>{isStaticPages ? 'Google Maps' : text(language, 'locationVerified')}</span></div>{isStaticPages ? (info.photoPlaceUrl ? <a className="photo-link" href={info.photoPlaceUrl} target="_blank" rel="noreferrer" aria-label={`${text(language, 'verifiedPhotos')}: ${info.name}`}>{text(language, 'verifiedPhotos')}</a> : <p className="photo-state">{text(language, 'noStaticPhoto')}</p>) : <>{photoState.kind === 'loading' && <p className="photo-state">{text(language, 'searchingPhoto')}</p>}{photoState.kind === 'found' && <figure className="detail-photo"><img src={photoState.photo.photoUrl} alt={`${info.name} ${text(language, 'nearbyPhoto')}`} loading="lazy" onError={() => setPhotoState({ kind: 'unavailable', placeUrl: photoState.photo.placeUrl })} /><figcaption>{language === 'en' ? `${photoState.photo.distanceMeters} m from the car park · ${photoState.photo.attribution}` : `與停車場位置相距約 ${photoState.photo.distanceMeters} 米 · ${photoState.photo.attribution} 提供`}</figcaption></figure>}{photoState.kind === 'not_found' && <p className="photo-state">{text(language, 'noVerifiedPhoto')}</p>}{photoState.kind === 'unavailable' && <p className="photo-state">{text(language, 'photoUnavailable')}</p>}{photoState.kind === 'found' && <a className="photo-link" href={photoState.photo.placeUrl} target="_blank" rel="noreferrer">{text(language, 'morePhotos')}</a>}{(photoState.kind === 'not_found' || photoState.kind === 'unavailable') && <a className="photo-link" href={photoState.placeUrl} target="_blank" rel="noreferrer">{text(language, 'morePhotos')}</a>}</>}</section>
    {info.googleRating && <section className="detail-section google-rating-detail"><div className="detail-section-heading"><h3>{text(language, 'googleUserRating')}</h3><span>Google Maps</span></div><p><a href={info.googleRating.placeUrl} target="_blank" rel="noreferrer">★ {info.googleRating.rating.toFixed(1)} / 5 · {text(language, 'ratingCount', { count: info.googleRating.userRatingCount })}</a></p><small>{language === 'en' ? 'User-rating snapshot; not a government or ParkPulse rating.' : 'Google Maps 用戶評分快照，並非政府或本站評分。'}</small></section>}
    <dl className="detail-grid"><div><dt>{vehicleLabel(language, vehicleType)} {text(language, 'totalSpaces')}</dt><dd>{typeof totalSpaces === 'number' ? totalSpaces : text(language, 'officialNotProvided')}</dd></div><div><dt>{text(language, 'heightLimit')}</dt><dd>{heightLabel(language, heightLimit)}</dd></div><div><dt>{text(language, 'hourlyRate')}</dt><dd>{price ?? text(language, 'officialRateNotProvided')}</dd></div><div><dt>{text(language, 'openStatus')}</dt><dd>{info.opening_status === 'CLOSED' ? text(language, 'closed') : text(language, 'openSiteCheck')}</dd></div><div><dt>{text(language, 'contact')}</dt><dd>{info.contactNo || text(language, 'unavailable')}</dd></div></dl>
    <section className="detail-section"><div className="detail-section-heading"><h3>{text(language, 'officialHourlyRates')}</h3>{hourlyCharges.length > 0 && <span>{text(language, pricingSource)}</span>}</div>{hourlyCharges.length ? <ul className="pricing-list">{hourlyCharges.map((charge, index) => <li key={`${charge.periodStart}-${charge.periodEnd}-${charge.price}-${index}`}>{formatOfficialHourlyCharge(charge, language)}</li>)}</ul> : <p>{text(language, 'officialRateNotProvided')}</p>}</section>
    <section className="detail-section"><h3>{text(language, 'facilities')}</h3><p>{facilities.length ? facilities.join(' · ') : text(language, 'unavailable')}</p></section><section className="detail-section"><h3>{text(language, 'payments')}</h3><p>{payments.length ? payments.join(' · ') : text(language, 'unavailable')}</p></section>
    <div className="detail-actions"><a className="primary-action" href={navigationUrl} target="_blank" rel="noreferrer">{text(language, 'openNavigation')}</a>{info.website && <a className="secondary-action" href={info.website} target="_blank" rel="noreferrer">{text(language, 'carparkWebsite')}</a>}</div>
    <p className="data-note">{language === 'en' ? 'Availability: Hong Kong Government data.gov.hk; charging: Environmental Protection Department; photos: Google Maps. Data is for reference only; check conditions on site.' : '空位資料：香港政府 data.gov.hk；充電器：環境保護署；相片：Google Maps。資料只供參考，請以現場情況為準。'}</p>
  </aside>;
}
