import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { FilterModeSwitch, Filters, type FilterSection } from './components/Filters';
import { DisclaimerDialog } from './components/DisclaimerDialog';
import { HelpDialog } from './components/HelpDialog';
import { MapView } from './components/MapView';
import { MedicalCategoryFilters, MedicalLocationCard, MedicalLocationDetail } from './components/MedicalLocationCard';
import { NearbyFacilityCard } from './components/NearbyFacilityCard';
import { NearbyFacilityDetail } from './components/NearbyFacilityDetail';
import { OnStreetParkingCard } from './components/OnStreetParkingCard';
import { OnStreetParkingDetail } from './components/OnStreetParkingDetail';
import { ParkCard } from './components/ParkCard';
import { ParkDetail } from './components/ParkDetail';
import { ToiletCard } from './components/ToiletCard';
import { publicAsset } from './api/site';
import { getHeightLimit, getVacancyStatus, hasAccessibleParking, isAvailable, selectVacancyEntry, statusPriority } from './domain/carpark';
import { distanceInKm, formatDistance } from './domain/distance';
import { isWithinSearchScope } from './domain/mapViewport';
import { removeCrossSourceLcsdToiletDuplicates, sameToiletAtSamePlace } from './domain/toiletDedupe';
import { findEvCharger, hasEvFacility } from './domain/evChargers';
import { emergencyWaitStatistics, formatEmergencyHours, formatHaUpdateTime } from './domain/emergencyWait';
import { groupOnStreetResults, limitOnStreetResults, supportsOnStreetVehicle } from './domain/onStreet';
import { MEDICAL_CATEGORY_LABEL_KEYS, MEDICAL_CATEGORY_ORDER, MEDICAL_LOCATIONS, MEDICAL_SNAPSHOT_DATE, medicalIconFile, medicalSpecialtyLabel, SOPC_SPECIALTIES, type SopcSpecialtyCode } from './domain/medicalLocations';
import { text, type Language } from './i18n';
import { useCarparks } from './hooks/useCarparks';
import { useEvChargers } from './hooks/useEvChargers';
import { useLcsdVenues } from './hooks/useLcsdVenues';
import { useAdditionalToilets } from './hooks/useAdditionalToilets';
import { useNearbyFacilities } from './hooks/useNearbyFacilities';
import { useOnStreetParking } from './hooks/useOnStreetParking';
import { useMotorcycleRoadside } from './hooks/useMotorcycleRoadside';
import { usePublicToilets } from './hooks/usePublicToilets';
import { useVerifiedPlaceLinks } from './hooks/useVerifiedPlaceLinks';
import sharedManualToiletPositions from './data/manual-toilet-positions.json';
import { manualToiletPositionDocument, parseManualToiletPositions, type ManualToiletPositionMap } from './domain/manualToiletPositions';
import type { Coordinates, MapViewport, MedicalCategory, MedicalCategoryFilter, MedicalLocationViewModel, NearbyFacilityViewModel, NearbyMode, OnStreetParkingRecordViewModel, OnStreetParkingViewModel, ParkFilters, ParkViewModel, PublicToiletViewModel, SearchScope, VehicleType } from './types';

const HONG_KONG_CENTER: Coordinates = { lat: 22.3193, lng: 114.1694 };
const NEARBY_RADIUS_KM = 2;
const TEXT_SCALES = [100, 115, 130] as const;
type TextScale = typeof TEXT_SCALES[number];
type District = { label: string; englishLabel: string; aliases: string[]; coordinates: Coordinates };
type ManualPositionDraft = { toiletId: string; position: Coordinates };
const STARTUP_LOCATION_FALLBACK_MS = 3_500;
const MANUAL_TOILET_POSITIONS_KEY = 'parkpulse:manual-toilet-positions:v1';
const SHARED_MANUAL_TOILET_POSITIONS = parseManualToiletPositions(sharedManualToiletPositions);

const DISTRICTS: District[] = [
  { label: '中西區', englishLabel: 'Central and Western', aliases: ['中西區', '中西', 'central and western'], coordinates: { lat: 22.2855, lng: 114.1546 } },
  { label: '灣仔區', englishLabel: 'Wan Chai', aliases: ['灣仔區', '灣仔', 'wan chai'], coordinates: { lat: 22.279, lng: 114.173 } },
  { label: '東區', englishLabel: 'Eastern', aliases: ['東區', 'eastern'], coordinates: { lat: 22.284, lng: 114.224 } },
  { label: '南區', englishLabel: 'Southern', aliases: ['南區', 'southern'], coordinates: { lat: 22.247, lng: 114.158 } },
  { label: '油尖旺區', englishLabel: 'Yau Tsim Mong', aliases: ['油尖旺區', '油尖旺', 'yau tsim mong'], coordinates: { lat: 22.319, lng: 114.169 } },
  { label: '深水埗區', englishLabel: 'Sham Shui Po', aliases: ['深水埗區', '深水埗', 'sham shui po'], coordinates: { lat: 22.329, lng: 114.16 } },
  { label: '九龍城區', englishLabel: 'Kowloon City', aliases: ['九龍城區', '九龍城', 'kowloon city'], coordinates: { lat: 22.33, lng: 114.188 } },
  { label: '黃大仙區', englishLabel: 'Wong Tai Sin', aliases: ['黃大仙區', '黃大仙', 'wong tai sin'], coordinates: { lat: 22.341, lng: 114.193 } },
  { label: '觀塘區', englishLabel: 'Kwun Tong', aliases: ['觀塘區', '觀塘', 'kwun tong'], coordinates: { lat: 22.313, lng: 114.225 } },
  { label: '葵青區', englishLabel: 'Kwai Tsing', aliases: ['葵青區', '葵青', 'kwai tsing'], coordinates: { lat: 22.353, lng: 114.129 } },
  { label: '荃灣區', englishLabel: 'Tsuen Wan', aliases: ['荃灣區', '荃灣', 'tsuen wan'], coordinates: { lat: 22.371, lng: 114.117 } },
  { label: '屯門區', englishLabel: 'Tuen Mun', aliases: ['屯門區', '屯門', 'tuen mun'], coordinates: { lat: 22.391, lng: 113.975 } },
  { label: '元朗區', englishLabel: 'Yuen Long', aliases: ['元朗區', '元朗', 'yuen long'], coordinates: { lat: 22.445, lng: 114.022 } },
  { label: '北區', englishLabel: 'North', aliases: ['北區', 'north district'], coordinates: { lat: 22.5, lng: 114.132 } },
  { label: '大埔區', englishLabel: 'Tai Po', aliases: ['大埔區', '大埔', 'tai po'], coordinates: { lat: 22.4501, lng: 114.1688 } },
  { label: '沙田區', englishLabel: 'Sha Tin', aliases: ['沙田區', '沙田', 'sha tin'], coordinates: { lat: 22.387, lng: 114.195 } },
  { label: '西貢區', englishLabel: 'Sai Kung', aliases: ['西貢區', '西貢', 'sai kung'], coordinates: { lat: 22.383, lng: 114.271 } },
  { label: '離島區', englishLabel: 'Islands', aliases: ['離島區', '離島', 'islands'], coordinates: { lat: 22.281, lng: 113.943 } },
];

const normalizeDistrict = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s-]+/g, '');
const shortBankName = (bank: string) => bank.replace(/\(香港\)\s*/g, '').replace(/\s*有限公司$/, '');
const INITIAL_FILTERS: ParkFilters = { availableOnly: true, includeNoLiveData: false, openOnly: false, hasEv: false, hasAccessible: false, minHeight: 0 };
const PREFERENCES_KEY = 'parkspot:preferences:v1';

function readLocalManualToiletPositions(): ManualToiletPositionMap {
  try {
    const saved = window.localStorage.getItem(MANUAL_TOILET_POSITIONS_KEY);
    return saved ? parseManualToiletPositions(JSON.parse(saved)) : {};
  } catch { return {}; }
}

