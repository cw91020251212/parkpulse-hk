const COMMUNITY_HALLS_EN_URL = 'https://www.had.gov.hk/psi/chcc/chsccs_en.csv';
const COMMUNITY_HALLS_ZH_URL = 'https://www.had.gov.hk/psi/chcc/chsccs_tc.csv';
const ACCESSIBLE_FACILITIES_URL = 'https://www.had.gov.hk/psi/barrier-free-facilities-in-community-halls-community-centres/barrier_free_facilities_in_community_halls_community_centres_en.csv';
const LOCATION_SEARCH_URL = 'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch';
const COORDINATE_TRANSFORM_URL = 'https://www.geodetic.gov.hk/transform/v2/';
const SEARCH_ALIASES = { 'northdistrictcommunitycentre': 'North District Community Centre and Town Hall' };
const CHINESE_DISTRICTS = {
  'Central & Western': '中西區', Eastern: '東區', Islands: '離島', 'Kowloon City': '九龍城',
  'Kwai Tsing': '葵青', 'Kwun Tong': '觀塘', North: '北區', 'Sai Kung': '西貢', 'Sha Tin': '沙田',
  'Sham Shui Po': '深水埗', Southern: '南區', 'Tai Po': '大埔', 'Tsuen Wan': '荃灣',
  'Tuen Mun': '屯門', 'Wan Chai': '灣仔', 'Wong Tai Sin': '黃大仙',
  'Yau Tsim Mong': '油尖旺', 'Yuen Long': '元朗',
};

function normalized(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function districtKey(value) {
  return normalized(value).replace(/區$/u, '');
}

function normalizedHeader(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s._()-]/gu, '');
}

function cleanChinese(value) {
  return String(value ?? '').trim().replace(/([\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu, '$1');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = String(text).replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"' && field === '') quoted = true;
    else if (character === ',') { row.push(field.trim()); field = ''; }
    else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += character;
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }

  const headers = (rows.shift() ?? []).map(normalizedHeader);
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

async function request(url, accept) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'ParkPulse-HK official-data snapshot' }, signal: AbortSignal.timeout(30_000) });
      if (response.ok) return response;
      lastError = new Error(`${url} returned ${response.status}`);
      if (response.status < 500 && response.status !== 429) throw lastError;
    } catch (error) {
      if (error === lastError) throw error;
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
  }
  throw lastError ?? new Error(`${url} failed`);
}

async function requestText(url) {
  return (await request(url, 'text/csv,text/plain,*/*')).text();
}

async function requestJson(url) {
  return (await request(url, 'application/json')).json();
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index]);
    }
  }));
  return results;
}

function stableId(reference, name) {
  const referenceSlug = String(reference ?? '').toLocaleLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
  if (referenceSlug) return `had-${referenceSlug}`;
  let hash = 2166136261;
  for (const character of name) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return `had-${(hash >>> 0).toString(16)}`;
}

async function coordinatesFor(venue) {
  const canonicalName = SEARCH_ALIASES[normalized(venue.name)] ?? venue.name;
  const search = new URL(LOCATION_SEARCH_URL);
  search.searchParams.set('q', canonicalName);
  search.searchParams.set('n', '20');
  search.searchParams.set('lang', 'en');
  const candidates = await requestJson(search);
  const expectedName = normalized(canonicalName);
  const match = candidates.filter((candidate) => normalized(candidate.nameEN) === expectedName)
    .sort((left, right) => Number(Boolean(right.addressEN)) - Number(Boolean(left.addressEN)))[0];
  if (!match || !Number.isFinite(match.x) || !Number.isFinite(match.y)) {
    throw new Error(`Lands Department location search did not return an exact venue-name match: ${venue.name}`);
  }

  const transform = new URL(COORDINATE_TRANSFORM_URL);
  transform.searchParams.set('inSys', 'hkgrid');
  transform.searchParams.set('outSys', 'wgsgeog');
  transform.searchParams.set('n', String(match.y));
  transform.searchParams.set('e', String(match.x));
  const location = await requestJson(transform);
  if (!Number.isFinite(location.wgsLat) || !Number.isFinite(location.wgsLong)
      || location.wgsLat < 22.13 || location.wgsLat > 22.57
      || location.wgsLong < 113.8 || location.wgsLong > 114.5) {
    throw new Error(`Lands Department could not return valid Hong Kong WGS84 coordinates for ${venue.name}`);
  }
  return { latitude: location.wgsLat, longitude: location.wgsLong };
}

