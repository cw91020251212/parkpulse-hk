import { useState } from 'react';
import { isStaticPages } from '../api/site';
import { formatDistance } from '../domain/distance';
import { googleMapsPlaceUrl } from '../domain/placeLinks';
import { usePlacePhoto } from '../hooks/usePlacePhoto';
import { text, type Language } from '../i18n';
import type { PublicToiletViewModel } from '../types';
import { WashroomSymbol } from './WashroomSymbol';

type Props = { language: Language; toilet: PublicToiletViewModel };

export function ToiletCard({ language, toilet: { toilet, distanceKm } }: Props) {
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${toilet.latitude},${toilet.longitude}`;
  const isLcsdVenue = toilet.kind === 'lcsdVenue';
  const isLongValleyTemporaryVenue = toilet.kind === 'afcdLongValleyTemporaryToilets';
  const isUnconfirmedVenue = toilet.kind === 'hadCommunityToilet' || isLongValleyTemporaryVenue;
  const isVenueLocation = toilet.locationPrecision === 'venue' || toilet.locationPrecision === 'venue-uncertain' || isLcsdVenue;
  const isLcsdParkWashroom = toilet.kind === 'lcsdParkToilet';
  const isAfcdCountryParkToilet = toilet.kind === 'afcdCountryParkToilet';
  const isAfcdNatureCentreToilet = toilet.kind === 'afcdNatureCentreToilet';
  const displayName = language === 'en' ? toilet.nameEn ?? toilet.name : toilet.name;
  const displayAddress = language === 'en' ? toilet.addressEn ?? toilet.address : toilet.address;
  const addressUrl = googleMapsPlaceUrl(displayName, displayAddress, toilet.latitude, toilet.longitude);
  const displayOpeningHours = language === 'en' ? toilet.openingHoursEn ?? toilet.openingHours : toilet.openingHours;
  const displayRemarks = language === 'en' ? toilet.remarksEn ?? toilet.remarks : toilet.remarks;
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoState, setPhotoState] = usePlacePhoto({ id: toilet.id, name: displayName, address: displayAddress, latitude: toilet.latitude, longitude: toilet.longitude }, showPhoto && !isStaticPages && !isVenueLocation);
  const source = isLongValleyTemporaryVenue ? text(language, 'afcdLongValleyTemporaryWashrooms') : toilet.kind === 'hadCommunityToilet' ? text(language, 'hadCommunityWashroom') : isAfcdNatureCentreToilet ? text(language, 'afcdNatureCentreWashroom') : isLcsdVenue ? text(language, 'venueWashroom') : isLcsdParkWashroom ? text(language, 'lcsdParkWashroom') : isAfcdCountryParkToilet ? text(language, 'afcdCountryParkWashroom') : text(language, 'publicToilet');
  const fallbackAddress = isLongValleyTemporaryVenue ? text(language, 'afcdLongValleyTemporaryWashrooms') : isLcsdVenue ? text(language, 'venue') : isLcsdParkWashroom ? text(language, 'lcsdParkWashroom') : isAfcdCountryParkToilet ? text(language, 'afcdCountryParkWashroom') : text(language, 'publicToilet');

  return <article className="toilet-card">
    <div className="toilet-card-main">
      <div className="card-heading">
        <span className={`toilet-card-icon${isVenueLocation ? ' is-venue' : ''}${isUnconfirmedVenue ? ' is-location-unconfirmed' : ''}`} aria-hidden="true"><WashroomSymbol venue={isVenueLocation} /></span>
        <div><h3>{displayName}</h3><a className="card-address-link" href={addressUrl} target="_blank" rel="noreferrer" aria-label={`${text(language, 'openPlaceOnMap')}: ${displayName}`}><p>{displayAddress || fallbackAddress}</p></a></div>
        <span className="distance">{formatDistance(distanceKm)}{isVenueLocation && <small className="distance-scope">{text(language, 'distanceToVenueLabel')}</small>}</span>
      </div>
      <div className="toilet-facts">
        <span className={isLcsdVenue ? 'washroom-source is-venue' : 'washroom-source'}>{source}</span>
        {isVenueLocation && <span className={`washroom-precision is-venue${isUnconfirmedVenue ? ' is-location-unconfirmed' : ''}`}>{text(language, isLongValleyTemporaryVenue ? 'afcdLongValleyTemporaryPrecision' : isUnconfirmedVenue ? 'hadVenuePrecision' : 'venueLocationPrecision')}</span>}
        <span>{displayOpeningHours ? text(language, 'opening', { value: displayOpeningHours }) : text(language, 'openingUnavailable')}</span>
        {displayRemarks && <span>{displayRemarks}</span>}
      </div>
      {showPhoto && !isStaticPages && !isVenueLocation && <section className="toilet-photo-section" aria-live="polite">
        {photoState.kind === 'loading' && <p className="photo-state">{text(language, 'searchingPhoto')}</p>}
        {photoState.kind === 'found' && <figure className="toilet-photo">
          <img src={photoState.photo.photoUrl} alt={`${displayName} ${text(language, 'nearbyPhoto')}`} loading="lazy" onError={() => setPhotoState({ kind: 'unavailable', placeUrl: photoState.photo.placeUrl })} />
          <figcaption>{language === 'en' ? `${photoState.photo.distanceMeters} m away · ${photoState.photo.attribution}` : `相距約 ${photoState.photo.distanceMeters} 米 · ${photoState.photo.attribution} 提供`}</figcaption>
        </figure>}
        {photoState.kind === 'not_found' && <p className="photo-state">{text(language, 'noVerifiedPhoto')}</p>}
        {photoState.kind === 'unavailable' && <p className="photo-state">{text(language, 'photoUnavailable')}</p>}
        {photoState.kind === 'found' && <a className="photo-link" href={photoState.photo.placeUrl} target="_blank" rel="noreferrer">{text(language, 'morePhotos')}</a>}
        {(photoState.kind === 'not_found' || photoState.kind === 'unavailable') && <a className="photo-link" href={photoState.placeUrl} target="_blank" rel="noreferrer">{text(language, 'morePhotos')}</a>}
      </section>}
    </div>
    <div className="toilet-card-actions">
      {!isVenueLocation && (isStaticPages ? toilet.photoPlaceUrl
        ? <a className="toilet-photo-toggle" href={toilet.photoPlaceUrl} target="_blank" rel="noreferrer" aria-label={`${text(language, 'verifiedPhoto')}: ${displayName}`}>{text(language, 'verifiedPhoto')}</a>
        : <span className="toilet-photo-unavailable">{text(language, 'noPhoto')}</span>
        : <button className="toilet-photo-toggle" type="button" onClick={() => setShowPhoto((current) => !current)} aria-expanded={showPhoto}>{showPhoto ? text(language, 'collapse') : text(language, 'photo')}</button>)}
      <a className="nav-link" href={navigationUrl} target="_blank" rel="noreferrer" aria-label={`${text(language, isVenueLocation ? 'navigateToVenue' : 'navigation')}: ${displayName}`}>{text(language, isVenueLocation ? 'navigateToVenue' : 'navigation')}</a>
    </div>
  </article>;
}
