import type {
  CarparkInfo,
  ChargeRule,
  VacancyEntry,
  VacancyStatus,
  VehicleParkingInfo,
  VehicleType,
} from '../types';
import type { Language } from '../i18n';

const STALE_AFTER_MS = 5 * 60 * 1000;

export type OfficialHourlyCharge = ChargeRule & { source: 'structured' | 'remark' };

const VEHICLE_NOTE_PATTERNS: Record<VehicleType, RegExp> = {
  privateCar: /私家車/,
  motorCycle: /電單車/,
  LGV: /(?:客貨車|輕型貨車)/,
  HGV: /(?:重型貨車|5\.5\s*公噸以上)/,
  coach: /旅遊巴/,
};

const RATE_NOTE_PATTERN = /(?:HK\s*)?\$\s*[\d,]+(?:\.\d+)?/i;
const RATE_CONTEXT_PATTERN = /私家車|電單車|客貨車|輕型貨車|重型貨車|旅遊巴|的士|時租|日泊|夜泊|月租|每月|每季|一般泊車/;

export function getVerifiedOperatorRate(info: CarparkInfo, vehicleType: VehicleType) {
  return info.operatorRates?.[vehicleType];
}

export function parseHongKongTime(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value.replace(' ', 'T')}+08:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function selectVacancyEntry(entries?: VacancyEntry[]) {
  if (!entries?.length) return undefined;

  return [...entries].sort((left, right) => {
    const categoryRank = (entry: VacancyEntry) => (entry.category === 'HOURLY' || !entry.category ? 0 : 1);
    const categoryDifference = categoryRank(left) - categoryRank(right);
    if (categoryDifference !== 0) return categoryDifference;
    return (parseHongKongTime(right.lastupdate)?.getTime() ?? 0) - (parseHongKongTime(left.lastupdate)?.getTime() ?? 0);
  })[0];
}

function stale(updatedAt?: Date) {
  return Boolean(updatedAt && Date.now() - updatedAt.getTime() > STALE_AFTER_MS);
}

export function getVacancyStatus(
  info: CarparkInfo,
  entry: VacancyEntry | undefined,
): VacancyStatus {
  const updatedAt = parseHongKongTime(entry?.lastupdate);
  const sourceCategory = entry?.category;

  if (info.opening_status === 'CLOSED' || entry?.vacancy_type === 'C') {
    return { kind: 'closed', label: '已關閉', updatedAt, stale: stale(updatedAt), sourceCategory };
  }

  if (!entry || entry.vacancy === undefined || entry.vacancy === -1) {
    return { kind: 'unknown', label: '暫無資料', updatedAt, stale: stale(updatedAt), sourceCategory };
  }

  if (entry.vacancy_type === 'B') {
    if (entry.vacancy === 1) {
      return { kind: 'available', label: '有位', updatedAt, stale: stale(updatedAt), sourceCategory };
    }
    return { kind: 'full', label: '已滿', updatedAt, stale: stale(updatedAt), sourceCategory };
  }

  if (entry.vacancy_type === 'A') {
    if (entry.vacancy > 0) {
      return {
        kind: 'count',
        label: `${entry.vacancy} 個空位`,
        count: entry.vacancy,
        updatedAt,
        stale: stale(updatedAt),
        sourceCategory,
      };
    }
    return { kind: 'full', label: '已滿', updatedAt, stale: stale(updatedAt), sourceCategory };
  }

  return { kind: 'unknown', label: '暫無資料', updatedAt, stale: stale(updatedAt), sourceCategory };
}

export function getVehicleInfo(info: CarparkInfo, vehicleType: VehicleType) {
  return info[vehicleType] as VehicleParkingInfo | undefined;
}

export function getHeightLimit(info: CarparkInfo) {
  const heights = (info.heightLimits ?? [])
    .map((limit) => limit.height)
    .filter((height): height is number => typeof height === 'number' && height > 0);
  return heights.length ? Math.min(...heights) : undefined;
}

export function formatHeight(height?: number) {
  return height ? `${height.toFixed(height % 1 === 0 ? 0 : 1)} m` : '未提供';
}

