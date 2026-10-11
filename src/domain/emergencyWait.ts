import type { EmergencyWaitTime, NearbyFacility } from '../types';
import type { Language } from '../i18n';

export function parseHaUpdateTime(_language: Language, raw?: string) {
  if (!raw) return undefined;
  const chinese = raw.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s*(上午|下午)(\d{1,2})時(\d{1,2})分$/);
  const english = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2}):(\d{2})(AM|PM)$/i);
  let year = 0; let month = 0; let day = 0; let hour = 0; let minute = 0;
  if (chinese) {
    year = Number(chinese[1]); month = Number(chinese[2]); day = Number(chinese[3]); hour = Number(chinese[5]); minute = Number(chinese[6]);
    const period = chinese[4];
    if (period === '下午' && hour < 12) hour += 12;
    if (period === '上午' && hour === 12) hour = 0;
  } else if (english) {
    day = Number(english[1]); month = Number(english[2]); year = Number(english[3]); hour = Number(english[4]); minute = Number(english[5]);
    const period = english[6].toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
  } else return undefined;
  const parsed = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatHaUpdateTime(language: Language, raw?: string) {
  const parsed = parseHaUpdateTime(language, raw);
  if (!parsed) return raw || (language === 'en' ? 'Not available' : '未提供');
  return parsed.toLocaleString(language === 'en' ? 'en-HK' : 'zh-HK', { dateStyle: 'medium', timeStyle: 'short', hour12: false, timeZone: 'Asia/Hong_Kong' });
}

export function parseEmergencyWaitHours(value?: string) {
  if (!value) return undefined;
  const match = value.replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return undefined;
  return /分鐘|minute/i.test(value) ? amount / 60 : amount;
}

export function formatEmergencyHours(language: Language, hours?: number) {
  if (hours === undefined || !Number.isFinite(hours)) return language === 'en' ? 'Not available' : '未提供';
  const rounded = Math.round(hours * 10) / 10;
  return language === 'en' ? `${rounded} hr` : `${rounded} 小時`;
}

export function emergencyWaitSummary(language: Language, wait?: EmergencyWaitTime) {
  if (!wait?.priority45Median) return language === 'en' ? 'IV/V wait time unavailable' : '第四／五類等候時間未提供';
  return language === 'en' ? `IV/V median: ${wait.priority45Median}` : `第四／五類中位：${wait.priority45Median}`;
}

export function emergencyWaitStatistics(facilities: NearbyFacility[]) {
  const hours = facilities
    .filter((facility) => facility.kind === 'emergency')
    .map((facility) => parseEmergencyWaitHours(facility.emergencyWait?.priority45Median))
    .filter((value): value is number => value !== undefined)
    .sort((left, right) => left - right);
  if (!hours.length) return undefined;
  const middle = Math.floor(hours.length / 2);
  const medianHours = hours.length % 2 ? hours[middle] : (hours[middle - 1] + hours[middle]) / 2;
  const updatedAt = facilities.find((facility) => facility.kind === 'emergency')?.emergencyWait?.updatedAt;
  return { hospitalCount: hours.length, medianHours, updatedAt };
}
