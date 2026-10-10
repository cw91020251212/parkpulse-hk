import { useEffect, useState } from 'react';
import { fetchAdditionalToilets } from '../api/additionalToilets';
import type { PublicToilet } from '../types';

export function useAdditionalToilets(enabled: boolean) {
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
    void fetchAdditionalToilets(controller.signal)
      .then(({ records, warning }) => { if (active) { setToilets(records); setError(warning); } })
      .catch((caught) => {
        if (!active || (caught instanceof Error && caught.name === 'AbortError')) return;
        setError(caught instanceof Error ? caught.message : '未能讀取補充官方洗手間資料');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [enabled, requestVersion]);

  return { toilets, loading, error, retry: () => setRequestVersion((version) => version + 1) };
}
