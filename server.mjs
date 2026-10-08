import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { simplifyEpdRecord } from './lib/epd-ev-chargers.mjs';
import { parseArcGisAtms, parseFuelStations, parseHkmaAtms } from './lib/nearby-facilities.mjs';
import { parsePublicToilets } from './lib/public-toilets.mjs';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const appDir = path.dirname(fileURLToPath(import.meta.url));
const hongKongBounds = { minLat: 22.13, maxLat: 22.57, minLng: 113.8, maxLng: 114.5 };
const EPD_EV_URL = 'https://ev-charger.epd.gov.hk/resource/ev_charger_avail/ev_charger_avail.json';
const EV_CACHE_MS = 5 * 60_000;
let evCache = { value: null, loadedAt: 0, pending: null };
const FEHD_TOILETS_URL = 'https://www.fehd.gov.hk/tc_chi/map/fehd_map_c.xml';
const TOILET_CACHE_MS = 60 * 60_000;
let toiletCache = { value: null, loadedAt: 0, pending: null };
const FUEL_STATIONS_URL = 'https://oil-price.consumer.org.hk/tc/station';
const HKMA_ATMS_URL = 'https://api.hkma.gov.hk/public/bank-svf-info/banks-atm-locator?lang=tc';
const HKMA_ATMS_FALLBACK_URL = 'https://services3.arcgis.com/6j1KwZfY2fZrfNMR/arcgis/rest/services/Automated_Teller_Machines_%28ATM%29_of_Retail_Banks_in_Hong_Kong/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&resultRecordCount=3000';
const FACILITY_CACHE_MS = 30 * 60_000;
let fuelCache = { value: null, loadedAt: 0, pending: null };
let atmCache = { value: null, loadedAt: 0, pending: null };

function distanceInMeters(from, to) {
  const radians = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function readText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function readCoordinates(query) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const { minLat, maxLat, minLng, maxLng } = hongKongBounds;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) {
    return null;
  }
  return { lat, lng };
}

async function mapsRequest(pathname, parameters, redirect = 'follow') {
  const baseUrl = process.env.MANUS_API_URL;
  const apiKey = process.env.MANUS_API_KEY;
  if (!baseUrl || !apiKey) throw new Error('Map service is unavailable');

  const url = new URL(`${baseUrl.replace(/\/$/, '')}/v1/maps/proxy/${pathname}`);
  url.searchParams.set('key', apiKey);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, { redirect });
  if (!response.ok && !(response.status >= 300 && response.status < 400)) {
    throw new Error(`Map service returned ${response.status}`);
  }
  return response;
}

function plainAttribution(values) {
  if (!Array.isArray(values)) return 'Google Maps';
  const text = values
    .map((value) => typeof value === 'string' ? value.replace(/<[^>]+>/g, '').trim() : '')
    .filter(Boolean)
    .join(' · ');
  return text || 'Google Maps';
}

function isWashroomName(value) {
  return /toilet|bathhouse|urinal|washroom|restroom|公廁|尿廁|浴室|洗手間/i.test(value);
}