function noteLineGroups(info: CarparkInfo) {
  return (info.heightLimits ?? [])
    .map((limit) => (limit.remark ?? '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .split(/\r?\n/)
      .map((line) => line.replace(/&nbsp;/gi, ' ').trim())
      .filter(Boolean));
}

function namedVehicleTypes(line: string) {
  return (Object.entries(VEHICLE_NOTE_PATTERNS) as [VehicleType, RegExp][])
    .filter(([, pattern]) => pattern.test(line))
    .map(([vehicleType]) => vehicleType);
}

function parseHourlyCharge(line: string) {
  const priceAfterUnit = line.match(/(?:(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*)?(?:時租\s*)?每\s*(半)?小時\s*\$\s*([\d,]+(?:\.\d+)?)/);
  if (priceAfterUnit) {
    const [, periodStart, periodEnd, halfHour, rawPrice] = priceAfterUnit;
    return { periodStart, periodEnd, halfHour: Boolean(halfHour), price: Number(rawPrice.replaceAll(',', '')) };
  }

  const priceBeforeUnit = line.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:時租\s*)?每\s*(半)?小時/);
  if (priceBeforeUnit) {
    const [, rawPrice, halfHour] = priceBeforeUnit;
    return { halfHour: Boolean(halfHour), price: Number(rawPrice.replaceAll(',', '')) };
  }

  return undefined;
}

function extractHourlyChargesFromNotes(info: CarparkInfo, vehicleType: VehicleType): OfficialHourlyCharge[] {
  const seen = new Set<string>();
  const charges: OfficialHourlyCharge[] = [];

  for (const lines of noteLineGroups(info)) {
    let contextVehicles: VehicleType[] = [];
    for (const line of lines) {
      const namedVehicles = namedVehicleTypes(line);
      if (namedVehicles.length) contextVehicles = namedVehicles;
      const parsed = parseHourlyCharge(line);
      if (!parsed || !contextVehicles.includes(vehicleType)) continue;

      const key = `${parsed.periodStart}|${parsed.periodEnd}|${parsed.halfHour}|${parsed.price}`;
      if (seen.has(key)) continue;
      seen.add(key);
      charges.push({
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        price: parsed.price,
        usageMinimum: parsed.halfHour ? 0.5 : 1,
        type: parsed.halfHour ? 'half-hour' : 'hourly',
        source: 'remark',
      });
    }
  }

  return charges;
}

export function getOfficialPricingNotes(info: CarparkInfo) {
  const seen = new Set<string>();
  const notes: string[] = [];

  for (const lines of noteLineGroups(info)) {
    let context = '';
    for (const line of lines) {
      if (!RATE_NOTE_PATTERN.test(line) && RATE_CONTEXT_PATTERN.test(line)) context = line.replace(/^[-*：:\s]+/, '');
      if (!RATE_NOTE_PATTERN.test(line)) continue;
      const note = context && !line.includes(context) ? `${context}：${line}` : line;
      if (seen.has(note)) continue;
      seen.add(note);
      notes.push(note);
    }
  }

  return notes;
}

export function getOfficialHourlyCharges(info: CarparkInfo, vehicleType: VehicleType): OfficialHourlyCharge[] {
  const structured = (getVehicleInfo(info, vehicleType)?.hourlyCharges ?? [])
    .filter((charge): charge is ChargeRule & { price: number } => typeof charge.price === 'number')
    .map((charge) => ({ ...charge, source: 'structured' as const }));
  return structured.length ? structured : extractHourlyChargesFromNotes(info, vehicleType);
}

export function formatOfficialHourlyCharge(charge: OfficialHourlyCharge, language: Language) {
  const unit = charge.type === 'half-hour'
    ? (language === 'en' ? '30 min' : '半小時')
    : (language === 'en' ? 'hour' : '小時');
  const period = charge.periodStart && charge.periodEnd ? ` · ${charge.periodStart}–${charge.periodEnd}` : '';
  return language === 'en' ? `HK$${charge.price} / ${unit}${period}` : `每${unit} HK$${charge.price}${period}`;
}

export function formatPrice(info: CarparkInfo, vehicleType: VehicleType, language: Language) {
  const firstCharge = getOfficialHourlyCharges(info, vehicleType)[0];
  return firstCharge ? formatOfficialHourlyCharge(firstCharge, language) : undefined;
}

export function formatAge(updatedAt?: Date) {
  if (!updatedAt) return '未提供更新時間';
  const minutes = Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / 60_000));
  if (minutes < 1) return '剛剛更新';
  if (minutes < 60) return `${minutes} 分鐘前更新`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小時前更新`;
}

export function statusPriority(status: VacancyStatus) {
  const base = { count: 0, available: 0, unknown: 1, full: 2, closed: 3 }[status.kind];
  return base + (status.stale ? 1 : 0);
}

export function isAvailable(status: VacancyStatus) {
  return status.kind === 'count' || status.kind === 'available';
}

export const FACILITY_LABELS: Record<string, string> = {
  evCharger: '充電設施',
  disabilities: '無障礙設施',
  unloading: '上落貨區',
  washing: '洗車服務',
  'valet-parking': '代客泊車',
};

export const PAYMENT_LABELS: Record<string, string> = {
  cash: '現金',
  octopus: '八達通',
  EPS: '易辦事',
  visa: 'Visa',
  master: 'Mastercard',
};
