import type { PublicToilet } from '../types';

function distanceInKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function comparableToiletName(name: string) {
  return name.normalize('NFKC').toLowerCase()
    .replace(/(?:public\s*)?(?:toilets?|washrooms?|restrooms?|latrines?|公共廁所|公眾廁所|公廁|洗手間|廁所)/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function sameToiletAtSamePlace(
  left: Pick<PublicToilet, 'name' | 'latitude' | 'longitude'>,
  right: Pick<PublicToilet, 'name' | 'latitude' | 'longitude'>,
) {
  const leftName = comparableToiletName(left.name);
  const rightName = comparableToiletName(right.name);
  return leftName.length >= 4 && rightName.length >= 4
    && leftName === rightName
    && distanceInKm({ lat: left.latitude, lng: left.longitude }, { lat: right.latitude, lng: right.longitude }) <= 0.15;
}

export function removeCrossSourceLcsdToiletDuplicates(toilets: PublicToilet[]) {
  const exactLcsdToilets = toilets.filter((toilet) =>
    toilet.kind === 'lcsdParkToilet' && toilet.locationPrecision === 'toilet');
  const exactOtherSources = toilets.filter((toilet) =>
    toilet.kind === 'publicToilet'
      || toilet.kind === 'afcdCountryParkToilet'
      || toilet.kind === 'afcdNatureCentreToilet');
  const duplicateLcsd = new Set(exactLcsdToilets.filter((toilet) =>
    exactOtherSources.some((existing) => sameToiletAtSamePlace(toilet, existing))));
  return toilets.filter((toilet) => !duplicateLcsd.has(toilet));
}
