import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { simplifyEpdRecord } from '../lib/epd-ev-chargers.mjs';
import { parseArcGisAtms, parseFuelStations, parseHkmaAtms } from '../lib/nearby-facilities.mjs';
import { buildOfficialRateOverrides } from '../lib/official-rate-overrides.mjs';
import { buildOnStreetParking, NON_METER_LOCATIONS_URL, NON_METER_STATUS_URL } from '../lib/on-street-parking.mjs';
import { buildLinkOperatorRates, buildSinoOperatorRates } from '../lib/operator-rates.mjs';
import { parsePublicToilets } from '../lib/public-toilets.mjs';
import { refreshBrandIcons } from './refresh-brand-icons.mjs';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const dataDir = path.join(publicDir, 'pages-data');
const CARPARK_INFO_URL = 'https://api.data.gov.hk/v1/carpark-info-vacancy/?data=info&lang=zh_TW';
const EPD_EV_URL = 'https://ev-charger.epd.gov.hk/resource/ev_charger_avail/ev_charger_avail.json';
const FEHD_TOILETS_URL = 'https://www.fehd.gov.hk/tc_chi/map/fehd_map_c.xml';
const FUEL_STATIONS_URL = 'https://oil-price.consumer.org.hk/tc/station';
const HKMA_ATMS_URL = 'https://api.hkma.gov.hk/public/bank-svf-info/banks-atm-locator?lang=tc';
const HKMA_ATMS_FALLBACK_URL = 'https://services3.arcgis.com/6j1KwZfY2fZrfNMR/arcgis/rest/services/Automated_Teller_Machines_%28ATM%29_of_Retail_Banks_in_Hong_Kong/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&resultRecordCount=3000';

async function request(url, accept) {
  const response = await fetch(url, { headers: { Accept: accept }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response;
}

async function refreshFileOrKeep(filePath, loader) {
  try {
    const value = await loader();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(value), 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  } catch (error) {
    try {
      await access(filePath);
      console.warn(`Keeping existing ${path.basename(filePath)}: ${error instanceof Error ? error.message : error}`);
    } catch {
      throw error;
    }
  }
}

function refreshOrKeep(filename, loader) {
  return refreshFileOrKeep(path.join(dataDir, filename), loader);
}

await refreshFileOrKeep(path.join(publicDir, 'carpark-info.json'), async () => {
  const payload = await (await request(CARPARK_INFO_URL, 'application/json')).json();
  if (!Array.isArray(payload?.results) || payload.results.length < 500) throw new Error('Transport Department returned no usable car-park records');
  return payload;
});

await refreshFileOrKeep(path.join(publicDir, 'operator-rates.json'), async () => {
  const payload = JSON.parse(await readFile(path.join(publicDir, 'carpark-info.json'), 'utf8'));
  const [link, sino] = await Promise.all([buildLinkOperatorRates(payload.results), buildSinoOperatorRates(payload.results)]);
  const officialOverrides = buildOfficialRateOverrides(payload.results, link.checkedAt);
  return { source: '營辦商官方泊車資料', generatedAt: new Date().toISOString(), checkedAt: link.checkedAt, attempted: link.attempted + sino.attempted + officialOverrides.attempted, providers: { link: link.attempted, sino: sino.attempted, officialSharedPages: officialOverrides.attempted }, records: { ...link.records, ...sino.records, ...officialOverrides.records } };
});

const brandIconResult = await refreshBrandIcons(path.join(publicDir, 'brand-icons'));
console.log(`Updated ${brandIconResult.updated} and kept ${brandIconResult.kept} local brand icons`);

await refreshOrKeep('ev-chargers.json', async () => {
  const payload = await (await request(EPD_EV_URL, 'application/json')).json();
  const records = Array.isArray(payload?.data) ? payload.data.map(simplifyEpdRecord).filter(Boolean) : [];
  if (!records.length) throw new Error('EPD returned no usable records');
  return { source: '環境保護署 Electric Vehicle Chargers for Public Access', records, lastUpdatedAt: payload.last_update_date };
});

await refreshOrKeep('public-toilets.json', async () => {
  const records = parsePublicToilets(await (await request(FEHD_TOILETS_URL, 'application/xml,text/xml;q=0.9,*/*;q=0.8')).text());
  if (!records.length) throw new Error('FEHD returned no usable records');
  return { source: '食物環境衞生署 Public Toilets', records, lastUpdatedAt: records.map((record) => record.updatedAt).filter(Boolean).sort().at(-1) };
});

await refreshOrKeep('fuel-stations.json', async () => {
  const records = parseFuelStations(await (await request(FUEL_STATIONS_URL, 'text/html')).text());
  if (!records.length) throw new Error('Consumer Council returned no usable records');
  return { source: '消費者委員會油價資訊通', records };
});

await refreshOrKeep('atms.json', async () => {
  try {
    const records = parseHkmaAtms(await (await request(HKMA_ATMS_URL, 'application/json')).json());
    if (records.length < 1_500) throw new Error('HKMA returned an incomplete ATM page');
    return { source: '香港金融管理局 ATM Open API', records };
  } catch {
    const records = parseArcGisAtms(await (await request(HKMA_ATMS_FALLBACK_URL, 'application/geo+json,application/json')).json());
    if (!records.length) throw new Error('HKMA fallback returned no usable records');
    return { source: '香港金融管理局 ATM 資料（ArcGIS 空間資料後備）', records };
  }
});

await refreshOrKeep('on-street-parking.json', async () => {
  const headers = { 'User-Agent': 'ParkPulse HK data checker' };
  const [locations, status] = await Promise.all([
    fetch(NON_METER_LOCATIONS_URL, { headers, signal: AbortSignal.timeout(30_000) }),
    fetch(NON_METER_STATUS_URL, { headers, signal: AbortSignal.timeout(30_000) }),
  ]);
  if (!locations.ok || !status.ok) throw new Error('Transport Department non-metered service returned an error');
  const { nonMetered } = buildOnStreetParking({ nonMeterLocations: await locations.text(), nonMeterStatus: await status.text(), meterLocations: '', meterStatus: '', nonMeterSnapshot: true });
  if (!nonMetered.length) throw new Error('Transport Department returned no usable non-metered records');
  return { source: '運輸署路旁感應試行（GitHub Pages 建置快照）', generatedAt: new Date().toISOString(), nonMetered };
});
