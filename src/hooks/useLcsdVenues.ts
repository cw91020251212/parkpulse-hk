import { useEffect, useState } from 'react';
import { fetchLcsdVenues } from '../api/lcsdVenues';
import type { PublicToilet } from '../types';

export function useLcsdVenues(enabled: boolean) {
  const [venues, setVenues] = useState<PublicToilet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchLcsdVenues(controller.signal)
      .then((records) => { if (active) setVenues(records); })
      .catch((caught) => {
        if (!active || (caught instanceof Error && caught.name === 'AbortError')) return;
        setError(caught instanceof Error ? caught.message : '未能讀取康文署場館資料');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [enabled, requestVersion]);

  return { venues, loading, error, retry: () => setRequestVersion((version) => version + 1) };
}
