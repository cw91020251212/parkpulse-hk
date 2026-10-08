import { VEHICLE_LABELS, VEHICLE_TYPES, type ParkFilters, type VehicleType } from '../types';

type Props = {
  vehicleType: VehicleType;
  filters: ParkFilters;
  evLoading: boolean;
  toiletLoading: boolean;
  onVehicleChange: (vehicle: VehicleType) => void;
  onFiltersChange: (filters: ParkFilters) => void;
};

export function Filters({ vehicleType, filters, evLoading, toiletLoading, onVehicleChange, onFiltersChange }: Props) {
  const update = (patch: Partial<ParkFilters>) => onFiltersChange({ ...filters, ...patch });

  return (
    <section className="filters" aria-label="篩選停車場">
      <div className="filter-row vehicle-tabs" role="tablist" aria-label="車種">
        {VEHICLE_TYPES.map((type) => (
          <button
            className={type === vehicleType ? 'chip is-active' : 'chip'}
            key={type}
            type="button"
            role="tab"
            aria-selected={type === vehicleType}
            onClick={() => onVehicleChange(type)}
          >
            {VEHICLE_LABELS[type]}
          </button>
        ))}
      </div>
      <div className="filter-row" aria-label="條件篩選">
        <button className={filters.availableOnly ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.availableOnly} onClick={() => update({ availableOnly: !filters.availableOnly })}>只看有位</button>
        <button className={filters.openOnly ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.openOnly} onClick={() => update({ openOnly: !filters.openOnly })}>開放中</button>
        <button className={filters.hasEv ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.hasEv} onClick={() => update({ hasEv: !filters.hasEv })}>{evLoading ? '充電資料更新中' : '充電設施'}</button>
        <button className={filters.hasAccessible ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.hasAccessible} onClick={() => update({ hasAccessible: !filters.hasAccessible })}>無障礙</button>
        <label className="height-select">
          <span>車高</span>
          <select value={filters.minHeight} onChange={(event) => update({ minHeight: Number(event.target.value) })}>
            <option value={0}>不限</option>
            <option value={1.8}>≥ 1.8m</option>
            <option value={2}>≥ 2.0m</option>
            <option value={2.2}>≥ 2.2m</option>
          </select>
        </label>
        <button className={filters.showToilets ? 'chip is-on' : 'chip'} type="button" aria-pressed={filters.showToilets} onClick={() => update({ showToilets: !filters.showToilets })}>{toiletLoading ? '洗手間資料更新中' : '洗手間'}</button>
      </div>
    </section>
  );
}
