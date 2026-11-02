import { formatDistance } from '../domain/distance';
import { text, type Language } from '../i18n';
import type { NearbyFacilityViewModel } from '../types';
import { DrinkingWaterSymbol } from './DrinkingWaterSymbol';
import './DrinkingWater.css';

type Props = { language: Language; item: NearbyFacilityViewModel };
export function DrinkingWaterCard({ language, item: { facility, distanceKm, onSelect } }: Props) {
  const water = facility.drinkingWater;
  const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}&travelmode=walking`;
  return <article className={`water-card${water?.temporaryClosed ? ' is-closed' : ''}`}>
    <button className="water-card-main" type="button" onClick={onSelect} aria-haspopup="dialog" aria-label={`${text(language, 'viewFacilityDetails')}: ${facility.name}`}>
      <div className="water-card-heading"><span className="water-card-symbol"><DrinkingWaterSymbol /></span><h3>{facility.name}</h3><span className="distance">{formatDistance(distanceKm)}</span></div>
      <p className="water-card-address">{facility.address}</p>
      {water?.location && <p className="water-card-location">{water.location}</p>}
      <div className="water-card-facts">
        <span>{text(language, water?.indoorOutdoor === 'indoor' ? 'waterIndoor' : water?.indoorOutdoor === 'outdoor' ? 'waterOutdoor' : 'waterEnvironmentUnknown')}</span>
        {water?.type && <span>{water.type}</span>}
        {water?.unitCount != null && <span>{text(language, 'waterUnitCount', { count: water.unitCount })}</span>}
      </div>
      {facility.locationPrecision === 'building' && <p className="water-card-location-note">{text(language, 'waterVenuePin')}</p>}
      {water?.temporaryClosed && <p className="water-closed-notice">{text(language, 'waterTemporarilyClosed')}</p>}
      {facility.openingHours && <p className="water-card-hours">{facility.openingHours}</p>}
      <p className="water-card-source">{facility.source}</p>
    </button>
    <div className="water-card-actions"><button type="button" onClick={onSelect}>{text(language, 'viewFacilityDetails')}</button><a href={navigationUrl} target="_blank" rel="noreferrer">{text(language, 'walkingNavigation')}</a></div>
  </article>;
}
