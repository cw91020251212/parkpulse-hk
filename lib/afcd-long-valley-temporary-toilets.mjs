const OFFICIAL_CSDI_DATASET_URL = 'https://data.gov.hk/tc-data/dataset/hk-afcd-afcdlist-lvnpcsdi';
const GOVERNMENT_REPLY_URL = 'https://www.info.gov.hk/gia/general/202406/12/P2024061200281.htm';
const LONG_VALLEY_VENUE_POINT = Object.freeze({ latitude: 22.508721, longitude: 114.112952 });

export function buildAfcdLongValleyTemporaryToilets() {
  const { latitude, longitude } = LONG_VALLEY_VENUE_POINT;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < 22.13 || latitude > 22.57 || longitude < 113.8 || longitude > 114.5) {
    throw new Error('AFCD CSDI Long Valley park point is outside the Hong Kong coordinate bounds');
  }

  return {
    source: '漁護署（政府答覆所列塱原臨時廁所存在資訊；AFCD CSDI 園區場地點）',
    sourceUrl: GOVERNMENT_REPLY_URL,
    coordinateSourceUrl: OFFICIAL_CSDI_DATASET_URL,
    generatedAt: new Date().toISOString(),
    recordCount: 1,
    records: [{
      id: 'afcd-long-valley-temporary-toilets-venue',
      name: '塱原自然生態公園附近漁護署臨時廁所（3處）',
      nameEn: 'AFCD temporary toilets near Long Valley Nature Park (3 sites)',
      address: '塱原自然生態公園（官方場地位置；不是廁所位置）',
      addressEn: 'Long Valley Nature Park (official venue point; not a toilet location)',
      district: '北區',
      districtEn: 'North',
      latitude,
      longitude,
      kind: 'afcdLongValleyTemporaryToilets',
      locationPrecision: 'venue-uncertain',
      category: '漁護署臨時公廁（政府 2024 年答覆列 3 處）',
      source: '漁護署塱原自然生態公園（政府答覆／AFCD CSDI）',
      sourceUrl: GOVERNMENT_REPLY_URL,
      coordinateSourceUrl: OFFICIAL_CSDI_DATASET_URL,
      sourcePeriod: '2024 年政府答覆；AFCD CSDI 園區場地點',
      remarks: '政府於 2024 年答覆提及漁護署在塱原自然生態公園近單車徑三處位置設有臨時廁所，但未公布逐點座標。灰色標記及導航只指向 AFCD CSDI 的公園場地點，並非其中任何廁所位置；目前開放狀況及時間未有較新的資料，請到場確認。',
      remarksEn: 'A 2024 Government reply reported three AFCD temporary toilets near the Long Valley Nature Park cycle track, without individual coordinates. The grey marker and directions point only to the AFCD CSDI park venue point, not any of the toilet sites. Current availability and opening hours are not confirmed; check on site.',
    }],
  };
}
