import proj4 from 'proj4';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const NAMED_PLACE_SOURCE_URL = 'https://portal.csdi.gov.hk/csdi-webpage/dataset/landsd_rcd_1637226341468_86480';
export const NAMED_PLACE_MIRROR_URL = 'https://open-data.hk/csdi-datasets/landsd_rcd_1637226341468_86480';
const API = 'https://pgrst.open-data.hk/';
const SCHEMA = 'csdi_landsd_rcd_1637226341468_86480';
const PAGE_SIZE = 100; // Measured server cap, not the requested limit of 400/1000.
const HK1980 = '+proj=tmerc +lat_0=22.3121333333333 +lon_0=114.178555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,-0.067753,2.243648,1.158828,-1.094246 +units=m +no_defs';
const transform = proj4(HK1980, 'EPSG:4326');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let requests = 0;
const waiting = [];

async function limited(operation) {
  if (requests >= 2) await new Promise(resolve => waiting.push(resolve));
  else requests++;
  try { return await operation(); }
  finally {
    const next = waiting.shift();
    if (next) next();
    else requests--;
  }
}

export async function fetchNamedPlacePage(table, filter = {}, offset = 0, limit = PAGE_SIZE) {
  const url = new URL(table, API);
  for (const [key, value] of Object.entries({ select: '*', order: 'objectid.asc', offset, limit, ...filter })) {
    url.searchParams.set(key, String(value));
  }
  return limited(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        // A smaller measured payload and a bounded timeout replace the failed bulk requests.
        const response = await fetch(url, {
          headers: { 'Accept-Profile': SCHEMA, Prefer: 'count=exact', Accept: 'application/json' },
          signal: AbortSignal.timeout(120_000),
        });
        if (!response.ok) {
          const error = new Error(`Named places ${table}: HTTP ${response.status}`);
          error.retryable = response.status === 429 || response.status >= 500;
          const retryAfter = Number(response.headers.get('retry-after'));
          error.delay = Number.isFinite(retryAfter) ? Math.min(60_000, retryAfter * 1000) : 0;
          await response.body?.cancel();
          throw error;
        }
        const rows = await response.json();
        const range = response.headers.get('content-range')?.match(/^(?:(\d+)-(\d+)|\*)\/(\d+)$/);
        if (!Array.isArray(rows) || !range) throw new Error(`Invalid rows/range: ${table}`);
        const total = Number(range[3]);
        if (rows.length && (Number(range[1]) !== offset || Number(range[2]) - offset + 1 !== rows.length)) {
          throw new Error(`Incorrect page range: ${table} at ${offset}`);
        }
        if (rows.length > limit || offset + rows.length > total || (!rows.length && offset < total)) {
          throw new Error(`Incomplete page: ${table} at ${offset}`);
        }
        return { rows, total };
      } catch (error) {
        const transient = error.retryable || error.name === 'TimeoutError' || error instanceof TypeError;
        if (!transient || attempt >= 2) throw error;
        const delay = Math.max(error.delay || 0, 2000 * 2 ** attempt);
        console.warn(`Named places ${table} offset ${offset}: ${error.message}; retry ${attempt + 1}/2 in ${delay}ms`);
        await pause(delay);
      }
    }
  });
}

export async function fetchAllNamedPlaceRows(table, filter = {}) {
  // Optional build-only cache permits recovery without repeating successful geometry transfers.
  // Not used by the browser or by default CI refresh; first page is always freshly checked.
  const cacheDir = process.env.NAMED_PLACES_CACHE_DIR;
  const result = [];
  let total;
  do {
    const offset = result.length;
    const cacheFile = cacheDir && path.join(cacheDir, `${table}-${offset}.json`);
    let item;
    if (offset && cacheFile) {
      try {
        const cached = JSON.parse(await readFile(cacheFile, 'utf8'));
        if (cached.total === total && cached.filter === JSON.stringify(filter)
          && Date.now() - Date.parse(cached.fetchedAt) < 6 * 60 * 60 * 1000) item = cached;
      } catch { /* Missing/expired cache: fetch the public source. */ }
    }
    if (!item) {
      item = await fetchNamedPlacePage(table, filter, offset);
      if (cacheFile) {
        await mkdir(cacheDir, { recursive: true });
        await writeFile(cacheFile, JSON.stringify({ ...item, filter: JSON.stringify(filter), fetchedAt: new Date().toISOString() }));
      }
    }
    if (total === undefined) {
      total = item.total;
      console.log(`Named places ${table}: ${total} source rows`);
    }
    if (item.total !== total || (!item.rows.length && result.length < total)) {
      throw new Error(`Source changed/incomplete: ${table}`);
    }
    // Advance by the ACTUAL number returned, never the requested page size.
    result.push(...item.rows);
    if (result.length % 1000 < PAGE_SIZE || result.length === total) {
      console.log(`Named places ${table}: ${result.length}/${total}`);
    }
  } while (result.length < total);
  if (result.length !== total || new Set(result.map(row => row.objectid)).size !== result.length) {
    throw new Error(`Incomplete/duplicated ${table}`);
  }
  return result;
}

function clean(value) { return String(value ?? '').trim().replace(/^[-–]$/, ''); }
function numberPart(row, prefix) {
  return [clean(row[`${prefix}prefixeng`]), clean(row[`${prefix}housenumber`]), clean(row[`${prefix}suffixeng`])].join('');
}
function formattedAddress(row) {
  const start = numberPart(row, 'start'), end = numberPart(row, 'end');
  const numbers = !end || start === end ? start : `${start}–${end}`;
  const tc = clean(row.chinesestreetname), en = clean(row.englishstreetname);
  return { tc: tc ? tc + (numbers ? `${numbers}號` : '') : '', en: en ? `${numbers ? `${numbers} ` : ''}${en}` : '' };
}
function addresses(rows, key) {
  const map = new Map();
  for (const row of rows) {
    // O is the official street-address record; no extrapolation of lot addresses.
    if (row.addresstype !== 'O') continue;
    const value = formattedAddress(row), current = map.get(row[key]) ?? { tc: [], en: [] };
    if (value.tc && !current.tc.includes(value.tc)) current.tc.push(value.tc);
    if (value.en && !current.en.includes(value.en)) current.en.push(value.en);
    map.set(row[key], current);
  }
  return map;
}

