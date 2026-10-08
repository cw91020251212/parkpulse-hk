import { useEffect, useState } from 'react';
import { fetchNearbyFacilities } from '../api/nearbyFacilities';
import type { NearbyFacility, NearbyMode } from '../types';

export function useNearbyFacilities(mode: NearbyMode | null) {
  const enabled = mode === 'fuel' || mode === 'atm';
  const [facilities, setFacilities] = useState<NearbyFacility[]>([]);
  const [source, setSource] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchNearbyFacilities(mode, controller.signal)
      .then((payload) => { if (active) { setFacilities(payload.records); setSource(payload.source); } })
      .catch((caught) => {
        if (!active || (caught instanceof Error && caught.name === 'AbortError')) return;
        setError(caught instanceof Error ? caught.message : '未能讀取附近設施資料');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [enabled, mode, requestVersion]);

  return { facilities, source, loading, error, retry: () => setRequestVersion((version) => version + 1) };
}
