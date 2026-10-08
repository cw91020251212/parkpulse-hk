export const METER_LOCATIONS_URL = 'https://resource.data.one.gov.hk/td/psiparkingspaces/spaceinfo/parkingspaces.csv';
export const METER_STATUS_URL = 'https://resource.data.one.gov.hk/td/psiparkingspaces/occupancystatus/occupancystatus.csv';
export const NON_METER_LOCATIONS_URL = 'https://data.nmospiot.gov.hk/api/pvds/Download/parkingspace';
export const NON_METER_STATUS_URL = 'https://data.nmospiot.gov.hk/api/pvds/Download/occupancystatus';

function csvValues(line) {
  const values = [];
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

export function csvRecords(text, headerStart) {
  const lines = String(text ?? '').replace(/^\uFEFF/, '').split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.startsWith(headerStart));
  if (headerIndex < 0) return [];
  const headers = csvValues(lines[headerIndex]);
  return lines.slice(headerIndex + 1).filter(Boolean).map(csvValues).filter((row) => row.length >= headers.length - 1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function coordinates(record) {
  const latitude = Number(record.Latitude);
  const longitude = Number(record.Longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

function occupancy(status, meterStatus) {
  if (meterStatus && meterStatus !== 'N') return 'unavailable';
  return status === 'V' ? 'vacant' : status === 'O' ? 'occupied' : status === 'NU' ? 'unavailable' : null;
}

function streetName(record) {
  return [record.Street_tc || record.Street, record.SectionOfStreet_tc || record.SectionOfStreet].filter(Boolean).join(' · ');
}

function recordFor(kind, record, status, snapshot) {
  const position = coordinates(record);
  const state = occupancy(status?.OccupancyStatus, kind === 'metered' ? status?.ParkingMeterStatus : undefined);
  if (!position || !state) return null;
  const id = record.ParkingSpaceId || record.FeatureID;
  if (!id) return null;
  return {
    id: `${kind}:${id}`,
    kind,
    name: kind === 'metered' ? `咪錶位 · ${record.Street_tc || record.Street || id}` : `路旁感應試行 · ${record.Street_tc || record.Street || id}`,
    address: streetName(record),
    ...position,
    vehicleType: record.VehicleType || undefined,
    occupancy: state,
    meterStatus: status?.ParkingMeterStatus || undefined,
    updatedAt: status?.OccupancyDateChanged || undefined,
    operatingPeriod: record.OperatingPeriod || undefined,
    timeUnit: record.TimeUnit || undefined,
    paymentUnit: record.PaymentUnit || undefined,
    source: kind === 'metered' ? '運輸署新智能咪錶' : '運輸署路旁感應試行',
    snapshot,
  };
}

export function buildOnStreetParking({ meterLocations, meterStatus, nonMeterLocations, nonMeterStatus, nonMeterSnapshot = false }) {
  const meterLocationsRows = csvRecords(meterLocations, 'PoleId,');
  const meterStatusRows = csvRecords(meterStatus, 'ParkingSpaceId,');
  const nonMeterLocationRows = csvRecords(nonMeterLocations, 'FeatureID,');
  const nonMeterStatusRows = csvRecords(nonMeterStatus, 'FeatureID,');
  const meterById = new Map(meterStatusRows.map((row) => [row.ParkingSpaceId, row]));
  const nonMeterByFeature = new Map(nonMeterStatusRows.map((row) => [row.FeatureID, row]));
  const nonMeterBySpace = new Map(nonMeterStatusRows.map((row) => [row.ParkingSpaceId, row]));

  const metered = meterLocationsRows.map((record) => recordFor('metered', record, meterById.get(record.ParkingSpaceId), false)).filter(Boolean);
  const nonMetered = nonMeterLocationRows.map((record) => recordFor('nonMetered', record, nonMeterByFeature.get(record.FeatureID) || nonMeterBySpace.get(record.ParkingSpaceId), nonMeterSnapshot)).filter(Boolean);
  return { metered, nonMetered };
}
