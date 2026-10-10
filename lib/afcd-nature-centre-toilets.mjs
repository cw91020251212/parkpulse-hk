const LVNP_FACILITIES_URL = 'https://www.lvnp.gov.hk/tc/lvnc.html';
const LOCATION_SEARCH_URL = 'https://www.map.gov.hk/gs/api/v1.0.0/locationSearch';
const COORDINATE_TRANSFORM_URL = 'https://www.geodetic.gov.hk/transform/v2/';

function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

async function requestJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'ParkPulse-HK official-data snapshot' }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

export async function buildAfcdNatureCentreToilets() {
  const search = new URL(LOCATION_SEARCH_URL);
  search.searchParams.set('q', 'Toilet (Long Valley Nature Centre)');
  search.searchParams.set('n', '10');
  search.searchParams.set('lang', 'en');
  const places = await requestJson(search);
  const place = places.find((item) => normalize(item.nameEN) === normalize('Toilet (Long Valley Nature Centre)'));
  if (!place || !Number.isFinite(place.x) || !Number.isFinite(place.y)) throw new Error('Lands Department did not return the named Long Valley Nature Centre toilet location');

  const transform = new URL(COORDINATE_TRANSFORM_URL);
  transform.searchParams.set('inSys', 'hkgrid');
  transform.searchParams.set('outSys', 'wgsgeog');
  transform.searchParams.set('n', String(place.y));
  transform.searchParams.set('e', String(place.x));
  const position = await requestJson(transform);
  if (!Number.isFinite(position.wgsLat) || !Number.isFinite(position.wgsLong)
      || position.wgsLat < 22.13 || position.wgsLat > 22.57
      || position.wgsLong < 113.8 || position.wgsLong > 114.5) {
    throw new Error('Lands Department could not convert the named Long Valley toilet point to valid Hong Kong coordinates');
  }

  const record = {
    id: 'afcd-lvnp-nature-centre-toilet',
    name: '塱原自然生態中心洗手間',
    nameEn: 'Toilet (Long Valley Nature Centre)',
    address: '塱原自然生態中心地下',
    addressEn: place.addressEN || 'G/F, Long Valley Nature Centre',
    district: '北區',
    latitude: position.wgsLat,
    longitude: position.wgsLong,
    kind: 'afcdNatureCentreToilet',
    locationPrecision: 'toilet',
    openingHours: '星期一、星期三至星期日及公眾假期上午9時30分至下午5時；星期二（公眾假期除外）及農曆年初一、初二休館。',
    openingHoursEn: '9:30 am–5:00 pm on Mondays, Wednesdays–Sundays and public holidays; closed on Tuesdays (except public holidays) and Lunar New Year days 1–2.',
    source: '漁護署塱原自然生態中心訪客設施',
    sourceUrl: LVNP_FACILITIES_URL,
    remarks: '漁護署官方設施頁列明訪客中心設有洗手間；本點按地政總署地名資料中明確命名的「Toilet (Long Valley Nature Centre)」座標轉換，並非由園區中心估算。',
    remarksEn: 'AFCD lists toilets among the visitor-centre facilities. This point is transformed from the Lands Department location-search entry explicitly named “Toilet (Long Valley Nature Centre)”; it is not estimated from the park centre.',
  };

  return {
    source: '漁護署塱原自然生態中心訪客設施 + 地政總署明確洗手間地名點',
    sourceUrl: LVNP_FACILITIES_URL,
    coordinateSource: '地政總署位置搜尋（Toilet (Long Valley Nature Centre)）及香港大地測量轉換服務',
    generatedAt: new Date().toISOString(),
    recordCount: 1,
    records: [record],
  };
}
