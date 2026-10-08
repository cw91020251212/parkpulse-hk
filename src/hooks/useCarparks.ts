import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCarparkInfo, fetchVacancies } from '../api/carparks';
import type { CarparkInfo, VacancyRecord } from '../types';

const REFRESH_INTERVAL_MS = 60_000;

export function useCarparks() {
  const [infos, setInfos] = useState<CarparkInfo[]>([]);
  const [vacancyById, setVacancyById] = useState<Map<string, VacancyRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [vacancyLoading, setVacancyLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const requestInFlight = useRef(false);

  const load = useCallback(async (includeInfo: boolean) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    const controller = new AbortController();
    const vacancyRequest = fetchVacancies(controller.signal);

    try {
      setError(null);
      if (includeInfo) setLoading(true);
      else setRefreshing(true);
      setVacancyLoading(true);

      if (includeInfo) {
        try {
          setInfos(await fetchCarparkInfo(controller.signal));
        } finally {
          setLoading(false);
        }
      }

      const vacancies = await vacancyRequest;
      setVacancyById(new Map(vacancies.map((record) => [record.park_Id, record])));
      setLastFetchedAt(new Date());
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '未能讀取即時車位資料';
      setError(message);
    } finally {
      requestInFlight.current = false;
      setLoading(false);
      setVacancyLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => void load(false), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return {
    infos,
    vacancyById,
    loading,
    vacancyLoading,
    refreshing,
    error,
    lastFetchedAt,
    refresh: () => load(false),
    retry: () => load(true),
  };
}