function readPreferences() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? '{}') as Partial<{ vehicleType: VehicleType | null; filters: ParkFilters & { showToilets?: boolean }; textScale: TextScale; facilityMode: NearbyMode; atmBank: string; language: Language; searchScope: SearchScope }>;
    const vehicleType = saved.vehicleType === null ? null : saved.vehicleType && ['privateCar', 'motorCycle', 'LGV', 'HGV', 'coach'].includes(saved.vehicleType) ? saved.vehicleType : 'privateCar';
    const filters: ParkFilters = { availableOnly: typeof saved.filters?.availableOnly === 'boolean' ? saved.filters.availableOnly : INITIAL_FILTERS.availableOnly, includeNoLiveData: typeof saved.filters?.includeNoLiveData === 'boolean' ? saved.filters.includeNoLiveData : INITIAL_FILTERS.includeNoLiveData, openOnly: typeof saved.filters?.openOnly === 'boolean' ? saved.filters.openOnly : INITIAL_FILTERS.openOnly, hasEv: typeof saved.filters?.hasEv === 'boolean' ? saved.filters.hasEv : INITIAL_FILTERS.hasEv, hasAccessible: typeof saved.filters?.hasAccessible === 'boolean' ? saved.filters.hasAccessible : INITIAL_FILTERS.hasAccessible, minHeight: [0, 1.8, 2, 2.2].includes(saved.filters?.minHeight ?? -1) ? saved.filters?.minHeight ?? 0 : INITIAL_FILTERS.minHeight };
    const facilityMode = ['toilets', 'fuel', 'atm', 'aed', 'emergency', 'border', 'hkjc', 'medical', 'onStreet'].includes(saved.facilityMode ?? '') ? saved.facilityMode : saved.filters?.showToilets ? 'toilets' : null;
    return { vehicleType: facilityMode && facilityMode !== 'onStreet' ? null : vehicleType, filters, textScale: TEXT_SCALES.includes(saved.textScale ?? 0 as TextScale) ? saved.textScale as TextScale : 100 as TextScale, facilityMode, atmBank: typeof saved.atmBank === 'string' ? saved.atmBank : '', language: saved.language === 'en' ? 'en' as const : 'zh-Hant' as const, searchScope: saved.searchScope === 'viewport' ? 'viewport' as const : 'radius' as const };
  } catch { return { vehicleType: 'privateCar' as VehicleType, filters: INITIAL_FILTERS, textScale: 100 as TextScale, facilityMode: null, atmBank: '', language: 'zh-Hant' as Language, searchScope: 'radius' as SearchScope }; }
}

function Logo() { return <img className="brand-mark" src={publicAsset('parkpulse-hk-icon.png')} alt="" aria-hidden="true" />; }
function RefreshIcon() { return <svg className="refresh-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" /><path d="M21 3v6h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" /></svg>; }
function SettingsIcon() { return <svg className="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l1.2-1-1.5-2.6-1.5.6a7.9 7.9 0 0 0-2.6-1.5L14.7 4h-3.4l-.3 2a7.9 7.9 0 0 0-2.6 1.5l-1.5-.6-1.5 2.6 1.2 1a7.7 7.7 0 0 0 0 3l-1.2 1 1.5 2.6 1.5-.6a7.9 7.9 0 0 0 2.6 1.5l.3 2h3.4l.3-2a7.9 7.9 0 0 0 2.6-1.5l1.5.6 1.5-2.6z" /></svg>; }
function LocateIcon() { return <svg className="locate-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" fillRule="evenodd" d="M12 2C7.03 2 3 6.03 3 11c0 6.5 9 12 9 12s9-5.5 9-12c0-4.97-4.03-9-9-9Zm0 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /></svg>; }
const AED_SYMBOL_URL = `${publicAsset('icons/iso-7010-e010-aed.svg')}?v=20261011d`;
const BORDER_SYMBOL_URL = publicAsset('icons/border-control.svg');
function formatSnapshotTime(language: Language, value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language === 'en' ? 'en-HK' : 'zh-HK', { dateStyle: 'medium', timeStyle: 'short', hour12: false }); }

