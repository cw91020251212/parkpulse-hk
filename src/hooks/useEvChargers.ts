import { useEffect, useState } from 'react';
import { fetchEvChargers } from '../api/evChargers';
import type { EpdEvCharger } from '../types';

const REFRESH_INTERVAL_MS = 5 * 60_000;

export function useEvChargers() {
  const [chargers, setChargers] = useState<EpdEvCharger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const controller = new AbortController();
      try {
        const records = await fetchEvChargers(controller.signal);
        if (active) {
          setChargers(records);
          setError(null);
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : '未能讀取環保署充電器資料');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { chargers, loading, error };
}
