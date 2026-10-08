import { distanceInKm } from './distance.ts';
import type { CarparkInfo, EpdEvCharger, EvChargerMatch } from '../types';

const NAME_OR_ADDRESS_MAX_DISTANCE_METERS = 250;
const COORDINATE_ONLY_MAX_DISTANCE_METERS = 40;

function normalize(value?: string) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[\s\-–－()（）\[\]，,。．.]/g, '');
}

function addressesMatch(left?: string, right?: string) {
  const first = normalize(left);
  const second = normalize(right);
  return first.length >= 8 && second.length >= 8 && (first.includes(second) || second.includes(first));
}

export function findEvCharger(info: CarparkInfo, chargers: EpdEvCharger[]): EvChargerMatch | undefined {
  const carparkName = normalize(info.name);
  const candidates = chargers
    .map((charger) => {
      const distanceMeters = Math.round(distanceInKm(
        { lat: info.latitude, lng: info.longitude },
        { lat: charger.latitude, lng: charger.longitude },
      ) * 1_000);
      const nameMatch = carparkName.length >= 3 && carparkName === normalize(charger.name);
      const addressMatch = addressesMatch(info.displayAddress, charger.address);
      const samePlace = nameMatch || addressMatch;
      const coordinateOnly = distanceMeters <= COORDINATE_ONLY_MAX_DISTANCE_METERS;
      if ((!samePlace || distanceMeters > NAME_OR_ADDRESS_MAX_DISTANCE_METERS) && !coordinateOnly) return undefined;

      return {
        charger,
        distanceMeters,
        matchedBy: samePlace ? 'name-address' as const : 'coordinates' as const,
        rank: samePlace ? 0 : 1,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => left.rank - right.rank || left.distanceMeters - right.distanceMeters);

  const best = candidates[0];
  return best && { ...best.charger, distanceMeters: best.distanceMeters, matchedBy: best.matchedBy };
}

export function hasEvFacility(info: CarparkInfo, charger?: EvChargerMatch) {
  return Boolean(charger) || (info.facilities ?? []).includes('evCharger');
}
