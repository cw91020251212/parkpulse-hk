export const OFFLINE_DATA_CACHE_NAME = 'parkpulse-hk-offline-data-v1';

export const OFFLINE_DATASETS = [
  {
    id: 'toilets',
    titleKey: 'offlineToiletsTitle',
    descriptionKey: 'offlineToiletsDescription',
    files: [
      'pages-data/public-toilets.json',
      'had-community-toilets.json',
      'pages-data/afcd-country-park-toilets.json',
      'pages-data/afcd-nature-centre-toilets.json',
      'pages-data/afcd-long-valley-temporary-toilets.json',
      'pages-data/landsd-map-toilets.json',
      'lcsd-washroom-venues.json',
      'pages-data/lcsd-park-washrooms.json',
    ],
  },
  {
    id: 'drinkingWater',
    titleKey: 'offlineDrinkingWaterTitle',
    descriptionKey: 'offlineDrinkingWaterDescription',
    files: [
      'pages-data/lcsd-drinking-water.json',
      'pages-data/afcd-drinking-water.json',
      'pages-data/mtr-drinking-water.json',
    ],
  },
  {
    id: 'aed',
    titleKey: 'offlineAedTitle',
    descriptionKey: 'offlineAedDescription',
    files: ['pages-data/aeds.json'],
  },
  {
    id: 'evChargers',
    titleKey: 'offlineEvChargersTitle',
    descriptionKey: 'offlineEvChargersDescription',
    files: ['pages-data/ev-chargers.json'],
  },
  {
    id: 'parking',
    titleKey: 'offlineParkingTitle',
    descriptionKey: 'offlineParkingDescription',
    files: ['carpark-info.json', 'pages-data/official-static-carparks.json'],
  },
] as const;

export type OfflineDatasetId = (typeof OFFLINE_DATASETS)[number]['id'];
