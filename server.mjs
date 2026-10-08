import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const appDir = path.dirname(fileURLToPath(import.meta.url));
const hongKongBounds = { minLat: 22.13, maxLat: 22.57, minLng: 113.8, maxLng: 114.5 };

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

app.get('/health', (_request, response) => response.status(200).json({ ok: true }));

app.get('/api/place-photo', async (request, response) => {
  const name = readText(request.query.name, 180);
  const address = readText(request.query.address, 300) || '';
  const coordinates = readCoordinates(request.query);
  if (!name || !coordinates) {
    return response.status(400).json({ state: 'invalid_request' });
  }

  const fallbackPlaceUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`.trim())}`;

  try {
    const mapsResponse = await mapsRequest('maps/api/place/textsearch/json', {
      query: `${name} ${address} Hong Kong`.trim(),
      location: `${coordinates.lat},${coordinates.lng}`,
      radius: '500',
    });
    const payload = await mapsResponse.json();
    const candidate = (payload.results ?? [])
      .filter((item) => item?.photos?.[0]?.photo_reference && item?.geometry?.location)
      .map((item) => ({
        ...item,
        distanceMeters: distanceInMeters(coordinates, {
          lat: Number(item.geometry.location.lat),
          lng: Number(item.geometry.location.lng),
        }),
      }))
      .filter((item) => Number.isFinite(item.distanceMeters) && item.distanceMeters <= 250)
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
});
