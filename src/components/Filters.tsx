import { VEHICLE_TYPES, type NearbyMode, type ParkFilters, type VehicleType } from '../types';
import { text, vehicleLabel, type Language } from '../i18n';

type Props = {
  language: Language;
  vehicleType: VehicleType | null;
  filters: ParkFilters;
  evLoading: boolean;
  facilityMode: NearbyMode | null;
  facilityLoading: boolean;
  onFacilityModeChange: (mode: NearbyMode | null) => void;
  onVehicleChange: (vehicle: VehicleType | null) => void;
  onFiltersChange: (filters: ParkFilters) => void;
};

export function Filters({ language, vehicleType, filters, evLoading, facilityMode, facilityLoading, onVehicleChange, onFiltersChange, onFacilityModeChange }: Props) {
  const update = (patch: Partial<ParkFilters>) => onFiltersChange({ ...filters, ...patch });
  const isMotorcycle = vehicleType === 'motorCycle';
  const isMotorcycleRoadside = isMotorcycle && facilityMode === 'onStreet';
  const facilityText = (mode: NearbyMode) => mode === 'toilets' ? text(language, 'washrooms') : mode === 'fuel' ? text(language, 'fuel') : mode === 'onStreet' ? (isMotorcycle ? text(language, 'motorcycleOnStreet') : text(language, 'onStreet')) : 'ATM';

  return (
    <section className="filters" aria-label={text(language, 'filterParking')}>
      <div className="filter-row vehicle-tabs" aria-label={!vehicleType || isMotorcycle ? text(language, 'vehicleType') : `${text(language, 'vehicleType')} / ${text(language, 'height')}`}>
        <div className="vehicle-type-tabs" role="group" aria-label={text(language, 'vehicleType')}>
          {VEHICLE_TYPES.map((type) => (
            <button className={type === vehicleType ? 'chip is-active' : 'chip'} key={type} type="button" aria-pressed={type === vehicleType} onClick={() => onVehicleChange(type === vehicleType ? null : type)}>{vehicleLabel(language, type)}</button>
          ))}
        </div>
        {vehicleType && !isMotorcycle && <label className="height-select"><span>{text(language, 'height')}</span><select value={filters.minHeight} onChange={(event) => update({ minHeight: Number(event.target.value) })}><option value={0}>{text(language, 'unlimited')}</option><option value={1.8}>≥ 1.8m</option><option value={2}>≥ 2.0m</option><option value={2.2}>≥ 2.2m</option></select></label>}
      </div>
      <div className="filter-row" aria-label={text(language, 'filterConditions')}>
        {vehicleType && !isMotorcycleRoadside && <button className={filters.availableOnly ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.availableOnly} onClick={() => update({ availableOnly: !filters.availableOnly })}>{text(language, 'availableOnly')}</button>}
        {vehicleType && !isMotorcycleRoadside && <button className={filters.includeNoLiveData ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.includeNoLiveData} title={text(language, 'includeNoLiveDataHelp')} onClick={() => update({ includeNoLiveData: !filters.includeNoLiveData, availableOnly: filters.includeNoLiveData ? filters.availableOnly : false })}>{text(language, 'includeNoLiveData')}</button>}
        {(vehicleType || facilityMode === 'onStreet') && <button className={facilityMode === 'onStreet' ? 'chip is-on' : 'chip'} type="button" aria-pressed={facilityMode === 'onStreet'} title={isMotorcycle ? text(language, 'motorcycleOnStreetTitle') : undefined} onClick={() => onFacilityModeChange(facilityMode === 'onStreet' ? null : 'onStreet')}>{facilityLoading && facilityMode === 'onStreet' ? text(language, 'dataLoading') : facilityText('onStreet')}</button>}
        {vehicleType && !isMotorcycleRoadside && <button className={filters.openOnly ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.openOnly} aria-label={text(language, 'openOnlyHelp')} onClick={() => update({ openOnly: !filters.openOnly })}>{text(language, 'openOnly')}</button>}
        {vehicleType && !isMotorcycle && <button className={filters.hasEv ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.hasEv} onClick={() => update({ hasEv: !filters.hasEv })}>{evLoading ? text(language, 'evLoading') : text(language, 'evFacilities')}</button>}
        {vehicleType && !isMotorcycle && <button className={filters.hasAccessible ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.hasAccessible} onClick={() => update({ hasAccessible: !filters.hasAccessible })}>{text(language, 'accessible')}</button>}
        {(['toilets', 'fuel', 'atm'] as const).map((mode) => <button key={mode} className={facilityMode === mode ? 'chip is-on' : 'chip'} type="button" aria-pressed={facilityMode === mode} onClick={() => onFacilityModeChange(facilityMode === mode ? null : mode)}>{facilityLoading && facilityMode === mode ? text(language, 'dataLoading') : facilityText(mode)}</button>)}
      </div>
    </section>
  );
}
