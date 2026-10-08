import { useEffect, useMemo, useState } from 'react';
import { Filters } from './components/Filters';
import { MapView } from './components/MapView';
import { ParkCard } from './components/ParkCard';
import { ParkDetail } from './components/ParkDetail';
import { getHeightLimit, getVacancyStatus, isAvailable, selectVacancyEntry, statusPriority } from './domain/carpark';
import { distanceInKm } from './domain/distance';
import { useCarparks } from './hooks/useCarparks';
import type { Coordinates, ParkFilters, ParkViewModel, VehicleType } from './types';

const HONG_KONG_CENTER: Coordinates = { lat: 22.3193, lng: 114.1694 };
const NEARBY_RADIUS_KM = 2;

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
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? '{}') as Partial<{ vehicleType: VehicleType; filters: ParkFilters }>;
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
    return { vehicleType, filters };
  } catch {
    return { vehicleType: 'privateCar' as VehicleType, filters: INITIAL_FILTERS };
  }
}

type LocationState = 'default' | 'locating' | 'ready' | 'denied' | 'unavailable';

function Logo() {
  return <span className="brand-mark" aria-hidden="true"><span>P</span></span>;
}

export default function App() {
  const { infos, vacancyById, loading, refreshing, error, lastFetchedAt, refresh, retry } = useCarparks();
  const [position, setPosition] = useState<Coordinates>(HONG_KONG_CENTER);
  const [locationState, setLocationState] = useState<LocationState>('default');
  const [vehicleType, setVehicleType] = useState<VehicleType>(() => readPreferences().vehicleType);
  const [filters, setFilters] = useState<ParkFilters>(() => readPreferences().filters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ vehicleType, filters }));
    } catch {
      // 私隱模式或儲存空間不足時仍可正常使用篩選。
    }
  }, [vehicleType, filters]);

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
        return { info, status, distanceKm, heightLimit: getHeightLimit(info) };
      })
      .filter((park) => park.distanceKm <= NEARBY_RADIUS_KM)
      .sort((left, right) => {
        const statusDifference = statusPriority(left.status) - statusPriority(right.status);
        if (statusDifference !== 0) return statusDifference;
        return left.distanceKm - right.distanceKm;
      });
  }, [infos, position, vacancyById, vehicleType]);

  const displayedParks = useMemo(() => {
    return nearbyParks.filter((park) => {
      const facilities = park.info.facilities ?? [];
      const isOpen = park.info.opening_status === 'OPEN' && park.status.kind !== 'closed';
      return (
        (!filters.availableOnly || isAvailable(park.status)) &&
        (!filters.openOnly || isOpen) &&
        (!filters.hasEv || facilities.includes('evCharger')) &&
        (!filters.hasAccessible || facilities.includes('disabilities')) &&
        (!filters.minHeight || (park.heightLimit !== undefined && park.heightLimit >= filters.minHeight))
      );
    });
  }, [filters, nearbyParks]);

  const selectedPark = displayedParks.find((park) => park.info.park_Id === selectedId);
  const availableCount = displayedParks.filter((park) => isAvailable(park.status)).length;
  const locationMessage = {
    default: '未使用定位 · 以香港中心顯示',
    locating: '正在定位…',
    ready: '已使用你的目前位置',
    denied: '未能取得定位 · 以香港中心顯示',
    unavailable: '此裝置不支援定位 · 以香港中心顯示',
  }[locationState];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><Logo /><div><p className="brand-kicker">HONG KONG PARKING</p><h1>泊邊有位</h1></div></div>
        <div className="top-actions">
          <span className="live-state"><i />即時資料</span>
          <button className="locate-button" type="button" onClick={requestLocation} disabled={locationState === 'locating'}>
            <span aria-hidden="true">⌖</span>{locationState === 'locating' ? '定位中' : '使用我的位置'}
          </button>
        </div>
      </header>

      <section className="status-strip" aria-live="polite">
        <span><i className="location-pulse" />{locationMessage}</span>
        <span>{lastFetchedAt ? `空位資料剛於 ${lastFetchedAt.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })} 讀取` : '正在連接政府資料服務…'}</span>
        <button type="button" onClick={refresh} disabled={refreshing || loading}>{refreshing ? '更新中…' : '立即更新'}</button>
      </section>

      <Filters vehicleType={vehicleType} filters={filters} onVehicleChange={(type) => { setVehicleType(type); setSelectedId(null); }} onFiltersChange={setFilters} />

      {error && <div className="error-banner" role="alert"><span>資料連線提示：{error}</span><button type="button" onClick={retry}>重試</button></div>}

      <section className="workspace">
        <MapView position={position} parks={displayedParks} selectedId={selectedId} onSelect={setSelectedId} />
        <section className="results-panel" aria-label="附近停車場清單">
          <div className="results-heading">
            <div><p className="eyebrow">附近 {NEARBY_RADIUS_KM} 公里</p><h2>{loading ? '正在整理停車場…' : `${displayedParks.length} 個結果`}</h2></div>
            <p>{loading ? '資料載入中' : `${availableCount} 個有位選項`}</p>
          </div>
          <div className="results-list">
            {loading && <div className="loading-state"><span className="loader" />讀取停車場及即時空位…</div>}
            {!loading && displayedParks.map((park) => (
              <ParkCard key={park.info.park_Id} park={park} vehicleType={vehicleType} selected={park.info.park_Id === selectedId} onSelect={() => setSelectedId(park.info.park_Id)} />
            ))}
            {!loading && displayedParks.length === 0 && (
              <div className="empty-state"><strong>呢個範圍暫時冇符合條件嘅結果</strong><p>試下取消部分篩選，或者使用定位後再刷新。</p></div>
            )}
          </div>
        </section>
      </section>

      {selectedPark && <ParkDetail park={selectedPark} vehicleType={vehicleType} onClose={() => setSelectedId(null)} />}

      <footer>
        <span>資料來源：香港政府 <a href="https://data.gov.hk/tc-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy" target="_blank" rel="noreferrer">data.gov.hk</a></span>
        <span>空位資料只供參考，請以現場情況為準。</span>
      </footer>
    </main>
  );
}