function convertGeometry(shape) {
  if (!shape || !['Polygon', 'MultiPolygon'].includes(shape.type)) throw new Error('Invalid official polygon geometry');
  const transformCoordinates = coordinates => typeof coordinates[0] === 'number'
    ? transform.forward(coordinates.slice(0, 2)).map(n => Math.round(n * 1e7) / 1e7)
    : coordinates.map(transformCoordinates);
  const geometry = { type: shape.type, coordinates: transformCoordinates(shape.coordinates) };
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = coordinates => {
    if (typeof coordinates[0] === 'number') {
      const [x, y] = coordinates;
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Invalid projected coordinate');
      bbox[0] = Math.min(bbox[0], x); bbox[1] = Math.min(bbox[1], y);
      bbox[2] = Math.max(bbox[2], x); bbox[3] = Math.max(bbox[3], y);
    } else coordinates.forEach(walk);
  };
  walk(geometry.coordinates);
  if (!bbox.every(Number.isFinite) || bbox[0] < 113.7 || bbox[2] > 114.6 || bbox[1] < 22.05 || bbox[3] > 22.65) {
    throw new Error('Official polygon outside Hong Kong after projection');
  }
  return { geometry, bbox };
}

export async function buildNamedPlaces({ reuseRecentSnapshot } = {}) {
  if (reuseRecentSnapshot) {
    try {
      const previous = JSON.parse(await readFile(reuseRecentSnapshot, 'utf8'));
      const age = Date.now() - Date.parse(previous.generatedAt);
      if (age >= 0 && age < 24 * 60 * 60 * 1000 && previous.sourceUrl === NAMED_PLACE_SOURCE_URL
        && previous.retrievalUrl === NAMED_PLACE_MIRROR_URL && previous.sourceCounts?.sites >= 1000
        && previous.sourceCounts?.subsites > 0 && previous.places?.length >= 1000
        && new Set(previous.places.map(p => p.id)).size === previous.places.length
        && previous.places.every(p => (p.nameTc || p.nameEn) && ['site', 'subsite'].includes(p.kind)
          && ['Polygon', 'MultiPolygon'].includes(p.geometry?.type) && p.bbox?.length === 4 && p.bbox.every(Number.isFinite))) {
        console.log(`Using complete named-place snapshot from ${previous.generatedAt} (24-hour static-data refresh interval)`);
        return previous;
      }
    } catch { /* Missing, stale or invalid snapshot: refresh from the public source. */ }
  }
  // Complete site + subsite release. The much larger building/address tables are
  // deliberately a separate future index, not an obstacle to named venue coverage.
  const addressFields = 'objectid,startprefixeng,starthousenumber,startsuffixeng,endprefixeng,endhousenumber,endsuffixeng,addresstype,englishstreetname,chinesestreetname';
  const [sites, subsites, siteAddresses, subsiteAddresses] = await Promise.all([
    fetchAllNamedPlaceRows('sitepolygonandsitename', { select: 'objectid,siteid,englishsitename,chinesesitename,shape,lastupdatedate' }),
    fetchAllNamedPlaceRows('subsitepolygonandsubsitename', { select: 'objectid,subsiteid,englishsitename,chinesesitename,shape,lastupdatedate' }),
    fetchAllNamedPlaceRows('siteandsiteaddress', { select: `siteid,${addressFields}` }),
    fetchAllNamedPlaceRows('subsiteandsubsiteaddress', { select: `subsiteid,${addressFields}` }),
  ]);
  const sa = addresses(siteAddresses, 'siteid'), ssa = addresses(subsiteAddresses, 'subsiteid');
  const places = [];
  for (const [rows, kind, key, addr] of [[sites, 'site', 'siteid', sa], [subsites, 'subsite', 'subsiteid', ssa]]) {
    for (const row of rows) {
      const nameTc = clean(row.chinesesitename), nameEn = clean(row.englishsitename);
      if (!nameTc && !nameEn) continue;
      const address = addr.get(row[key]);
      places.push({ id: `${kind}-${row[key]}`, kind, nameTc, nameEn,
        addressTc: address?.tc.join('；') || '', addressEn: address?.en.join('; ') || '',
        addressScope: address ? kind : 'not-recorded',
        ...convertGeometry(row.shape), updatedAt: row.lastupdatedate });
    }
  }
  if (places.length < 1000 || new Set(places.map(p => p.id)).size !== places.length) {
    throw new Error('Official named-place index too small or duplicated');
  }
  const versions = [...sites, ...subsites].map(row => row.lastupdatedate).filter(Boolean).sort();
  return { source: '地政總署 iG1000／CSDI（公開鏡像快照）', sourceUrl: NAMED_PLACE_SOURCE_URL,
    retrievalUrl: NAMED_PLACE_MIRROR_URL, generatedAt: new Date().toISOString(), updatedAt: versions.at(-1),
    coverage: 'Named site and subsite polygons; building polygons are not included in this release.',
    coordinateSystem: 'EPSG:4326; source EPSG:2326, transformation EPSG:1825',
    sourceCounts: { sites: sites.length, subsites: subsites.length, siteAddresses: siteAddresses.length, subsiteAddresses: subsiteAddresses.length },
    places };
}
