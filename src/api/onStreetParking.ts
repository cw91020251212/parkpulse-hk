import { isStaticPages, publicAsset } from './site';
import type { OnStreetParking } from '../types';

const METER_LOCATIONS_URL = 'https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv';
const METER_STATUS_URL = 'https://resource.data.one.gov.hk/td/psiparkingspaces/occupancystatus/occupancystatus.csv';

type Response = { records?: OnStreetParking[]; metered?: OnStreetParking[]; nonMetered?: OnStreetParking[]; source?: string; generatedAt?: string };

function csvValues(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (character === ',' && !quoted) { values.push(value); value = ''; } else value += character;
  }
  values.push(value);
  return values.map((entry) => entry.trim());
}

function records(text: string, headerStart: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.startsWith(headerStart));
  if (headerIndex < 0) return [] as Record<string, string>[];
  const headers = csvValues(lines[headerIndex]);
  return lines.slice(headerIndex + 1).filter(Boolean).map(csvValues).filter((row) => row.length >= headers.length).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function meterRecords(locationText: string, statusText: string): OnStreetParking[] {
  const statusById = new Map(records(statusText, 'ParkingSpaceId,').map((row) => [row.ParkingSpaceId, row]));
  return records(locationText, 'PoleId,').flatMap((location) => {
    const status = statusById.get(location.ParkingSpaceId);
    const latitude = Number(location.Latitude);
    const longitude = Number(location.Longitude);
    const occupancy = status?.ParkingMeterStatus !== 'N' ? 'unavailable' : status.OccupancyStatus === 'V' ? 'vacant' : status.OccupancyStatus === 'O' ? 'occupied' : null;
    if (!status || !occupancy || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    const street = [location.Street_tc || location.Street, location.SectionOfStreet_tc || location.SectionOfStreet].filter(Boolean).join(' · ');
    return [{ id: `metered:${location.ParkingSpaceId}`, kind: 'metered', name: `咪錶位 · ${location.Street_tc || location.Street || location.ParkingSpaceId}`, address: street, latitude, longitude, vehicleType: location.VehicleType || undefined, occupancy, meterStatus: status.ParkingMeterStatus || undefined, updatedAt: status.OccupancyDateChanged || undefined, operatingPeriod: location.OperatingPeriod || undefined, timeUnit: location.TimeUnit || undefined, paymentUnit: location.PaymentUnit || undefined, source: '運輸署新智能咪錶', snapshot: false }];
  });
}

async function fetchLiveMeters(signal: AbortSignal) {
  const [locations, status] = await Promise.all([fetch(METER_LOCATIONS_URL, { signal }), fetch(METER_STATUS_URL, { signal })]);
  if (!locations.ok || !status.ok) throw new Error('未能讀取運輸署智能咪錶即時資料');
  return meterRecords(await locations.text(), await status.text());
}

export async function fetchOnStreetParking(signal: AbortSignal) {
  if (!isStaticPages) {
    const response = await fetch('/api/on-street-parking', { signal });
    if (!response.ok) throw new Error('未能讀取運輸署路邊泊位資料');
    const payload = await response.json() as Response;
    return { records: payload.records ?? [], source: payload.source, generatedAt: payload.generatedAt };
  }
  const snapshot = fetch(publicAsset('pages-data/on-street-parking.json'), { signal }).then(async (response) => {
    if (!response.ok) throw new Error('未能讀取官方非咪錶快照');
    return response.json() as Promise<Response>;
  });
  const [meters, fallback] = await Promise.allSettled([fetchLiveMeters(signal), snapshot]);
  const liveMeters = meters.status === 'fulfilled' ? meters.value : [];
  const nonMetered = fallback.status === 'fulfilled' ? (fallback.value.nonMetered ?? fallback.value.records ?? []) : [];
  if (!liveMeters.length && !nonMetered.length) throw new Error('未能讀取運輸署路邊泊位資料');
  return { records: [...liveMeters, ...nonMetered], source: fallback.status === 'fulfilled' ? fallback.value.source : '運輸署智能咪錶', generatedAt: fallback.status === 'fulfilled' ? fallback.value.generatedAt : undefined };
}
