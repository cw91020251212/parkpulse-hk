import type {
  CarparkInfo,
  VacancyEntry,
  VacancyStatus,
  VehicleParkingInfo,
  VehicleType,
} from '../types';

const STALE_AFTER_MS = 5 * 60 * 1000;

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

export function formatPrice(info: CarparkInfo, vehicleType: VehicleType) {
  const firstCharge = getVehicleInfo(info, vehicleType)?.hourlyCharges?.[0];
  if (!firstCharge || typeof firstCharge.price !== 'number') return '未提供';
  const period = firstCharge.periodStart && firstCharge.periodEnd
    ? `（${firstCharge.periodStart}–${firstCharge.periodEnd}）`
    : '';
  return `HK$${firstCharge.price}${period}`;
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
