const HONG_KONG_BOUNDS = { minLat: 22.13, maxLat: 22.57, minLng: 113.8, maxLng: 114.5 };

// Bank-official ATM service page explicitly says these three Fubon branches do not provide ATM service.
export const VERIFIED_ATM_EXCLUSIONS = [
  { bank: '富邦銀行(香港)有限公司', address: '皇后大道東213號胡忠大廈地下2號舖' },
  { bank: '富邦銀行(香港)有限公司', address: '堅尼地城卑路乍街44A-46號低層地下1號舖' },
  { bank: '富邦銀行(香港)有限公司', address: '安慈路翠屏花園地下28號舖' },
];

function normalizeAtmText(value) {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

export function filterVerifiedAtmExclusions(records) {
  return records.filter((record) => !VERIFIED_ATM_EXCLUSIONS.some((exclusion) => (
    normalizeAtmText(record.brand ?? record.name) === normalizeAtmText(exclusion.bank)
      && normalizeAtmText(record.address) === normalizeAtmText(exclusion.address)
  )));
}

function decodeHtml(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

function validCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= HONG_KONG_BOUNDS.minLat && latitude <= HONG_KONG_BOUNDS.maxLat
    && longitude >= HONG_KONG_BOUNDS.minLng && longitude <= HONG_KONG_BOUNDS.maxLng;
}

function textMatch(html, expression) {
  const match = html.match(expression);
  return match ? decodeHtml(match[1]) : undefined;
}

export function parseFuelStations(html) {
  if (typeof html !== 'string') return [];
  const records = html.split('class="gp-listing__item"').slice(1).map((item) => {
    const name = textMatch(item, /class="clogo__name">([\s\S]*?)<\/div>/);
    const address = textMatch(item, /class="clogo__addr">([\s\S]*?)<\/div>/);
    const brand = textMatch(item, /placeholder-center__item[^>]*alt="([^"]+)"/);
    const route = item.match(/destination=([\d.-]+),([\d.-]+)/);
    const latitude = Number(route?.[1]);
    const longitude = Number(route?.[2]);
    if (!name || !address || !validCoordinates(latitude, longitude)) return null;
    return {
      id: `fuel-${latitude.toFixed(6)}-${longitude.toFixed(6)}`,
      name,
      address,
      brand,
      latitude,
      longitude,
      kind: 'fuel',
      source: '消費者委員會油價資訊通',
    };
  }).filter(Boolean);
  return [...new Map(records.map((record) => [record.id, record])).values()];
}

function normalizeAtm({ id, bank, address, hours, machine, functionText, latitude, longitude }) {
  if (!bank || !address || !validCoordinates(latitude, longitude)) return null;
  return {
    id: `atm-${id ?? `${bank}-${latitude.toFixed(6)}-${longitude.toFixed(6)}`}`,
    name: bank,
    address,
    brand: bank,
    openingHours: hours || undefined,
    remarks: [machine, functionText].filter(Boolean).join(' · ') || undefined,
    latitude,
    longitude,
    kind: 'atm',
    source: '香港金融管理局',
  };
}

export function parseHkmaAtms(payload) {
  const records = Array.isArray(payload?.result?.records) ? payload.result.records : [];
  return filterVerifiedAtmExclusions(records.map((record, index) => normalizeAtm({
    id: index,
    bank: record.bank_name,
    address: record.address,
    hours: record.service_hours,
    machine: record.type_of_machine,
    functionText: record.function,
    latitude: Number(record.latitude),
    longitude: Number(record.longitude),
  })).filter(Boolean));
}

export function parseArcGisAtms(payload) {
  const features = Array.isArray(payload?.features) ? payload.features : [];
  return filterVerifiedAtmExclusions(features.map((feature) => {
    const properties = feature?.properties ?? {};
    const [longitude, latitude] = feature?.geometry?.coordinates ?? [];
    return normalizeAtm({
      id: properties.OBJECTID ?? feature?.id,
      bank: properties.BankName_TC,
      address: properties.Address_TC,
      hours: properties.ServiceHours_TC,
      machine: properties.TypeOfMachine_TC,
      latitude: Number(latitude),
      longitude: Number(longitude),
    });
  }).filter(Boolean));
}