async function refreshEpdEvChargers() {
  if (evCache.pending) return evCache.pending;

  evCache.pending = (async () => {
    try {
      const response = await fetch(EPD_EV_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error(`EPD EV service returned ${response.status}`);
      const payload = await response.json();
      const records = Array.isArray(payload?.data)
        ? payload.data.map(simplifyEpdRecord).filter(Boolean)
        : [];
      if (!records.length) throw new Error('EPD EV service returned no usable records');
      evCache.value = { records, lastUpdatedAt: payload.last_update_date };
      evCache.loadedAt = Date.now();
      return evCache.value;
    } catch (error) {
      if (evCache.value) return evCache.value;
      throw error;
    } finally {
      evCache.pending = null;
    }
  })();

  return evCache.pending;
}

async function loadEpdEvChargers() {
  if (evCache.value) {
    if (Date.now() - evCache.loadedAt >= EV_CACHE_MS) void refreshEpdEvChargers().catch(() => undefined);
    return evCache.value;
  }
  return refreshEpdEvChargers();
}

async function refreshPublicToilets() {
  if (toiletCache.pending) return toiletCache.pending;

  toiletCache.pending = (async () => {
    try {
      const response = await fetch(FEHD_TOILETS_URL, {
        headers: { Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' },
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok) throw new Error(`FEHD service returned ${response.status}`);
      const records = parsePublicToilets(await response.text());
      if (!records.length) throw new Error('FEHD service returned no usable toilet records');
      toiletCache.value = {
        records,
        lastUpdatedAt: records.map((record) => record.updatedAt).filter(Boolean).sort().at(-1),
      };
      toiletCache.loadedAt = Date.now();
      return toiletCache.value;
    } catch (error) {
      if (toiletCache.value) return toiletCache.value;
      throw error;
    } finally {
      toiletCache.pending = null;
    }
  })();

  return toiletCache.pending;
}

async function loadPublicToilets() {
  if (toiletCache.value) {
    if (Date.now() - toiletCache.loadedAt >= TOILET_CACHE_MS) void refreshPublicToilets().catch(() => undefined);
    return toiletCache.value;
  }
  return refreshPublicToilets();
}

async function refreshFuelStations() {
  if (fuelCache.pending) return fuelCache.pending;
  fuelCache.pending = (async () => {
    try {
      const response = await fetch(FUEL_STATIONS_URL, { headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(25_000) });
      if (!response.ok) throw new Error(`Consumer Council fuel service returned ${response.status}`);
      const records = parseFuelStations(await response.text());
      if (!records.length) throw new Error('Consumer Council fuel service returned no usable records');
      fuelCache.value = { records };
      fuelCache.loadedAt = Date.now();
      return fuelCache.value;
    } catch (error) {
      if (fuelCache.value) return fuelCache.value;
      throw error;
    } finally { fuelCache.pending = null; }
  })();
  return fuelCache.pending;
}

async function loadFuelStations() {
  if (fuelCache.value) {
    if (Date.now() - fuelCache.loadedAt >= FACILITY_CACHE_MS) void refreshFuelStations().catch(() => undefined);
    return fuelCache.value;
  }
  return refreshFuelStations();
}

async function refreshAtms() {
  if (atmCache.pending) return atmCache.pending;
  atmCache.pending = (async () => {
    try {
      let records = [];
      let source = '香港金融管理局 ATM Open API';
      try {
        const primary = await fetch(HKMA_ATMS_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5_000) });
        if (!primary.ok) throw new Error(`HKMA ATM service returned ${primary.status}`);
        records = parseHkmaAtms(await primary.json());
        if (records.length < 1_500) throw new Error('HKMA ATM service returned an incomplete page');
      } catch {
        const fallback = await fetch(HKMA_ATMS_FALLBACK_URL, { headers: { Accept: 'application/geo+json,application/json' }, signal: AbortSignal.timeout(20_000) });
        if (!fallback.ok) throw new Error(`HKMA ATM fallback returned ${fallback.status}`);
        records = parseArcGisAtms(await fallback.json());
        source = '香港金融管理局 ATM 資料（ArcGIS 空間資料後備）';
      }
      if (!records.length) throw new Error('HKMA ATM service returned no usable records');
      atmCache.value = { records, source };
      atmCache.loadedAt = Date.now();
      return atmCache.value;
    } catch (error) {
      if (atmCache.value) return atmCache.value;
      throw error;
    } finally { atmCache.pending = null; }
  })();
  return atmCache.pending;
}

async function loadAtms() {
  if (atmCache.value) {
    if (Date.now() - atmCache.loadedAt >= FACILITY_CACHE_MS) void refreshAtms().catch(() => undefined);
    return atmCache.value;
  }
  return refreshAtms();
}

app.get('/health', (_request, response) => response.status(200).json({ ok: true }));

app.get('/api/ev-chargers', async (_request, response) => {
  try {
    const payload = await loadEpdEvChargers();
    response.set('Cache-Control', 'private, max-age=300');
    return response.json({ source: '環境保護署 Electric Vehicle Chargers for Public Access', ...payload });
  } catch (error) {
    console.error('Unable to load EPD EV charger data', error instanceof Error ? error.message : error);
    return response.status(502).json({ error: '未能讀取環保署充電器資料' });
  }
});

app.get('/api/public-toilets', async (_request, response) => {
  try {
    const payload = await loadPublicToilets();
    response.set('Cache-Control', 'private, max-age=3600');
    return response.json({ source: '食物環境衞生署 Public Toilets', ...payload });
  } catch (error) {
    console.error('Unable to load FEHD public toilet data', error instanceof Error ? error.message : error);
    return response.status(502).json({ error: '未能讀取食環署公廁資料' });
  }
});

app.get('/api/fuel-stations', async (_request, response) => {
  try {
    const payload = await loadFuelStations();
    response.set('Cache-Control', 'private, max-age=1800');
    return response.json({ source: '消費者委員會油價資訊通', ...payload });
  } catch (error) {
    console.error('Unable to load fuel station data', error instanceof Error ? error.message : error);
    return response.status(502).json({ error: '未能讀取消委會油站資料' });
  }
});

app.get('/api/atms', async (_request, response) => {
  try {
    const payload = await loadAtms();
    response.set('Cache-Control', 'private, max-age=1800');
    return response.json(payload);
  } catch (error) {
    console.error('Unable to load HKMA ATM data', error instanceof Error ? error.message : error);
    return response.status(502).json({ error: '未能讀取金管局 ATM 資料' });
  }
});

app.get('/api/place-photo', async (request, response) => {
  const name = readText(request.query.name, 180);
  const address = readText(request.query.address, 300) || '';
  const coordinates = readCoordinates(request.query);
  if (!name || !coordinates) {
    return response.status(400).json({ state: 'invalid_request' });
  }

  const fallbackPlaceUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`.trim())}`;
  const isWashroom = isWashroomName(name);

  try {
    const mapsResponse = await mapsRequest('maps/api/place/textsearch/json', {
      query: `${name} ${address} Hong Kong`.trim(),
      location: `${coordinates.lat},${coordinates.lng}`,
      radius: '500',
    });
    const payload = await mapsResponse.json();
    const candidate = (payload.results ?? [])
      .filter((item) => item?.photos?.[0]?.photo_reference && item?.geometry?.location)
      .filter((item) => !isWashroom || isWashroomName(item.name ?? ''))
      .map((item) => ({
        ...item,
        distanceMeters: distanceInMeters(coordinates, {
          lat: Number(item.geometry.location.lat),
          lng: Number(item.geometry.location.lng),
        }),
      }))
      .filter((item) => Number.isFinite(item.distanceMeters) && item.distanceMeters <= (isWashroom ? 100 : 250))
      .sort((left, right) => left.distanceMeters - right.distanceMeters)[0];

    if (!candidate) {
      return response.json({ state: 'not_found', placeUrl: fallbackPlaceUrl });
    }

    const photo = candidate.photos[0];
    const photoReference = encodeURIComponent(photo.photo_reference);
    const placeUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(candidate.name)}&query_place_id=${encodeURIComponent(candidate.place_id)}`;
    return response.json({
      state: 'found',
      photoUrl: `/api/place-photo/image?ref=${photoReference}`,
      placeUrl,
      placeName: candidate.name,
      distanceMeters: Math.round(candidate.distanceMeters / 10) * 10,
      attribution: plainAttribution(photo.html_attributions),
    });
  } catch (error) {
    console.error('Unable to load a place photo', error instanceof Error ? error.message : error);
    return response.status(502).json({ state: 'unavailable', placeUrl: fallbackPlaceUrl });
  }
});

app.get('/api/place-photo/image', async (request, response) => {
  const reference = readText(request.query.ref, 2_000);
  if (!reference) return response.status(400).end();

  try {
    const imageResponse = await mapsRequest('maps/api/place/photo', {
      maxwidth: '960',
      photo_reference: reference,
    }, 'manual');
    const imageUrl = imageResponse.headers.get('location');
    if (imageUrl?.startsWith('https://')) {
      response.set('Cache-Control', 'private, max-age=3600');
      return response.redirect(302, imageUrl);
    }

    const contentType = imageResponse.headers.get('content-type');
    if (!contentType?.startsWith('image/')) throw new Error('Map service returned no image');
    response.set('Content-Type', contentType);
    response.set('Cache-Control', 'private, max-age=3600');
    return response.send(Buffer.from(await imageResponse.arrayBuffer()));
  } catch (error) {
    console.error('Unable to proxy a place photo', error instanceof Error ? error.message : error);
    return response.status(502).end();
  }
});

if (isProduction) {
  const distDir = path.join(appDir, 'dist');
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.use((_request, response) => response.sendFile(path.join(distDir, 'index.html')));
} else {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`泊邊有位正在監聽 ${port}`);
  void loadEpdEvChargers().catch(() => undefined);
});
