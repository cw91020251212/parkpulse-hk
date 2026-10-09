import { buildGpaCarparks } from './gpa-carparks.mjs';
import { LINK_RATE_API_BASE, parseLinkOperatorRate } from './operator-rates.mjs';

const MING_NGA_KEY = '4324';
const MING_NGA_URL = `https://www.linkhk.com/tc/parking/${MING_NGA_KEY}`;

function hongKongTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce((output, part) => ({ ...output, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

async function buildMingNgaCarpark({ fetchImpl = fetch, checkedAt = new Date().toISOString() } = {}) {
  const response = await fetchImpl(`${LINK_RATE_API_BASE}${MING_NGA_KEY}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Link Ming Nga car park returned ${response.status}`);
  const payload = await response.json();
  const parking = payload?.data?.parkingInfo;
  const latitude = Number(parking?.latitude);
  const longitude = Number(parking?.longitude);
  const total = Number(parking?.totalCarParkSpace);
  const available = Number(parking?.availableCarParkSpace);
  if (!parking?.carParkFacilityNameTc || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(total) || !Number.isFinite(available)) {
    throw new Error('Link Ming Nga car park data was incomplete');
  }

  const operatorRate = parseLinkOperatorRate(MING_NGA_URL, payload, checkedAt.slice(0, 10));
  const info = {
    park_Id: `link-${MING_NGA_KEY}`,
    name: parking.carParkFacilityNameTc,
    displayAddress: parking.addressTc,
    district: '大埔區',
    latitude,
    longitude,
    contactNo: parking.telephone || undefined,
    website: MING_NGA_URL,
    opening_status: 'UNKNOWN',
    privateCar: { space: total },
    ...(operatorRate ? { operatorRates: { privateCar: operatorRate } } : {}),
    officialSource: {
      availability: 'snapshot',
      sourceUrl: MING_NGA_URL,
      sourceLabel: { 'zh-Hant': '領展官方空位快照', en: 'Link official availability snapshot' },
    },
  };
  const vacancy = {
    park_Id: info.park_Id,
    privateCar: [{ category: 'HOURLY', vacancy_type: 'A', vacancy: available, lastupdate: hongKongTimestamp(new Date(checkedAt)) }],
  };
  return { info, vacancy };
}

export async function buildOfficialStaticCarparks(options = {}) {
  const [gpa, mingNga] = await Promise.all([
    buildGpaCarparks(options),
    buildMingNgaCarpark(options),
  ]);
  return {
    ...gpa,
    source: '政府產業署官方基本資料及領展官方明雅停車場快照',
    recordCount: gpa.records.length + 1,
    records: [...gpa.records, mingNga.info],
    vacancies: [mingNga.vacancy],
  };
}

export { MING_NGA_KEY, MING_NGA_URL };
