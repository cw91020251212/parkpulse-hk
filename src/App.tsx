import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Filters } from './components/Filters';
import { MapView } from './components/MapView';
import { ParkCard } from './components/ParkCard';
import { ParkDetail } from './components/ParkDetail';
import { findEvCharger } from './domain/evChargers';
import { getHeightLimit, getVacancyStatus, isAvailable, selectVacancyEntry, statusPriority } from './domain/carpark';
import { distanceInKm } from './domain/distance';
import { useCarparks } from './hooks/useCarparks';
import { useEvChargers } from './hooks/useEvChargers';
import type { Coordinates, ParkFilters, ParkViewModel, VehicleType } from './types';

const HONG_KONG_CENTER: Coordinates = { lat: 22.3193, lng: 114.1694 };
const NEARBY_RADIUS_KM = 2;
const TEXT_SCALES = [100, 115, 130] as const;
type TextScale = typeof TEXT_SCALES[number];

const INITIAL_FILTERS: ParkFilters = {
  availableOnly: true,
  openOnly: false,
  hasEv: false,
  hasAccessible: false,
  minHeight: 0,
};

const PREFERENCES_KEY = 'parkspot:preferences:v1';

function readPreferences() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? '{}') as Partial<{ vehicleType: VehicleType; filters: ParkFilters; textScale: TextScale }>;
    const vehicleType = saved.vehicleType && ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach'].includes(saved.vehicleType)
      ? saved.vehicleType
      : 'privateCar';
    const savedFilters = saved.filters;
    const filters: ParkFilters = {
      availableOnly: typeof savedFilters?.availableOnly === 'boolean' ? savedFilters.availableOnly : INITIAL_FILTERS.availableOnly,
      openOnly: typeof savedFilters?.openOnly === 'boolean' ? savedFilters.openOnly : INITIAL_FILTERS.openOnly,
      hasEv: typeof savedFilters?.hasEv === 'boolean' ? savedFilters.hasEv : INITIAL_FILTERS.hasEv,
      hasAccessible: typeof savedFilters?.hasAccessible === 'boolean' ? savedFilters.hasAccessible : INITIAL_FILTERS.hasAccessible,
      minHeight: [0, 1.8, 2, 2.2].includes(savedFilters?.minHeight ?? -1) ? savedFilters?.minHeight ?? 0 : INITIAL_FILTERS.minHeight,
    };
    const textScale = TEXT_SCALES.includes(saved.textScale ?? 0 as TextScale) ? saved.textScale as TextScale : 100;
    return { vehicleType, filters, textScale };
  } catch {
    return { vehicleType: 'privateCar' as VehicleType, filters: INITIAL_FILTERS, textScale: 100 as TextScale };
  }
}

type LocationState = 'default' | 'locating' | 'ready' | 'denied' | 'unavailable';

function Logo() {
  return <span className="brand-mark" aria-hidden="true"><span>P</span></span>;
}

