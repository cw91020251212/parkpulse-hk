import { text, type Language } from '../i18n';
import type { NearbyFacility } from '../types';
import './DrinkingWater.css';

type Props = { language: Language; facility: NearbyFacility };
export function DrinkingWaterDetailFields({ language, facility }: Props) {
  const water = facility.drinkingWater;
  if (!water) return null;
  return <section className="water-detail-info">
    {water.temporaryClosed && <p className="water-closed-notice" role="note">{text(language, 'waterTemporarilyClosed')}</p>}
    <section className="detail-section"><h3>{text(language, 'waterLocation')}</h3><p className="water-location-description">{water.location || text(language, 'waterNotPublished')}</p><p className="data-note">{facility.locationNote || text(language, 'waterCoordinateNote')}</p></section>
    <dl className="detail-grid">
      <div><dt>{text(language, 'waterDispenserType')}</dt><dd>{water.type || text(language, 'waterNotPublished')}</dd></div>
      <div><dt>{text(language, 'waterMachineCount')}</dt><dd>{water.unitCount == null ? text(language, 'waterNotPublished') : text(language, 'waterUnitCount', { count: water.unitCount })}</dd></div>
      <div><dt>{text(language, 'waterEnvironment')}</dt><dd>{text(language, water.indoorOutdoor === 'indoor' ? 'waterIndoor' : water.indoorOutdoor === 'outdoor' ? 'waterOutdoor' : 'waterEnvironmentUnknown')}</dd></div>
      <div><dt>{text(language, 'waterTemperature')}</dt><dd>{water.temperature || text(language, 'waterNotPublished')}</dd></div>
    </dl>
    <section className="detail-section"><h3>{text(language, 'waterServiceHours')}</h3><p>{facility.openingHours || text(language, 'waterHoursUnknown')}</p></section>
    <section className="detail-section"><h3>{text(language, 'waterFilterSpec')}</h3><p>{text(language, water.filterStatus === 'confirmed' ? 'waterFilterConfirmed' : 'waterFilterNotPublished')}</p></section>
    <section className="detail-section"><h3>{text(language, 'waterAccess')}</h3><p>{water.access || text(language, 'waterAccessUnknown')}</p><p>{text(language, 'waterAdvice')}</p></section>
    {water.officialMapUrl && <a className="secondary-action" href={water.officialMapUrl} target="_blank" rel="noreferrer">{text(language, water.provider === 'mtr' ? 'waterOfficialDirectory' : 'waterOfficialLocationMap')}</a>}
    <p className="data-note">{facility.locationSourceUrl && <><a href={facility.locationSourceUrl} target="_blank" rel="noreferrer">{text(language, 'waterCoordinateSource')}</a> · </>}{text(language, 'waterSnapshotDate')}: {facility.snapshotGeneratedAt ? new Date(facility.snapshotGeneratedAt).toLocaleString(language === 'en' ? 'en-HK' : 'zh-HK', { hour12: false }) : text(language, 'waterNotPublished')}</p>
  </section>;
}
