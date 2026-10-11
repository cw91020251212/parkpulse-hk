import type { BorderQueueStatus, BorderWaitingTime } from '../types';
import type { Language } from '../i18n';

const CODES: BorderQueueStatus[] = [0, 1, 2, 4, 99];

export function borderQueueLabel(language: Language, value?: number, traveller: 'resident' | 'visitor' = 'resident') {
  const code = CODES.includes(value as BorderQueueStatus) ? value as BorderQueueStatus : 4;
  const copy = language === 'en'
    ? {
      0: traveller === 'resident' ? 'Normal (<15 min)' : 'Normal (<30 min)',
      1: traveller === 'resident' ? 'Busy (<30 min)' : 'Busy (<45 min)',
      2: traveller === 'resident' ? 'Very busy (≥30 min)' : 'Very busy (≥45 min)',
      4: 'System maintenance',
      99: 'Out of service hours',
    }
    : {
      0: traveller === 'resident' ? '正常（一般少於15分鐘）' : '正常（一般少於30分鐘）',
      1: traveller === 'resident' ? '繁忙（一般少於30分鐘）' : '繁忙（一般少於45分鐘）',
      2: traveller === 'resident' ? '非常繁忙（一般30分鐘或以上）' : '非常繁忙（一般45分鐘或以上）',
      4: '系統維護中',
      99: '非服務時間',
    };
  return copy[code];
}

export function borderQueueTone(value?: number) {
  if (value === 2) return 'very-busy';
  if (value === 1) return 'busy';
  if (value === 0) return 'normal';
  return 'unavailable';
}

export function borderWaitingTone(wait?: BorderWaitingTime) {
  const values = wait ? [wait.residents.arrival, wait.residents.departure, wait.visitors.arrival, wait.visitors.departure] : [];
  return values.includes(2) ? 'very-busy' : values.includes(1) ? 'busy' : values.includes(0) ? 'normal' : 'unavailable';
}

export function borderWaitSummary(language: Language, wait?: BorderWaitingTime) {
  if (!wait) return language === 'en' ? 'Official snapshot unavailable' : '官方快照未提供';
  const residentArrival = borderQueueLabel(language, wait.residents.arrival, 'resident');
  const residentDeparture = borderQueueLabel(language, wait.residents.departure, 'resident');
  const visitorArrival = borderQueueLabel(language, wait.visitors.arrival, 'visitor');
  const visitorDeparture = borderQueueLabel(language, wait.visitors.departure, 'visitor');
  return language === 'en'
    ? `Residents: in ${residentArrival} · out ${residentDeparture}; visitors: in ${visitorArrival} · out ${visitorDeparture}`
    : `香港居民：入境${residentArrival}、出境${residentDeparture}；訪港旅客：入境${visitorArrival}、出境${visitorDeparture}`;
}

export function formatBorderSnapshotTime(language: Language, value?: string) {
  if (!value) return language === 'en' ? 'Not available' : '未提供';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === 'en' ? 'en-HK' : 'zh-HK', { dateStyle: 'medium', timeStyle: 'short', hour12: false, timeZone: 'Asia/Hong_Kong' });
}