export default function App() {
  const { infos, vacancyById, loading, vacancyLoading, refreshing, error, refresh, retry } = useCarparks();
  const { chargers, loading: evLoading, error: evError } = useEvChargers();
  const [position, setPosition] = useState<Coordinates>(HONG_KONG_CENTER);
  const [hasGpsPosition, setHasGpsPosition] = useState(false);
  const [hasManualMapMarker, setHasManualMapMarker] = useState(false);
  const [startupLocationPending, setStartupLocationPending] = useState(true);
  const [startupLocationFallbackActive, setStartupLocationFallbackActive] = useState(false);
  const [startupLocationFlight, setStartupLocationFlight] = useState(false);
  const [areaName, setAreaName] = useState('香港中心');
  const [locationState, setLocationState] = useState<'default' | 'locating' | 'ready' | 'denied' | 'unavailable'>('default');
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(() => readPreferences().vehicleType);
  const [filters, setFilters] = useState<ParkFilters>(() => readPreferences().filters);
  const [textScale, setTextScale] = useState<TextScale>(() => readPreferences().textScale);
  const [facilityMode, setFacilityMode] = useState<NearbyMode | null>(() => readPreferences().facilityMode ?? null);
  const [medicalCategoryFilter, setMedicalCategoryFilter] = useState<MedicalCategoryFilter>('all');
  const [medicalSpecialtyFilter, setMedicalSpecialtyFilter] = useState<SopcSpecialtyCode | 'all'>('all');
  const [filterSection, setFilterSection] = useState<FilterSection>(() => {
    const savedFacilityMode = readPreferences().facilityMode;
    return savedFacilityMode && savedFacilityMode !== 'onStreet' ? 'facilities' : 'parking';
  });
  const [atmBank, setAtmBank] = useState(() => readPreferences().atmBank);
  const [language, setLanguage] = useState<Language>(() => readPreferences().language);
  const [searchScope, setSearchScope] = useState<SearchScope>(() => readPreferences().searchScope);
  const [mapViewport, setMapViewport] = useState<MapViewport | null>(null);
  const [localManualToiletPositions, setLocalManualToiletPositions] = useState<ManualToiletPositionMap>(readLocalManualToiletPositions);
  const [manualPositionDraft, setManualPositionDraft] = useState<ManualPositionDraft | null>(null);
  const activeVehicleType: VehicleType = vehicleType ?? 'privateCar';
  const rangeOrigin = searchScope === 'viewport' && mapViewport ? mapViewport.center : position;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOnStreetId, setSelectedOnStreetId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [selectedMedicalId, setSelectedMedicalId] = useState<string | null>(null);
  const [selectedToiletId, setSelectedToiletId] = useState<string | null>(null);
  const [lastViewedParkId, setLastViewedParkId] = useState<string | null>(null);
  const [lastViewedOnStreetId, setLastViewedOnStreetId] = useState<string | null>(null);
  const [lastViewedToiletId, setLastViewedToiletId] = useState<string | null>(null);
  const [viewedMarkerId, setViewedMarkerId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [resultsExpanded, setResultsExpanded] = useState(false);
  const [mapLegendOpen, setMapLegendOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [recenterRequest, setRecenterRequest] = useState(0);
  const [districtSearchOpen, setDistrictSearchOpen] = useState(false);
  const [districtQuery, setDistrictQuery] = useState('');
  const [districtMessage, setDistrictMessage] = useState('');
  const detailHistoryActive = useRef(false);
  const markMarkerViewed = useCallback((markerKey: string) => {
    setViewedMarkerId(markerKey);
  }, []);
  const updateMapViewport = useCallback((next: MapViewport) => {
    setMapViewport((current) => current && current.north === next.north && current.south === next.south && current.east === next.east && current.west === next.west && current.center.lat === next.center.lat && current.center.lng === next.center.lng ? current : next);
  }, []);
  const openFacilityDetail = useCallback((facilityId: string) => {
    if (!detailHistoryActive.current) {
      window.history.pushState({ ...(window.history.state ?? {}), parkspotDetail: true }, '');
      detailHistoryActive.current = true;
    }
    setSelectedId(null);
    setSelectedOnStreetId(null);
    setSelectedToiletId(null);
    setSelectedMedicalId(null);
    setSelectedFacilityId(facilityId);
    markMarkerViewed(`facility:${facilityId}`);
  }, [markMarkerViewed]);
  const openMedicalDetail = useCallback((medicalId: string) => {
    if (!detailHistoryActive.current) {
      window.history.pushState({ ...(window.history.state ?? {}), parkspotDetail: true }, '');
      detailHistoryActive.current = true;
    }
    setSelectedId(null);
    setSelectedOnStreetId(null);
    setSelectedFacilityId(null);
    setSelectedToiletId(null);
    setSelectedMedicalId(medicalId);
    markMarkerViewed(`medical:${medicalId}`);
  }, [markMarkerViewed]);
  const openToiletDetail = useCallback((toiletId: string) => {
    if (!detailHistoryActive.current) {
      window.history.pushState({ ...(window.history.state ?? {}), parkspotDetail: true }, '');
      detailHistoryActive.current = true;
    }
    setSelectedId(null);
    setSelectedOnStreetId(null);
    setSelectedFacilityId(null);
    setSelectedMedicalId(null);
    setSelectedToiletId(toiletId);
    setLastViewedToiletId(toiletId);
    markMarkerViewed(`toilet:${toiletId}`);
  }, [markMarkerViewed]);
  const closeFacilityDetail = useCallback(() => {
    setSelectedFacilityId(null);
    setSelectedToiletId(null);
    setSelectedMedicalId(null);
    if (detailHistoryActive.current) {
      detailHistoryActive.current = false;
      window.history.back();
    }
  }, []);
  const startupLocationRequested = useRef(false);
  const hasManualCentreSelection = useRef(false);
  const startupLocationFallbackTimer = useRef<number | undefined>(undefined);
  const startupLocationSettled = useRef(false);
  const startupLocationDisplayReleased = useRef(searchScope === 'viewport');
  const searchScopeRef = useRef(searchScope);
  searchScopeRef.current = searchScope;
  const { toilets, loading: toiletLoading, error: toiletError, retry: retryToilets } = usePublicToilets(facilityMode === 'toilets');
  const { venues: lcsdVenues, loading: lcsdLoading, error: lcsdError, retry: retryLcsdVenues } = useLcsdVenues(facilityMode === 'toilets');
  const { toilets: additionalWashrooms, loading: additionalLoading, error: additionalError, retry: retryAdditional } = useAdditionalToilets(facilityMode === 'toilets');
  const { facilities: nearbyFacilityData, source: nearbyFacilitySource, loading: nearbyFacilityLoading, error: nearbyFacilityError, retry: retryNearbyFacilities } = useNearbyFacilities(facilityMode, language);
  const { records: onStreetData, source: onStreetSource, loading: onStreetLoading, error: onStreetError, retry: retryOnStreet } = useOnStreetParking(facilityMode === 'onStreet' && vehicleType !== null && vehicleType !== 'motorCycle');
  const { groups: motorcycleRoadsideGroups, source: motorcycleRoadsideSource, loading: motorcycleRoadsideLoading, error: motorcycleRoadsideError, retry: retryMotorcycleRoadside } = useMotorcycleRoadside(facilityMode === 'onStreet' && vehicleType === 'motorCycle');
  const verifiedPlaceLinks = useVerifiedPlaceLinks();

  const clearStartupLocationFallback = () => {
    if (startupLocationFallbackTimer.current !== undefined) {
      window.clearTimeout(startupLocationFallbackTimer.current);
      startupLocationFallbackTimer.current = undefined;
    }
  };

  const requestLocation = (source: 'startup' | 'manual') => {
    if (source === 'startup' && !startupLocationDisplayReleased.current) {
      clearStartupLocationFallback();
      startupLocationFallbackTimer.current = window.setTimeout(() => {
        if (startupLocationSettled.current) return;
        startupLocationDisplayReleased.current = true;
        setStartupLocationFallbackActive(true);
        setStartupLocationPending(false);
        setLocationState((current) => current === 'locating' ? 'default' : current);
      }, STARTUP_LOCATION_FALLBACK_MS);
    }
    if (source === 'manual') hasManualCentreSelection.current = true;
    if (!navigator.geolocation) {
      setLocationState('unavailable');
      if (source === 'startup') {
        startupLocationSettled.current = true;
        clearStartupLocationFallback();
        setStartupLocationFlight(false);
        setStartupLocationPending(false);
        if (!startupLocationDisplayReleased.current) setRecenterRequest((current) => current + 1);
      }
      return;
    }
    if (source === 'manual' || !startupLocationDisplayReleased.current) setLocationState('locating');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const shouldRecenter = source !== 'startup' || !startupLocationDisplayReleased.current || searchScopeRef.current === 'radius';
      if (source === 'startup') {
        startupLocationSettled.current = true;
        clearStartupLocationFallback();
        if (hasManualCentreSelection.current) return;
        setStartupLocationFlight(shouldRecenter);
        setStartupLocationPending(false);
      }
      setPosition({ lat: coords.latitude, lng: coords.longitude });
      setHasGpsPosition(true);
      setHasManualMapMarker(false);
      setAreaName('我的位置');
      setLocationState('ready');
      if (shouldRecenter) setRecenterRequest((current) => current + 1);
    }, () => {
      if (source === 'startup') {
        startupLocationSettled.current = true;
        clearStartupLocationFallback();
        if (hasManualCentreSelection.current) return;
        setStartupLocationFlight(false);
        setStartupLocationPending(false);
        if (!startupLocationDisplayReleased.current) setRecenterRequest((current) => current + 1);
      }
      setLocationState('denied');
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 });
  };

  useEffect(() => { try { window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ vehicleType, filters, textScale, facilityMode, atmBank, language, searchScope })); } catch { /* privacy mode remains usable */ } }, [vehicleType, filters, textScale, facilityMode, atmBank, language, searchScope]);
  useEffect(() => {
    const pageUrl = new URL(window.location.href);
    if (pageUrl.searchParams.get('exportManualToiletPositions') !== '1') return;
    pageUrl.searchParams.delete('exportManualToiletPositions');
    window.history.replaceState(window.history.state, '', `${pageUrl.pathname}${pageUrl.search}${pageUrl.hash}`);
    const file = new Blob([JSON.stringify(manualToiletPositionDocument(localManualToiletPositions), null, 2)], { type: 'application/json' });
    const fileUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = 'parkpulse-manual-toilet-positions.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
  }, [localManualToiletPositions]);
  useEffect(() => { if (startupLocationRequested.current) return; startupLocationRequested.current = true; requestLocation('startup'); }, []);
  useEffect(() => () => clearStartupLocationFallback(), []);
  useEffect(() => { document.documentElement.lang = language; document.title = language === 'en' ? 'ParkPulse HK | Find Parking' : 'ParkPulse HK｜泊邊度'; }, [language]);
  useEffect(() => {
    setSelectedId(null);
    setSelectedOnStreetId(null);
    setLastViewedParkId(null);
    setLastViewedOnStreetId(null);
    if (activeVehicleType === 'motorCycle') {
      setFilters((current) => current.hasEv || current.hasAccessible || current.minHeight ? { ...current, hasEv: false, hasAccessible: false, minHeight: 0 } : current);
    }
  }, [vehicleType]);
  useEffect(() => { if (!mapExpanded) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMapExpanded(false); }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown); }, [mapExpanded]);
  useEffect(() => { const closeDetailFromBack = () => { if (!detailHistoryActive.current) return; detailHistoryActive.current = false; setSelectedId(null); setSelectedOnStreetId(null); setSelectedFacilityId(null); setSelectedToiletId(null); setSelectedMedicalId(null); }; window.addEventListener('popstate', closeDetailFromBack); return () => window.removeEventListener('popstate', closeDetailFromBack); }, []);

  const nearbyParks = useMemo<ParkViewModel[]>(() => infos.map((info) => { const vacancyEntry = selectVacancyEntry(vacancyById.get(info.park_Id)?.[activeVehicleType]); const status = getVacancyStatus(info, vacancyEntry); const distanceKm = distanceInKm(rangeOrigin, { lat: info.latitude, lng: info.longitude }); const verified = verifiedPlaceLinks.get(`carpark:${info.park_Id}`); const enriched = verified ? { ...info, ...(verified.hasPhoto !== false ? { photoPlaceUrl: verified.placeUrl } : {}), ...(verified.rating !== undefined && verified.userRatingCount ? { googleRating: { rating: verified.rating, userRatingCount: verified.userRatingCount, placeUrl: verified.placeUrl, generatedAt: verified.generatedAt } } : {}) } : info; return { info: enriched, status, distanceKm, heightLimit: getHeightLimit(info), evCharger: findEvCharger(info, chargers) }; }).filter((park) => isWithinSearchScope({ lat: park.info.latitude, lng: park.info.longitude }, park.distanceKm, searchScope, mapViewport, NEARBY_RADIUS_KM)).sort((left, right) => { const statusDifference = statusPriority(left.status) - statusPriority(right.status); return statusDifference || left.distanceKm - right.distanceKm; }), [chargers, infos, mapViewport, rangeOrigin, searchScope, vacancyById, vehicleType, verifiedPlaceLinks]);
  const nearestAccessiblePark = useMemo(() => infos.filter(hasAccessibleParking).map((info) => ({ info, distanceKm: distanceInKm(rangeOrigin, { lat: info.latitude, lng: info.longitude }) })).filter((park) => searchScope !== 'viewport' || isWithinSearchScope({ lat: park.info.latitude, lng: park.info.longitude }, park.distanceKm, 'viewport', mapViewport, NEARBY_RADIUS_KM)).sort((left, right) => left.distanceKm - right.distanceKm)[0], [infos, mapViewport, rangeOrigin, searchScope]);

  const nearbyToilets = useMemo<PublicToiletViewModel[]>(() => {
    const allToilets = removeCrossSourceLcsdToiletDuplicates([...toilets, ...lcsdVenues, ...additionalWashrooms]);
    const otherSources = allToilets.filter((toilet) => toilet.kind !== 'afcdCountryParkToilet');
    const afcdToilets = allToilets.filter((toilet) => toilet.kind === 'afcdCountryParkToilet')
      .filter((toilet) => !otherSources.some((existing) => sameToiletAtSamePlace(toilet, existing)));
    return [...otherSources, ...afcdToilets]
      .map((toilet) => {
        const venueLocation = toilet.locationPrecision === 'venue' || toilet.locationPrecision === 'venue-uncertain' || toilet.kind === 'lcsdVenue';
        const localPosition = venueLocation ? localManualToiletPositions[toilet.id] : undefined;
        const sharedPosition = venueLocation ? SHARED_MANUAL_TOILET_POSITIONS[toilet.id] : undefined;
        const draftPosition = venueLocation && manualPositionDraft?.toiletId === toilet.id ? manualPositionDraft.position : undefined;
        const manualPosition = draftPosition ?? localPosition ?? sharedPosition;
        const positionedToilet = manualPosition ? { ...toilet, latitude: manualPosition.lat, longitude: manualPosition.lng } : toilet;
        const verified = verifiedPlaceLinks.get(`${toilet.kind ?? 'publicToilet'}:${toilet.id}`);
        const positionedWithPhoto = verified && verified.hasPhoto !== false ? { ...positionedToilet, photoPlaceUrl: verified.placeUrl } : positionedToilet;
        return { toilet: positionedWithPhoto, distanceKm: distanceInKm(rangeOrigin, { lat: positionedToilet.latitude, lng: positionedToilet.longitude }), ...(draftPosition || localPosition ? { manualPositionSource: 'local' as const } : sharedPosition ? { manualPositionSource: 'shared' as const } : {}) };
      })
      .filter((toilet) => isWithinSearchScope({ lat: toilet.toilet.latitude, lng: toilet.toilet.longitude }, toilet.distanceKm, searchScope, mapViewport, NEARBY_RADIUS_KM) || toilet.toilet.id === manualPositionDraft?.toiletId)
      .sort((left, right) => left.distanceKm - right.distanceKm);
  }, [additionalWashrooms, lcsdVenues, localManualToiletPositions, manualPositionDraft, mapViewport, rangeOrigin, searchScope, toilets, verifiedPlaceLinks]);
  const nearbyFacilities = useMemo<NearbyFacilityViewModel[]>(() => (facilityMode !== 'fuel' && facilityMode !== 'atm' && facilityMode !== 'aed' && facilityMode !== 'emergency' && facilityMode !== 'border' && facilityMode !== 'hkjc' ? [] : nearbyFacilityData
    .filter((facility) => facility.kind === facilityMode && (facilityMode !== 'atm' || !atmBank || facility.brand === atmBank))
    .map((facility) => ({
      facility,
      distanceKm: distanceInKm(rangeOrigin, { lat: facility.latitude, lng: facility.longitude }),
      onSelect: () => openFacilityDetail(facility.id),
    }))
    .filter((facility) => isWithinSearchScope({ lat: facility.facility.latitude, lng: facility.facility.longitude }, facility.distanceKm, searchScope, mapViewport, NEARBY_RADIUS_KM))
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, facilityMode === 'atm' ? 50 : undefined)), [atmBank, facilityMode, mapViewport, nearbyFacilityData, openFacilityDetail, rangeOrigin, searchScope]);
  const nearbyMedicalAll = useMemo<MedicalLocationViewModel[]>(() => MEDICAL_LOCATIONS
    .map((location) => ({ location, distanceKm: distanceInKm(rangeOrigin, { lat: location.latitude, lng: location.longitude }), onSelect: () => openMedicalDetail(location.id) }))
    .filter((item) => isWithinSearchScope({ lat: item.location.latitude, lng: item.location.longitude }, item.distanceKm, searchScope, mapViewport, NEARBY_RADIUS_KM))
    .sort((left, right) => left.distanceKm - right.distanceKm), [mapViewport, openMedicalDetail, rangeOrigin, searchScope]);
  const medicalCategoryCounts = useMemo(() => { const counts = Object.fromEntries(MEDICAL_CATEGORY_ORDER.map((category) => [category, 0])) as Record<MedicalCategory, number>; for (const item of nearbyMedicalAll) counts[item.location.category] += 1; return counts; }, [nearbyMedicalAll]);
  const medicalSpecialtyCounts = useMemo(() => { const counts = Object.fromEntries(SOPC_SPECIALTIES.map(({ code }) => [code, 0])) as Partial<Record<SopcSpecialtyCode, number>>; for (const item of nearbyMedicalAll) if (item.location.category === 'ha-specialist-outpatient-clinic') for (const code of item.location.specialty_codes ?? []) { const key = code as SopcSpecialtyCode; if (key in counts) counts[key] = (counts[key] ?? 0) + 1; } return counts; }, [nearbyMedicalAll]);
  const nearbyMedical = useMemo(() => nearbyMedicalAll.filter((item) => (medicalCategoryFilter === 'all' || item.location.category === medicalCategoryFilter) && (medicalSpecialtyFilter === 'all' || item.location.specialty_codes?.includes(medicalSpecialtyFilter))), [medicalCategoryFilter, medicalSpecialtyFilter, nearbyMedicalAll]);
  const selectedMedical = facilityMode === 'medical' ? nearbyMedical.find((item) => item.location.id === selectedMedicalId) : undefined;
  const selectedFacility = nearbyFacilities.find((item) => item.facility.id === selectedFacilityId);
  const nearbyOnStreetRecords = useMemo<OnStreetParkingRecordViewModel[]>(() => (facilityMode !== 'onStreet' || !vehicleType || activeVehicleType === 'motorCycle' ? [] : onStreetData.filter((onStreet) => supportsOnStreetVehicle(onStreet, activeVehicleType)).map((onStreet) => ({ onStreet, distanceKm: distanceInKm(rangeOrigin, { lat: onStreet.latitude, lng: onStreet.longitude }) })).filter((item) => isWithinSearchScope({ lat: item.onStreet.latitude, lng: item.onStreet.longitude }, item.distanceKm, searchScope, mapViewport, NEARBY_RADIUS_KM)).sort((left, right) => left.distanceKm - right.distanceKm)), [facilityMode, mapViewport, onStreetData, rangeOrigin, searchScope, vehicleType]);
  const nearbyMotorcycleOnStreet = useMemo<OnStreetParkingViewModel[]>(() => (facilityMode !== 'onStreet' || vehicleType !== 'motorCycle' ? [] : motorcycleRoadsideGroups.map((onStreet) => ({ onStreet, distanceKm: distanceInKm(rangeOrigin, { lat: onStreet.latitude, lng: onStreet.longitude }) })).filter((item) => isWithinSearchScope({ lat: item.onStreet.latitude, lng: item.onStreet.longitude }, item.distanceKm, searchScope, mapViewport, NEARBY_RADIUS_KM)).sort((left, right) => left.distanceKm - right.distanceKm)), [facilityMode, mapViewport, motorcycleRoadsideGroups, rangeOrigin, searchScope, vehicleType]);
  const nearbyOnStreetCandidates = useMemo<OnStreetParkingViewModel[]>(() => activeVehicleType === 'motorCycle' ? nearbyMotorcycleOnStreet : groupOnStreetResults(nearbyOnStreetRecords), [nearbyMotorcycleOnStreet, nearbyOnStreetRecords, vehicleType]);
  const { items: nearbyOnStreet, total: onStreetTotal } = useMemo(() => limitOnStreetResults(nearbyOnStreetCandidates, activeVehicleType === 'motorCycle' ? false : filters.availableOnly), [filters.availableOnly, nearbyOnStreetCandidates, vehicleType]);
  const atmBanks = useMemo(() => [...new Set(nearbyFacilityData.filter((facility) => facility.kind === 'atm').map((facility) => facility.brand).filter((bank): bank is string => Boolean(bank)))].sort((left, right) => left.localeCompare(right, 'zh-Hant')), [nearbyFacilityData]);
  const resultsVerified = !loading && (!vacancyLoading || vacancyById.size > 0) && (activeVehicleType === 'motorCycle' || !filters.hasEv || (!evLoading && !evError));
  const verificationLabel = loading || (vacancyLoading && vacancyById.size === 0) ? text(language, 'verifyingVacancy') : text(language, 'verifyingEv');
  const displayedParks = useMemo(() => {
    if (!vehicleType) return [];
    if (searchScope === 'radius' && !resultsVerified && !startupLocationFallbackActive) return [];
    return nearbyParks.filter((park) => {
      if (!resultsVerified) return true;
      const isOpen = park.info.opening_status === 'OPEN' && park.status.kind !== 'closed';
      const isMotorcycle = activeVehicleType === 'motorCycle';
      return (!park.status.noLiveData || filters.includeNoLiveData) && (!filters.availableOnly || isAvailable(park.status)) && (!filters.openOnly || isOpen) && (isMotorcycle || !filters.hasEv || hasEvFacility(park.info, park.evCharger)) && (isMotorcycle || !filters.hasAccessible || hasAccessibleParking(park.info)) && (isMotorcycle || !filters.minHeight || (park.heightLimit !== undefined && park.heightLimit >= filters.minHeight));
    });
  }, [filters, nearbyParks, resultsVerified, searchScope, startupLocationFallbackActive, vehicleType]);
  const showingToilets = facilityMode === 'toilets';
  const selectedToilet = showingToilets ? nearbyToilets.find((item) => item.toilet.id === selectedToiletId) : undefined;
  const beginManualPositionEdit = useCallback((toiletId: string) => {
    const item = nearbyToilets.find(({ toilet }) => toilet.id === toiletId);
    if (item) setManualPositionDraft({ toiletId, position: { lat: item.toilet.latitude, lng: item.toilet.longitude } });
  }, [nearbyToilets]);
  const updateManualPositionDraft = useCallback((toiletId: string, coordinates: Coordinates) => {
    setManualPositionDraft((current) => current?.toiletId === toiletId ? { ...current, position: coordinates } : current);
  }, []);
  const cancelManualPositionEdit = useCallback(() => setManualPositionDraft(null), []);
  const saveManualPosition = useCallback((toiletId: string, coordinates: Coordinates) => {
    const next = { ...localManualToiletPositions, [toiletId]: coordinates };
    setLocalManualToiletPositions(next);
    try { window.localStorage.setItem(MANUAL_TOILET_POSITIONS_KEY, JSON.stringify(manualToiletPositionDocument(next))); } catch { /* keep the moved position for this session */ }
    setManualPositionDraft(null);
  }, [localManualToiletPositions]);
  const showingOnStreet = facilityMode === 'onStreet';
  const showingMotorcycleOnStreet = showingOnStreet && vehicleType === 'motorCycle';
  const selectedOnStreet = showingOnStreet ? nearbyOnStreetCandidates.find((item) => item.onStreet.id === selectedOnStreetId) : undefined;
  const washroomLoading = toiletLoading || lcsdLoading || additionalLoading;
  const facilityLoading = facilityMode === 'medical' ? false : showingToilets ? washroomLoading : showingOnStreet ? (!vehicleType ? false : showingMotorcycleOnStreet ? motorcycleRoadsideLoading : onStreetLoading) : nearbyFacilityLoading;
  const facilityError = facilityMode === 'medical' ? null : showingToilets ? toiletError : showingOnStreet ? (!vehicleType ? null : showingMotorcycleOnStreet ? motorcycleRoadsideError : onStreetError) : nearbyFacilityError;
  const facilityLabel = facilityMode === 'toilets' ? text(language, 'washrooms') : facilityMode === 'fuel' ? text(language, 'fuel') : facilityMode === 'atm' ? 'ATM' : facilityMode === 'aed' ? text(language, 'aed') : facilityMode === 'emergency' ? text(language, 'emergencyDepartment') : facilityMode === 'border' ? text(language, 'borderControlPoints') : facilityMode === 'hkjc' ? text(language, 'hkjcOutlets') : facilityMode === 'medical' ? text(language, 'medicalFacilities') : facilityMode === 'onStreet' ? (showingMotorcycleOnStreet ? text(language, 'motorcycleOnStreet') : text(language, 'onStreet')) : null;
  const medicalResultLabel = [text(language, 'medicalFacilities'), ...(medicalCategoryFilter !== 'all' ? [text(language, MEDICAL_CATEGORY_LABEL_KEYS[medicalCategoryFilter])] : []), ...(medicalSpecialtyFilter !== 'all' ? [medicalSpecialtyLabel(medicalSpecialtyFilter, language)] : [])].join(' · ');
  const facilityResultLabel = facilityMode === 'medical' ? medicalResultLabel : facilityMode === 'atm' && atmBank ? `${shortBankName(atmBank)} ATM` : facilityLabel;
  const aedSnapshotGeneratedAt = facilityMode === 'aed' ? nearbyFacilityData.find((facility) => facility.kind === 'aed')?.snapshotGeneratedAt : undefined;
  const aedSourceNote = `${text(language, 'aedSources')}${aedSnapshotGeneratedAt ? ` · ${text(language, 'aedSnapshot', { value: formatSnapshotTime(language, aedSnapshotGeneratedAt) })}` : ''}`;
  const borderSnapshotGeneratedAt = facilityMode === 'border' ? nearbyFacilityData.find((facility) => facility.kind === 'border')?.borderWait?.snapshotGeneratedAt : undefined;
  const borderSourceNote = `${text(language, 'borderSources')}${borderSnapshotGeneratedAt ? ` · ${text(language, 'borderSnapshot', { value: formatSnapshotTime(language, borderSnapshotGeneratedAt) })}` : ''}`;
  const hkjcRecord = facilityMode === 'hkjc' ? nearbyFacilityData.find((facility) => facility.kind === 'hkjc') : undefined;
  const hkjcSourceNote = `${text(language, 'hkjcSources')}${hkjcRecord?.sourceDirectoryUpdatedAt ? ` · ${text(language, 'hkjcDirectoryDate', { value: hkjcRecord.sourceDirectoryUpdatedAt })}` : ''}${hkjcRecord?.sourceDataCheckedAt ? ` · ${text(language, 'hkjcLocationChecked', { value: hkjcRecord.sourceDataCheckedAt })}` : ''}`;
  const emergencyWaitStatistic = facilityMode === 'emergency' ? emergencyWaitStatistics(nearbyFacilityData) : undefined;
  const countLabel = (count: number, label: string) => language === 'en' ? `${count} ${label}` : `${count} 個${label}`;
  const onStreetCapped = showingOnStreet && onStreetTotal > nearbyOnStreet.length;
  const onStreetResultLabel = !vehicleType ? text(language, 'vehicleNotSelected') : onStreetCapped ? text(language, 'onStreetLimitedTitle', { shown: nearbyOnStreet.length, total: onStreetTotal }) : text(language, showingMotorcycleOnStreet ? 'motorcycleOnStreetStreetCount' : 'onStreetStreetCount', { count: nearbyOnStreet.length });
  const activeNearbyResults = showingToilets ? nearbyToilets : showingOnStreet ? nearbyOnStreet : nearbyFacilities;
  const activeNearbyResultCount = facilityMode === 'medical' ? nearbyMedical.length : activeNearbyResults.length;
  const selectedPark = !facilityMode ? displayedParks.find((park) => park.info.park_Id === selectedId) : undefined;
  const availableCount = displayedParks.filter((park) => isAvailable(park.status)).length;
  const nonLiveCount = displayedParks.filter((park) => park.status.noLiveData || park.info.officialSource?.availability === 'snapshot').length;
  const visibleError = error || (filters.hasEv && evError ? `${language === 'en' ? 'EV data notice' : '充電器資料提示'}：${evError}` : null);
  const mapParks = (startupLocationPending && searchScope === 'radius') || facilityMode ? [] : displayedParks;
  const mapNearbyItems = (startupLocationPending && searchScope === 'radius') || !facilityMode || facilityMode === 'medical' ? [] : activeNearbyResults;
  const mapMedicalItems = (startupLocationPending && searchScope === 'radius') || facilityMode !== 'medical' ? [] : nearbyMedical;
  const mapResultLabel = facilityMode ? (showingOnStreet ? onStreetResultLabel : countLabel(activeNearbyResultCount, facilityResultLabel ?? '')) : text(language, 'carparks', { count: displayedParks.length });
  const showParkCards = resultsVerified || startupLocationFallbackActive || searchScope === 'viewport';
  const displayedAreaName = useMemo(() => { if (language !== 'en') return areaName; if (areaName === '香港中心') return 'Hong Kong centre'; if (areaName === '我的位置') return 'My location'; if (areaName === '地圖選取位置') return text(language, 'mapSelected'); return DISTRICTS.find((district) => district.label === areaName)?.englishLabel ?? areaName; }, [areaName, language]);
  const rangeDescription = text(language, searchScope === 'viewport' ? 'scopeViewportFull' : 'scopeRadiusFull');
  const resultScopeHeading = searchScope === 'viewport' ? text(language, 'scopeViewportResultHeading') : `${displayedAreaName} · ${rangeDescription}`;
  const emptySelectionTitle = text(language, filterSection === 'facilities' ? 'facilityNotSelected' : 'vehicleNotSelected');
  const emptySelectionHint = text(language, filterSection === 'facilities' ? 'facilitySelectionHint' : 'vehicleSelectionHint');
  const scaleDown = () => setTextScale((current) => TEXT_SCALES[Math.max(0, TEXT_SCALES.indexOf(current) - 1)]);
  const scaleUp = () => setTextScale((current) => TEXT_SCALES[Math.min(TEXT_SCALES.length - 1, TEXT_SCALES.indexOf(current) + 1)]);
  const changeSearchScope = (next: SearchScope) => {
    const previous = searchScopeRef.current;
    searchScopeRef.current = next;
    setSearchScope(next);
    if (next !== 'viewport') {
      if (previous === 'viewport') setRecenterRequest((current) => current + 1);
      return;
    }
    startupLocationDisplayReleased.current = true;
    if (!startupLocationPending) return;
    clearStartupLocationFallback();
    setStartupLocationPending(false);
    setStartupLocationFlight(false);
    setLocationState((current) => current === 'locating' ? 'default' : current);
  };
  const toggleMap = () => { setSelectedId(null); setSelectedOnStreetId(null); setSelectedFacilityId(null); setSelectedToiletId(null); setSelectedMedicalId(null); setMapExpanded((current) => !current); };
  const openDetail = (parkId: string) => { if (!detailHistoryActive.current) { window.history.pushState({ ...(window.history.state ?? {}), parkspotDetail: true }, ''); detailHistoryActive.current = true; } setSelectedFacilityId(null); setSelectedToiletId(null); setSelectedMedicalId(null); setLastViewedParkId(parkId); setSelectedId(parkId); markMarkerViewed(`park:${parkId}`); };
  const openOnStreetDetail = (streetId: string) => { setSelectedFacilityId(null); setLastViewedOnStreetId(streetId); setSelectedOnStreetId(streetId); markMarkerViewed(`onstreet:${streetId}`); };
  const closeDetail = () => { setSelectedId(null); setSelectedFacilityId(null); setSelectedToiletId(null); if (detailHistoryActive.current) { detailHistoryActive.current = false; window.history.back(); } };
  const selectArea = (coordinates: Coordinates, label: string, behavior: { recenter: boolean; showManualMarker?: boolean }) => { hasManualCentreSelection.current = true; clearStartupLocationFallback(); setStartupLocationFlight(false); setStartupLocationPending(false); setPosition(coordinates); setHasGpsPosition(false); setHasManualMapMarker(behavior.showManualMarker === true); setAreaName(label); setLocationState('ready'); if (behavior.recenter) setRecenterRequest((current) => current + 1); setSelectedId(null); setSelectedOnStreetId(null); setSelectedFacilityId(null); setSelectedMedicalId(null); setManualPositionDraft(null); setLastViewedParkId(null); setLastViewedOnStreetId(null); setLastViewedToiletId(null); setMapExpanded(false); };
  const submitDistrict = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const query = normalizeDistrict(districtQuery); const district = DISTRICTS.find(({ label, aliases }) => [label, ...aliases].some((name) => normalizeDistrict(name) === query)); if (!district) { setDistrictMessage(text(language, 'districtInvalid')); return; } setDistrictMessage(''); setDistrictSearchOpen(false); selectArea(district.coordinates, district.label, { recenter: true }); };
  const retryWashrooms = () => { retryToilets(); retryLcsdVenues(); retryAdditional(); };
  const retryRoadside = () => { if (showingMotorcycleOnStreet) retryMotorcycleRoadside(); else retryOnStreet(); };
  const refreshActiveData = () => { if (facilityMode === 'emergency' || facilityMode === 'border' || facilityMode === 'hkjc') retryNearbyFacilities(); else refresh(); };
  const refreshBusy = facilityMode === 'emergency' || facilityMode === 'border' || facilityMode === 'hkjc' ? facilityLoading : refreshing || loading;
  const updateFacilityMode = (mode: NearbyMode | null) => {
    if (selectedFacilityId || selectedToiletId || selectedMedicalId) closeFacilityDetail();
    setSelectedId(null); setSelectedOnStreetId(null); setSelectedFacilityId(null); setSelectedToiletId(null); setSelectedMedicalId(null); setManualPositionDraft(null); setFacilityMode(mode); if (mode === 'medical') { setMedicalCategoryFilter('all'); setMedicalSpecialtyFilter('all'); }
    if (mode && mode !== 'onStreet') { setVehicleType(null); setFilterSection('facilities'); }
    else if (mode === 'onStreet') setFilterSection('parking');
  };
  const changeFilterSection = (section: FilterSection) => {
    if (section === filterSection) return;
    updateFacilityMode(null);
    setVehicleType(null);
    setFilterSection(section);
  };
  const updateVehicleType = (vehicle: VehicleType | null) => {
    if ((vehicle && facilityMode && facilityMode !== 'onStreet') || (!vehicle && facilityMode === 'onStreet')) updateFacilityMode(null);
    if (vehicle) setFilterSection('parking');
    setVehicleType(vehicle);
  };
  const showNearestAccessible = () => { if (!nearestAccessiblePark) return; setFilters((current) => ({ ...current, availableOnly: false, openOnly: false })); selectArea({ lat: nearestAccessiblePark.info.latitude, lng: nearestAccessiblePark.info.longitude }, nearestAccessiblePark.info.name, { recenter: true }); };
  const showResults = () => setResultsExpanded(true);
  useEffect(() => {
    if (!resultsExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setResultsExpanded(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [resultsExpanded]);

  const manualLocationPending = locationState === 'locating' && !startupLocationPending;
  return <main className={`app-shell${mapExpanded ? ' map-focus' : ''}`} style={{ '--ui-zoom': String(textScale / 100) } as CSSProperties}>
    <div className="desktop-layout">
      <div className="desktop-sidebar">
      <section className="desktop-controls">
    <header className="topbar">
      <div className="brand"><Logo /><div className="brand-copy"><h1>{text(language, 'brandTitle')}</h1><p className="brand-kicker">{text(language, 'brandKicker')}</p></div></div>
      <div className="header-tools">
        <div className="top-actions">
          <details className="settings-menu">
            <summary className="settings-button" aria-label={text(language, 'settings')} title={text(language, 'settings')}><SettingsIcon /></summary>
            <div className="settings-popover">
              <div className="text-tools">
                <div className="text-size-control" role="group" aria-label={text(language, 'textSize')}><button type="button" onClick={scaleDown} disabled={textScale === 100} aria-label={text(language, 'shrinkText')}>A−</button><span>{text(language, 'textSize')} {textScale}%</span><button type="button" onClick={scaleUp} disabled={textScale === 130} aria-label={text(language, 'enlargeText')}>A+</button></div>
                <div className="language-switcher" role="group" aria-label={text(language, 'language')}><button type="button" className={language === 'zh-Hant' ? 'is-active' : ''} aria-pressed={language === 'zh-Hant'} onClick={() => setLanguage('zh-Hant')}>繁</button><button type="button" className={language === 'en' ? 'is-active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div>
              </div>
              <button className="help-button" type="button" onClick={() => setHelpOpen(true)} aria-haspopup="dialog" aria-label={text(language, 'help')} title={text(language, 'help')}><span aria-hidden="true">?</span><span>{text(language, 'help')}</span></button>
            </div>
          </details>
          <button className={refreshBusy ? 'refresh-button is-refreshing' : 'refresh-button'} type="button" onClick={refreshActiveData} disabled={refreshBusy} aria-label={refreshBusy ? text(language, 'refreshing') : text(language, 'refresh')} title={refreshBusy ? text(language, 'refreshing') : text(language, 'refresh')}><RefreshIcon /></button>
          <button className={manualLocationPending ? 'locate-button is-locating' : 'locate-button'} type="button" onClick={() => requestLocation('manual')} disabled={manualLocationPending} aria-label={manualLocationPending ? text(language, 'locating') : text(language, 'useLocation')} title={manualLocationPending ? text(language, 'locating') : text(language, 'useLocation')}><LocateIcon /></button>
        </div>
        <FilterModeSwitch language={language} section={filterSection} onSectionChange={changeFilterSection} />
      </div>
    </header>
    <Filters language={language} section={filterSection} vehicleType={vehicleType} filters={filters} evLoading={evLoading} facilityMode={facilityMode} facilityLoading={facilityLoading} searchScope={searchScope} onSearchScopeChange={changeSearchScope} onVehicleChange={updateVehicleType} onFiltersChange={setFilters} onFacilityModeChange={updateFacilityMode} />
    {facilityMode === 'atm' && <section className="atm-bank-filter" aria-label={text(language, 'atmBank')}><label htmlFor="atm-bank">{text(language, 'atmBank')}</label><select id="atm-bank" value={atmBank} onChange={(event) => setAtmBank(event.target.value)}><option value="">{text(language, 'allBanks')}</option>{atmBanks.map((bank) => <option key={bank} value={bank}>{shortBankName(bank)}</option>)}</select><p>{atmBank ? text(language, 'atmBankMap', { bank: shortBankName(atmBank) }) : text(language, 'atmBankHint')}</p></section>}
    {visibleError && <div className="error-banner" role="alert"><span>{text(language, 'dataConnection')}{visibleError}</span><button type="button" onClick={retry}>{text(language, 'retry')}</button></div>}

      </section>
      <section className={`workspace${filterSection === 'facilities' ? ' is-facility-mode' : ''}`}><div className="map-column"><MapView language={language} position={position} showCurrentLocation={hasGpsPosition} showManualCenter={hasManualMapMarker} parks={mapParks} nearbyItems={mapNearbyItems} medicalItems={mapMedicalItems} selectedId={selectedId} viewedMarkerId={viewedMarkerId} onSelect={openDetail} onSelectOnStreet={openOnStreetDetail} onSelectToilet={openToiletDetail} onViewPopup={markMarkerViewed} onBeginManualPositionEdit={beginManualPositionEdit} onManualPositionChange={updateManualPositionDraft} onCompleteManualPositionEdit={saveManualPosition} onCancelManualPositionEdit={cancelManualPositionEdit} manualPositionEditorId={manualPositionDraft?.toiletId ?? null} onLocationSelect={(coordinates, behavior) => selectArea(coordinates, '地圖選取位置', behavior)} recenterRequest={recenterRequest} startupLocating={startupLocationPending && searchScope === 'radius'} startupRecenter={startupLocationFlight && searchScope === 'radius'} expanded={mapExpanded} searchScope={searchScope} onViewportChange={updateMapViewport} onToggleExpanded={toggleMap} onShowResults={showResults} resultsLabel={mapResultLabel} /></div>
        <section className="area-tools map-bottom-tools" aria-label={`${text(language, 'districtSearch')} / ${text(language, 'mapGesture')}`}><div className="area-tools-row"><button className="area-search-toggle" type="button" onClick={() => { setDistrictSearchOpen((current) => !current); setDistrictMessage(''); }} aria-expanded={districtSearchOpen}>{text(language, 'districtSearch')}</button><p className="map-gesture-note">{text(language, 'mapGesture')}</p><button className="map-legend-toggle" type="button" aria-controls="map-marker-legend" aria-expanded={mapLegendOpen} aria-label={text(language, mapLegendOpen ? 'hideMapLegend' : 'showMapLegend')} title={text(language, mapLegendOpen ? 'hideMapLegend' : 'showMapLegend')} onClick={() => setMapLegendOpen((current) => !current)}><span className={`map-legend-caret${mapLegendOpen ? ' is-open' : ''}`} aria-hidden="true" /></button></div><div id="map-marker-legend" className="map-marker-legend" hidden={!mapLegendOpen} aria-label={text(language, 'mapMarkerLegend')}><span><i className="legend-swatch legend-available" />{text(language, 'legendAvailable')}</span><span><i className="legend-swatch legend-full" />{text(language, 'legendFull')}</span><span><i className="legend-swatch legend-closed" />{text(language, 'legendClosed')}</span><span><i className="legend-swatch legend-unknown" />{text(language, 'legendUnknown')}</span><span><i className="legend-swatch legend-toilet" />{text(language, 'legendToilet')}</span><span><i className="legend-swatch legend-venue" />{text(language, 'legendVenue')}</span><span><i className="legend-swatch legend-venue-unconfirmed" />{text(language, 'legendVenueUnconfirmed')}</span><span><i className="legend-swatch legend-fuel" />{text(language, 'legendFuel')}</span><span><i className="legend-swatch legend-atm" />{text(language, 'legendAtm')}</span><span><i className="legend-swatch legend-aed"><img className="legend-aed-symbol" src={AED_SYMBOL_URL} alt="" /></i>{text(language, 'legendAed')} · {text(language, 'aedSources')}</span><span><i className="legend-swatch legend-emergency"><img className="legend-emergency-symbol" src={publicAsset('icons/emergency-pill.svg')} alt="" /></i>{text(language, 'legendEmergency')}</span><span><i className="legend-swatch legend-border"><img className="legend-border-symbol" src={BORDER_SYMBOL_URL} alt="" /></i>{text(language, 'legendBorder')}</span><span><i className="legend-swatch legend-hkjc" aria-hidden="true"><span className="hkjc-horse-icon">♞</span></i>{text(language, 'legendHkjc')} · <span className="hkjc-first-prize-legend-crown" aria-hidden="true">👑</span> {text(language, 'legendHkjcFirstPrize')}</span>{facilityMode === 'medical' && MEDICAL_CATEGORY_ORDER.map((category) => <span key={category}><i className={`medical-legend-icon is-${category}`}><img src={publicAsset(`icons/medical/${medicalIconFile(category)}`)} alt="" /></i>{text(language, MEDICAL_CATEGORY_LABEL_KEYS[category])}</span>)}<span><i className="legend-swatch legend-onstreet" />{text(language, 'legendOnStreet')}</span>{searchScope === 'radius' && <span className="legend-center">📍 {text(language, 'legendCentre')}</span>}</div>{districtSearchOpen && <form className="area-search" onSubmit={submitDistrict}><label htmlFor="district-search">{text(language, 'searchCentre')}</label><div><input id="district-search" list="district-options" value={districtQuery} onChange={(event) => setDistrictQuery(event.target.value)} placeholder={text(language, 'districtPlaceholder')} autoFocus /><button type="submit">{text(language, 'show')}</button></div><datalist id="district-options">{DISTRICTS.map((district) => <option key={district.label} value={language === 'en' ? district.englishLabel : district.label}>{language === 'en' ? district.label : district.englishLabel}</option>)}</datalist><small>{districtMessage || text(language, 'districtHelp')}</small></form>}</section>
      </section>
      {startupLocationPending && searchScope === 'radius' ? <section className="results-panel" id="parking-results" aria-live="polite"><div className="loading-state"><span className="loader" />{text(language, 'startupLocationLoading')}<small>{text(language, 'startupLocationHint')}</small></div></section> : <section className={`results-panel${resultsExpanded ? ' is-fullscreen' : ''}`} id="parking-results" aria-label={facilityMode ? text(language, 'resultList', { label: facilityResultLabel ?? '' }) : text(language, 'resultList', { label: text(language, 'carparks', { count: '' }) })}><div className={`results-heading${facilityMode === 'atm' && atmBank ? ' is-bank-filtered' : ''}`}><div><p className="eyebrow">{resultScopeHeading}</p><h2>{facilityMode ? (facilityLoading && activeNearbyResultCount === 0 ? text(language, 'loadingFacility', { label: facilityLabel ?? '' }) : facilityError && activeNearbyResultCount === 0 ? text(language, 'facilityUnavailable', { label: facilityLabel ?? '' }) : showingOnStreet ? onStreetResultLabel : countLabel(activeNearbyResultCount, facilityResultLabel ?? '')) : (!vehicleType ? text(language, filterSection === 'facilities' ? 'facilityNotSelected' : 'vehicleNotSelected') : (resultsVerified ? text(language, 'results', { count: displayedParks.length }) : text(language, 'verifyingCarparks')))}</h2></div><p>{showingToilets ? text(language, 'washroomSources') : showingOnStreet ? (!vehicleType ? text(language, 'vehicleSelectionHint') : (showingMotorcycleOnStreet ? (motorcycleRoadsideSource ?? text(language, 'motorcycleOnStreetSources')) : (onStreetSource ?? text(language, 'onStreetSources')))) : facilityMode === 'fuel' ? (language === 'en' ? 'Consumer Council Oil Price Watch' : '消委會油價資訊通') : facilityMode === 'atm' ? (language === 'en' ? 'Hong Kong Monetary Authority' : (nearbyFacilitySource ?? '香港金融管理局')) : facilityMode === 'aed' ? aedSourceNote : facilityMode === 'emergency' ? text(language, 'emergencySources') : facilityMode === 'border' ? borderSourceNote : facilityMode === 'hkjc' ? hkjcSourceNote : facilityMode === 'medical' ? text(language, 'medicalSources') : (!vehicleType ? text(language, filterSection === 'facilities' ? 'facilitySelectionHint' : 'vehicleSelectionHint') : (resultsVerified ? (filters.includeNoLiveData ? text(language, 'includedNoLiveData', { count: nonLiveCount }) : text(language, 'availableChoices', { count: availableCount })) : verificationLabel))}</p></div>
        <div className="results-list">{facilityMode === 'medical' && <><MedicalCategoryFilters language={language} selected={medicalCategoryFilter} counts={medicalCategoryCounts} onChange={setMedicalCategoryFilter} specialty={medicalSpecialtyFilter} specialtyCounts={medicalSpecialtyCounts} onSpecialtyChange={(code) => { setMedicalSpecialtyFilter(code); if (code !== 'all') setMedicalCategoryFilter('ha-specialist-outpatient-clinic'); }} /></>}{facilityMode === 'emergency' && <p className="emergency-inline-notice" role="note">{text(language, 'emergencyUrgentNotice')}</p>}{facilityMode === 'emergency' && emergencyWaitStatistic && <p className="emergency-statistic"><span className="emergency-statistic-wait">{text(language, 'emergencyWaitStatistic', { count: emergencyWaitStatistic.hospitalCount, value: formatEmergencyHours(language, emergencyWaitStatistic.medianHours) })}</span>{emergencyWaitStatistic.updatedAt ? ` · ${text(language, 'emergencyUpdated', { value: formatHaUpdateTime(language, emergencyWaitStatistic.updatedAt) })}` : ''}</p>}{facilityMode === 'border' && <p className="border-snapshot-note">{text(language, 'borderSnapshotNotice', { value: borderSnapshotGeneratedAt ? formatSnapshotTime(language, borderSnapshotGeneratedAt) : text(language, 'unavailable') })}</p>}{facilityMode === 'hkjc' && <p className="hkjc-snapshot-note">{text(language, 'hkjcNoLiveStatus')}{hkjcRecord?.sourceDirectoryUpdatedAt ? ` · ${text(language, 'hkjcDirectoryDate', { value: hkjcRecord.sourceDirectoryUpdatedAt })}` : ''}{hkjcRecord?.sourceDataCheckedAt ? ` · ${text(language, 'hkjcLocationChecked', { value: hkjcRecord.sourceDataCheckedAt })}` : ''}</p>}{!facilityMode && !vehicleType && <div className="empty-state"><strong>{emptySelectionTitle}</strong><p>{emptySelectionHint}</p></div>}{showingToilets && washroomLoading && nearbyToilets.length === 0 && <div className="loading-state"><span className="loader" />{text(language, 'loadingWashrooms')}<small>{text(language, 'washroomRange', { scope: rangeDescription })}</small></div>}{showingToilets && (toiletError || additionalError) && nearbyToilets.length === 0 && !washroomLoading && <div className="empty-state" role="alert"><strong>{text(language, 'facilityLoadFailed', { label: text(language, 'washrooms') })}</strong><p>{toiletError || additionalError}</p><button className="toilet-retry" type="button" onClick={retryWashrooms}>{text(language, 'retry')}</button></div>}{showingToilets && nearbyToilets.map((toilet) => <ToiletCard language={language} key={toilet.toilet.id} toilet={toilet} />)}{showingToilets && lcsdError && <p className="loading-note">{language === 'en' ? 'LCSD venue data notice:' : '康文署場館資料提示：'} {lcsdError}</p>}{showingToilets && additionalError && <p className="loading-note">{text(language, 'additionalWashroomDataNotice')} {additionalError}</p>}{showingToilets && !washroomLoading && !toiletError && !additionalError && nearbyToilets.length === 0 && <div className="empty-state"><strong>{text(language, 'noWashrooms')}</strong><p>{text(language, 'tryAnotherArea')}</p></div>}{showingOnStreet && facilityLoading && nearbyOnStreet.length === 0 && <div className="loading-state"><span className="loader" />{text(language, 'loadingFacility', { label: facilityLabel ?? '' })}<small>{text(language, showingMotorcycleOnStreet ? 'motorcycleOnStreetRange' : 'onStreetRange', { scope: rangeDescription })}</small></div>}{showingOnStreet && facilityError && nearbyOnStreet.length === 0 && !facilityLoading && <div className="empty-state" role="alert"><strong>{text(language, 'facilityLoadFailed', { label: facilityLabel ?? '' })}</strong><p>{facilityError}</p><button className="toilet-retry" type="button" onClick={retryRoadside}>{text(language, 'retry')}</button></div>}{showingOnStreet && onStreetCapped && <p className="loading-note">{text(language, 'onStreetLimitedHint', { shown: nearbyOnStreet.length, total: onStreetTotal, scope: rangeDescription })}</p>}{showingOnStreet && nearbyOnStreet.map((item) => <OnStreetParkingCard language={language} key={item.onStreet.id} item={item} lastViewed={item.onStreet.id === lastViewedOnStreetId} onSelect={() => openOnStreetDetail(item.onStreet.id)} />)}{showingOnStreet && !facilityLoading && !facilityError && nearbyOnStreet.length === 0 && <div className="empty-state"><strong>{text(language, !vehicleType ? 'vehicleNotSelected' : showingMotorcycleOnStreet ? 'noMotorcycleOnStreet' : 'noOnStreet')}</strong><p>{text(language, !vehicleType ? 'vehicleSelectionHint' : 'tryAnotherArea')}</p></div>}{facilityMode && !showingToilets && !showingOnStreet && facilityLoading && nearbyFacilities.length === 0 && <div className="loading-state"><span className="loader" />{text(language, 'loadingFacility', { label: facilityLabel ?? '' })}<small>{text(language, facilityMode === 'emergency' ? 'emergencyRange' : facilityMode === 'border' ? 'borderRange' : 'facilityRange', { scope: rangeDescription })}</small></div>}{facilityMode && !showingToilets && !showingOnStreet && facilityError && nearbyFacilities.length === 0 && !facilityLoading && <div className="empty-state" role="alert"><strong>{text(language, 'facilityLoadFailed', { label: facilityLabel ?? '' })}</strong><p>{facilityError}</p><button className="toilet-retry" type="button" onClick={retryNearbyFacilities}>{text(language, 'retry')}</button></div>}{facilityMode && !showingToilets && !showingOnStreet && nearbyFacilities.map((item) => <NearbyFacilityCard language={language} key={item.facility.id} item={item} />)}{facilityMode === 'medical' && nearbyMedical.map((item) => <MedicalLocationCard language={language} key={item.location.id} item={item} onSelect={() => openMedicalDetail(item.location.id)} />)}{facilityMode === 'atm' && nearbyFacilities.length === 50 && <p className="loading-note">{text(language, 'onlyNearestAtms')}</p>}{facilityMode && facilityMode !== 'medical' && !showingToilets && !showingOnStreet && !facilityLoading && !facilityError && nearbyFacilities.length === 0 && <div className="empty-state"><strong>{text(language, 'noFacilities', { label: facilityResultLabel ?? '' })}</strong><p>{text(language, 'tryAnotherArea')}</p></div>}{facilityMode === 'medical' && nearbyMedical.length === 0 && <div className="empty-state"><strong>{text(language, 'noMedicalFacilities')}</strong><p>{text(language, 'tryAnotherArea')}</p></div>}{!facilityMode && vehicleType && !resultsVerified && <div className="loading-state"><span className="loader" />{verificationLabel}<small>{text(language, 'verifiedOnly')}</small></div>}{!facilityMode && showParkCards && displayedParks.map((park) => <ParkCard language={language} key={park.info.park_Id} park={park} vehicleType={activeVehicleType} selected={park.info.park_Id === selectedId} lastViewed={park.info.park_Id === lastViewedParkId} onSelect={() => openDetail(park.info.park_Id)} />)}{!facilityMode && vehicleType && showParkCards && displayedParks.length === 0 && <div className="empty-state"><strong>{filters.hasAccessible ? text(language, 'noAccessibleParking') : text(language, 'noParking')}</strong>{filters.hasAccessible && nearestAccessiblePark ? <><p>{text(language, 'nearestAccessibleParking', { name: nearestAccessiblePark.info.name, distance: formatDistance(nearestAccessiblePark.distanceKm) })}</p><button className="toilet-retry" type="button" onClick={showNearestAccessible}>{text(language, 'showNearestAccessibleParking')}</button></> : <p>{text(language, 'relaxFilters')}</p>}</div>}</div>
      </section>}
    {resultsExpanded && <button className="results-fullscreen-close" type="button" onClick={() => setResultsExpanded(false)} aria-label={text(language, 'returnToMap')} autoFocus>← {text(language, 'returnToMap')}</button>}
    {selectedToilet && <aside className="detail-panel washroom-detail-panel" role="dialog" aria-modal="true" aria-label={`${selectedToilet.toilet.name} ${text(language, 'details')}`}><button className="close-detail" type="button" onClick={closeFacilityDetail} aria-label={text(language, 'closeDetails')}>×</button><ToiletCard language={language} toilet={selectedToilet} /></aside>}{selectedPark && <ParkDetail language={language} park={selectedPark} vehicleType={activeVehicleType} onClose={closeDetail} />}{selectedOnStreet && <OnStreetParkingDetail language={language} item={selectedOnStreet} onClose={() => setSelectedOnStreetId(null)} />}{selectedFacility && <NearbyFacilityDetail language={language} item={selectedFacility} onClose={closeFacilityDetail} />}{selectedMedical && <MedicalLocationDetail language={language} item={selectedMedical} onClose={closeFacilityDetail} />}{helpOpen && <HelpDialog language={language} onClose={() => setHelpOpen(false)} />}{disclaimerOpen && <DisclaimerDialog language={language} onClose={() => setDisclaimerOpen(false)} />}
    <footer><span>{text(language, 'sources')} <a href="https://data.gov.hk/tc-data/dataset/hk-dpo-datagovhk1-carpark-info-vacancy" target="_blank" rel="noreferrer">data.gov.hk</a>{showingToilets ? (language === 'en' ? ' · Food and Environmental Hygiene Department · Agriculture, Fisheries and Conservation Department · Leisure and Cultural Services Department · Home Affairs Department' : '、食物環境衞生署、漁農自然護理署、康樂及文化事務署、民政事務總署') : showingOnStreet ? (showingMotorcycleOnStreet ? (language === 'en' ? ' · Transport Department / HKeMobility motorcycle roadside-space layer' : '、運輸署／香港出行易電單車路邊泊位圖層') : (language === 'en' ? ' · Transport Department smart meters and kerbside sensor trial' : '、運輸署智能咪錶及路旁感應試行')) : facilityMode === 'fuel' ? (language === 'en' ? ' · Consumer Council Oil Price Watch' : '、消費者委員會油價資訊通') : facilityMode === 'atm' ? (language === 'en' ? ' · Hong Kong Monetary Authority' : (nearbyFacilitySource ?? '香港金融管理局')) : facilityMode === 'aed' ? (language === 'en' ? ' · Fire Services Department CARE AED official-register snapshot' : '、消防處 CARE AED 官方登記快照') : facilityMode === 'emergency' ? (language === 'en' ? ' · Hospital Authority A&E waiting time · Lands Department official map locations' : '、醫院管理局急症室等候時間、地政總署官方地圖位置') : facilityMode === 'border' ? (language === 'en' ? ' · Immigration Department land boundary control-point official snapshot · Lands Department official map locations' : '、入境事務處陸路邊境管制站官方快照、地政總署官方地圖位置') : facilityMode === 'hkjc' ? (language === 'en' ? ' · Hong Kong Jockey Club official off-course betting outlet directory · Lands Department location and coordinate services' : '、香港賽馬會官方場外投注站名錄、地政總署位置搜尋及座標轉換') : facilityMode === 'medical' ? ` · ${text(language, 'medicalSources')}` : (language === 'en' ? ' · Environmental Protection Department' : '、環境保護署')} {showingToilets && <>· {language === 'en' ? 'Data © HKSAR Government / AFCD; source: ' : '資料版權屬香港特別行政區政府／漁護署；來源：'}<a className="csdi-attribution" href="https://portal.csdi.gov.hk/csdi-webpage/doc/TNC" target="_blank" rel="noreferrer">Common Spatial Data Infrastructure (CSDI) Portal</a></>}</span><span>{facilityMode === 'medical' ? text(language, 'medicalDataSnapshot', { date: MEDICAL_SNAPSHOT_DATE }) : facilityMode ? text(language, 'dataDisclaimer', { label: facilityLabel ?? '' }) : text(language, 'parkingDisclaimer')}</span>{facilityMode !== 'medical' && <button className="footer-link" type="button" onClick={() => setDisclaimerOpen(true)}>{text(language, 'disclaimer')}</button>}</footer>
      </div>
    </div>
  </main>;
}
