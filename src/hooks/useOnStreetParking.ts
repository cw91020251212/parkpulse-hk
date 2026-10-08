import { useEffect, useState } from 'react';
import { fetchOnStreetParking } from '../api/onStreetParking';
import type { OnStreetParking } from '../types';

export function useOnStreetParking(enabled: boolean) {
  const [records, setRecords] = useState<OnStreetParking[]>([]);
  const [source, setSource] = useState<string>();
  const [generatedAt, setGeneratedAt] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    const load = () => {
      setLoading(true);
      setError(null);
      void fetchOnStreetParking(controller.signal)
        .then((payload) => { if (active) { setRecords(payload.records); setSource(payload.source); setGeneratedAt(payload.generatedAt); } })
        .catch((caught) => { if (active && !(caught instanceof Error && caught.name === 'AbortError')) setError(caught instanceof Error ? caught.message : '未能讀取路邊泊位資料'); })
        .finally(() => { if (active) setLoading(false); });
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [enabled, requestVersion]);

  return { records, source, generatedAt, loading, error, retry: () => setRequestVersion((version) => version + 1) };
}