function RefreshIcon() {
  return (
    <svg className="refresh-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-3-6.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M21 3v6h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function LocateIcon() {
  return <img className="locate-icon" src="/location-control.png" alt="" />;
}

export default function App() {
  const { infos, vacancyById, loading, refreshing, error, refresh, retry } = useCarparks();
  const { chargers, loading: evLoading, error: evError } = useEvChargers();
  const [position, setPosition] = useState<Coordinates>(HONG_KONG_CENTER);
  const [locationState, setLocationState] = useState<LocationState>('default');
  const [vehicleType, setVehicleType] = useState<VehicleType>(() => readPreferences().vehicleType);
  const [filters, setFilters] = useState<ParkFilters>(() => readPreferences().filters);
  const [textScale, setTextScale] = useState<TextScale>(() => readPreferences().textScale);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ vehicleType, filters, textScale }));
    } catch {
      // 私隱模式或儲存空間不足時仍可正常使用。
    }
  }, [vehicleType, filters, textScale]);

  useEffect(() => {
    if (!mapExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMapExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mapExpanded]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationState('unavailable');
      return;
    }

    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setLocationState('ready');
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const nearbyParks = useMemo<ParkViewModel[]>(() => {
    return infos
      .map((info) => {
        const vacancyEntry = selectVacancyEntry(vacancyById.get(info.park_Id)?.[vehicleType]);
        const status = getVacancyStatus(info, vacancyEntry);
        const distanceKm = distanceInKm(position, { lat: info.latitude, lng: info.longitude });
        return { info, status, distanceKm, heightLimit: getHeightLimit(info), evCharger: findEvCharger(info, chargers) };
      })
      .filter((park) => park.distanceKm <= NEARBY_RADIUS_KM)
      .sort((left, right) => {
        const statusDifference = statusPriority(left.status) - statusPriority(right.status);
        if (statusDifference !== 0) return statusDifference;
        return left.distanceKm - right.distanceKm;
      });
  }, [chargers, infos, position, vacancyById, vehicleType]);

  const displayedParks = useMemo(() => {
    return nearbyParks.filter((park) => {
      const facilities = park.info.facilities ?? [];
      const isOpen = park.info.opening_status === 'OPEN' && park.status.kind !== 'closed';
      const hasEv = Boolean(park.evCharger) || facilities.includes('evCharger');
      return (
        (!filters.availableOnly || isAvailable(park.status)) &&
        (!filters.openOnly || isOpen) &&
        (!filters.hasEv || hasEv) &&
        (!filters.hasAccessible || facilities.includes('disabilities')) &&
        (!filters.minHeight || (park.heightLimit !== undefined && park.heightLimit >= filters.minHeight))
      );
    });
  }, [filters, nearbyParks]);

  const selectedPark = displayedParks.find((park) => park.info.park_Id === selectedId);
  const availableCount = displayedParks.filter((park) => isAvailable(park.status)).length;
  const visibleError = error || (filters.hasEv && evError ? `充電器資料提示：${evError}` : null);
  const scaleDown = () => setTextScale((current) => TEXT_SCALES[Math.max(0, TEXT_SCALES.indexOf(current) - 1)]);
  const scaleUp = () => setTextScale((current) => TEXT_SCALES[Math.min(TEXT_SCALES.length - 1, TEXT_SCALES.indexOf(current) + 1)]);
  const toggleMap = () => {
    setSelectedId(null);
    setMapExpanded((current) => !current);
  };

  return (
    <main className={`app-shell${mapExpanded ? ' map-focus' : ''}`} style={{ '--ui-zoom': String(textScale / 100) } as CSSProperties}>
      <header className="topbar">
        <div className="brand"><Logo /><div><p className="brand-kicker">HONG KONG PARKING</p><h1>泊邊有位</h1></div></div>
        <div className="top-actions">
          <div className="text-size-control" role="group" aria-label="文字大小">
            <button type="button" onClick={scaleDown} disabled={textScale === 100} aria-label="縮小文字">A−</button>
            <span>文字 {textScale}%</span>
            <button type="button" onClick={scaleUp} disabled={textScale === 130} aria-label="放大文字">A+</button>
          </div>
          <button className={refreshing ? 'refresh-button is-refreshing' : 'refresh-button'} type="button" onClick={refresh} disabled={refreshing || loading} aria-label={refreshing ? '正在更新停車位資料' : '立即更新停車位資料'} title={refreshing ? '正在更新' : '立即更新'}>
            <RefreshIcon />
          </button>
          <button className={locationState === 'locating' ? 'locate-button is-locating' : 'locate-button'} type="button" onClick={requestLocation} disabled={locationState === 'locating'} aria-label={locationState === 'locating' ? '正在定位目前位置' : '使用我的位置'} title={locationState === 'locating' ? '正在定位' : '使用我的位置'}>
            <LocateIcon />
          </button>
        </div>
      </header>

      <Filters vehicleType={vehicleType} filters={filters} evLoading={evLoading} onVehicleChange={(type) => { setVehicleType(type); setSelectedId(null); }} onFiltersChange={setFilters} />

      {visibleError && <div className="error-banner" role="alert"><span>資料連線提示：{visibleError}</span><button type="button" onClick={retry}>重試</button></div>}

      <section className="workspace">
        <MapView position={position} parks={displayedParks} selectedId={selectedId} onSelect={setSelectedId} expanded={mapExpanded} onToggleExpanded={toggleMap} />
        <section className="results-panel" aria-label="附近停車場清單">
          <div className="results-heading">
            <div><p className="eyebrow">附近 {NEARBY_RADIUS_KM} 公里</p><h2>{loading ? '正在整理停車場…' : `${displayedParks.length} 個結果`}</h2></div>
            <p>{loading ? '資料載入中' : filters.hasEv && evLoading ? '更新充電器資料' : `${availableCount} 個有位選項`}</p>
          </div>
          <div className="results-list">
            {loading && <div className="loading-state"><span className="loader" />讀取停車場及即時空位…</div>}
            {!loading && filters.hasEv && evLoading && <div className="loading-state"><span className="loader" />正在讀取環保署官方充電器資料…</div>}
            {!loading && (!filters.hasEv || !evLoading) && displayedParks.map((park) => (
              <ParkCard key={park.info.park_Id} park={park} vehicleType={vehicleType} selected={park.info.park_Id === selectedId} onSelect={() => setSelectedId(park.info.park_Id)} />
            ))}
            {!loading && !evLoading && displayedParks.length === 0 && (
              <div className="empty-state"><strong>呢個範圍暫時冇符合條件嘅結果</strong><p>試下取消部分篩選，或者使用定位後再刷新。</p></div>
            )}
          </div>
        </section>
      </section>

      {selectedPark && <ParkDetail park={selectedPark} vehicleType={vehicleType} onClose={() => setSelectedId(null)} />}

      <footer>
        <span>資料來源：香港政府 <a href="https://data.gov.hk/tc-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy" target="_blank" rel="noreferrer">data.gov.hk</a>、環境保護署</span>
        <span>空位及充電器資料只供參考，請以現場情況為準。</span>
      </footer>
    </main>
  );
}
