export const TRAFFIC_CAMERA_DATASET_URL = 'https://data.gov.hk/tc-data/dataset/hk-td-tis_2-traffic-snapshot-images';
export const TRAFFIC_CAMERA_LOCATIONS_EN_URL = 'https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_En.xml';
export const TRAFFIC_CAMERA_LOCATIONS_TC_URL = 'https://static.data.gov.hk/td/traffic-snapshot-images/code/Traffic_Camera_Locations_Tc.xml';

const OFFICIAL_SNAPSHOT_HOST = 'tdcctv.data.one.gov.hk';
const HONG_KONG_BOUNDS = { south: 22.12, north: 22.59, west: 113.82, east: 114.49 };

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function field(xml, name) {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  return decodeXml(match?.[1] ?? '');
}

function nameWithoutKey(value, key) {
  return value.replace(new RegExp(`\\s*\\[${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\s*$`), '').trim();
}

function isHongKongCoordinate(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= HONG_KONG_BOUNDS.south && latitude <= HONG_KONG_BOUNDS.north
    && longitude >= HONG_KONG_BOUNDS.west && longitude <= HONG_KONG_BOUNDS.east;
}

function officialSnapshotUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === OFFICIAL_SNAPSHOT_HOST && /\.jpe?g$/i.test(url.pathname) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseTrafficCameraLocations(xml, language) {
  const records = [];
  for (const match of xml.matchAll(/<image>([\s\S]*?)<\/image>/gi)) {
    const body = match[1];
    const id = field(body, 'key');
    const region = field(body, 'region');
    const district = field(body, 'district');
    const description = field(body, 'description');
    const latitude = Number(field(body, 'latitude'));
    const longitude = Number(field(body, 'longitude'));
    const snapshotUrl = officialSnapshotUrl(field(body, 'url'));

    if (!id || !region || !district || !description || !snapshotUrl || !isHongKongCoordinate(latitude, longitude)) {
      throw new Error(`Traffic camera ${id || '(missing key)'} in ${language} XML is incomplete, outside Hong Kong or not an official JPG URL`);
    }
    records.push({ id, name: nameWithoutKey(description, id), region, district, latitude, longitude, snapshotUrl });
  }
  if (records.length < 900) throw new Error(`Traffic Camera Locations ${language} XML returned only ${records.length} records`);
  if (new Set(records.map(({ id }) => id)).size !== records.length) throw new Error(`Traffic Camera Locations ${language} XML has duplicate keys`);
  return records.sort((left, right) => left.id.localeCompare(right.id));
}

export function buildTrafficCameraSnapshot({ englishXml, traditionalChineseXml, generatedAt = new Date().toISOString() }) {
  const english = parseTrafficCameraLocations(englishXml, 'English');
  const traditionalChinese = parseTrafficCameraLocations(traditionalChineseXml, 'Traditional Chinese');
  const englishById = new Map(english.map((record) => [record.id, record]));
  const traditionalById = new Map(traditionalChinese.map((record) => [record.id, record]));

  if (englishById.size !== traditionalById.size) throw new Error(`Traffic Camera Locations language counts differ: English ${englishById.size}, Traditional Chinese ${traditionalById.size}`);

  const records = english.map((en) => {
    const tc = traditionalById.get(en.id);
    if (!tc) throw new Error(`Traffic camera ${en.id} is absent from Traditional Chinese XML`);
    if (en.snapshotUrl !== tc.snapshotUrl) throw new Error(`Traffic camera ${en.id} has different official JPG URLs between language XML files`);
    if (Math.abs(en.latitude - tc.latitude) > 0.000001 || Math.abs(en.longitude - tc.longitude) > 0.000001) throw new Error(`Traffic camera ${en.id} has different coordinates between language XML files`);
    return {
      id: en.id,
      nameTc: tc.name,
      nameEn: en.name,
      regionTc: tc.region,
      regionEn: en.region,
      districtTc: tc.district,
      districtEn: en.district,
      latitude: en.latitude,
      longitude: en.longitude,
      snapshotUrl: en.snapshotUrl,
    };
  });

  for (const id of traditionalById.keys()) if (!englishById.has(id)) throw new Error(`Traffic camera ${id} is absent from English XML`);

  return {
    source: {
      'zh-Hant': '運輸署／DATA.GOV.HK · 交通快拍鏡頭位置及原始影像',
      en: 'Transport Department / DATA.GOV.HK · traffic camera locations and original images',
    },
    sourceUrl: TRAFFIC_CAMERA_DATASET_URL,
    locationSourceTcUrl: TRAFFIC_CAMERA_LOCATIONS_TC_URL,
    locationSourceEnUrl: TRAFFIC_CAMERA_LOCATIONS_EN_URL,
    imageRefreshNote: {
      'zh-Hant': '原始快拍由運輸署發布，約每兩分鐘更新；不是連續直播，個別鏡頭可能暫時顯示 No Service。',
      en: 'Original snapshots are published by the Transport Department and refresh about every two minutes. They are not continuous live video and an individual camera may temporarily show No Service.',
    },
    generatedAt,
    records,
  };
}
