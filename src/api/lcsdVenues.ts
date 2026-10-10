import type { PublicToilet } from '../types';
import { distanceInKm } from '../domain/distance';
import { publicAsset } from './site';

type LcsdVenueResponse = { records?: PublicToilet[] };
type LcsdParkWashroomResponse = { facilities?: PublicToilet[] };

function normalizeName(name: string) {
  return name.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\p{S}]+/gu, '');
}

export async function fetchLcsdVenues(signal: AbortSignal) {
  const [venueResponse, parkResponse] = await Promise.all([
    fetch(publicAsset('lcsd-washroom-venues.json'), { signal }),
    fetch(publicAsset('pages-data/lcsd-park-washrooms.json'), { signal }),
  ]);
  if (!venueResponse.ok) throw new Error('未能讀取康文署場館資料');
  const [venuePayload, parkPayload] = await Promise.all([
    venueResponse.json() as Promise<LcsdVenueResponse>,
    parkResponse.ok ? (parkResponse.json() as Promise<LcsdParkWashroomResponse>).catch(() => null) : Promise.resolve(null),
  ]);
  const venues = Array.isArray(venuePayload.records) ? venuePayload.records : [];
  const parks = Array.isArray(parkPayload?.facilities) ? parkPayload.facilities : [];
  const additionalParks = parks.filter((park) => !venues.some((venue) => (
    normalizeName(venue.name) === normalizeName(park.name)
    && distanceInKm({ lat: venue.latitude, lng: venue.longitude }, { lat: park.latitude, lng: park.longitude }) <= 0.15
  )));
  return [...venues, ...additionalParks];
}
