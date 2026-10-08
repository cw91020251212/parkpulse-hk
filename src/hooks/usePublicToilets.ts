import { useEffect, useState } from 'react';
import { fetchPublicToilets } from '../api/publicToilets';
import type { PublicToilet } from '../types';

export function usePublicToilets(enabled: boolean) {
  const [toilets, setToilets] = useState<PublicToilet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetchPublicToilets(controller.signal)
      .then((records) => { if (active) setToilets(records); })
      .catch((caught) => {
        if (!active || (caught instanceof Error && caught.name === 'AbortError')) return;
        setError(caught instanceof Error ? caught.message : '未能讀取食環署公廁資料');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, requestVersion]);

  return { toilets, loading, error, retry: () => setRequestVersion((version) => version + 1) };
}
