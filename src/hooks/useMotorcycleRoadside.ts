import { useEffect, useState } from 'react';
import { publicAsset } from '../api/site';
import type { OnStreetParkingGroup } from '../types';

type MotorcycleRoadsidePayload = {
  source: string;
  sourceUrl: string;
  generatedAt: string;
  recordCount: number;
  groups: OnStreetParkingGroup[];
};

export function useMotorcycleRoadside(enabled: boolean) {
  const [payload, setPayload] = useState<MotorcycleRoadsidePayload>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetch(publicAsset('pages-data/motorcycle-roadside.json'), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`motorcycle-roadside.json returned ${response.status}`);
        return response.json() as Promise<MotorcycleRoadsidePayload>;
      })
      .then((next) => {
        if (!Array.isArray(next.groups) || !next.groups.length) throw new Error('未有可用的官方電單車路邊泊位快照');
        if (active) setPayload(next);
      })
      .catch((caught) => {
        if (active && !(caught instanceof Error && caught.name === 'AbortError')) setError(caught instanceof Error ? caught.message : '未能讀取官方電單車路邊泊位資料');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [enabled, requestVersion]);

  return { groups: payload?.groups ?? [], source: payload?.source, sourceUrl: payload?.sourceUrl, generatedAt: payload?.generatedAt, recordCount: payload?.recordCount ?? 0, loading, error, retry: () => setRequestVersion((value) => value + 1) };
}