export async function buildHadCommunityToilets() {
  const [englishCsv, chineseCsv, accessibilityCsv] = await Promise.all([
    requestText(COMMUNITY_HALLS_EN_URL),
    requestText(COMMUNITY_HALLS_ZH_URL),
    requestText(ACCESSIBLE_FACILITIES_URL),
  ]);
  const englishVenues = parseCsv(englishCsv);
  const chineseByReferenceAndDistrict = new Map(parseCsv(chineseCsv).map((row) => [`${normalized(row['參考編號'])}:${districtKey(row['地區'])}`, row]));
  const facilitiesByVenue = new Map(parseCsv(accessibilityCsv).map((row) => [normalized(row.venue), row]));
  const eligible = englishVenues.filter((venue) => facilitiesByVenue.get(normalized(venue.name))?.accessibletoilet === '*');
  const eligibleDistricts = new Set(eligible.map((venue) => normalized(venue.district)).filter(Boolean));
  if (eligible.length < 100 || eligibleDistricts.size !== 18) {
    throw new Error(`HAD source join is incomplete: ${eligible.length} accessible-toilet venues across ${eligibleDistricts.size} districts`);
  }

  const records = await mapWithConcurrency(eligible, 3, async (venue) => {
    const district = CHINESE_DISTRICTS[venue.district.trim()];
    if (!district) throw new Error(`HAD English venue list has an unrecognized district for ${venue.name}: ${venue.district}`);
    const chineseVenue = chineseByReferenceAndDistrict.get(`${normalized(venue.referenceno)}:${districtKey(district)}`);
    if (!chineseVenue) throw new Error(`HAD Chinese venue list has no matching reference and district for ${venue.name} (${venue.referenceno}, ${district})`);
    const coordinates = await coordinatesFor(venue);
    const name = cleanChinese(chineseVenue['名稱']);
    const address = cleanChinese(chineseVenue['地址']);
    return {
      id: stableId(`${venue.district} ${venue.referenceno}`, venue.name),
      name,
      nameEn: venue.name,
      address,
      addressEn: venue.address,
      district,
      districtEn: venue.district.trim(),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      kind: 'hadCommunityToilet',
      locationPrecision: 'venue-uncertain',
      hasAccessibleToilet: true,
      category: '社區會堂／社區中心',
      source: '民政事務總署',
      sourceUrl: ACCESSIBLE_FACILITIES_URL,
      remarks: '民政事務總署官方資料列有暢通易達洗手間；地圖只標示中心場地位置，並非洗手間所在樓層或房間。開放時間及公眾能否直接使用未獲資料確認，請先查詢場地或依現場安排。',
      remarksEn: 'The HAD lists an accessible toilet at this venue. The marker shows the venue, not the toilet room or floor. Public drop-in access and opening hours are not confirmed; check with the venue or on-site arrangements.',
    };
  });
  if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error('HAD community-toilet IDs are not unique');

  return {
    source: '民政事務總署社區會堂／社區中心暢通易達設施名單',
    sourceUrl: ACCESSIBLE_FACILITIES_URL,
    venueListUrls: [COMMUNITY_HALLS_EN_URL, COMMUNITY_HALLS_ZH_URL],
    coordinateSource: '地政總署位置搜尋及香港大地測量轉換服務（只作場地座標）',
    generatedAt: new Date().toISOString(),
    recordCount: records.length,
    records,
  };
}

export { ACCESSIBLE_FACILITIES_URL, COMMUNITY_HALLS_EN_URL, COMMUNITY_HALLS_ZH_URL, parseCsv };
