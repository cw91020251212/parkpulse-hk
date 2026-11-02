import { publicAsset } from './site';
import type { NamedPlaceSnapshot } from '../domain/namedPlaces';

let pending: Promise<NamedPlaceSnapshot> | undefined;

export function loadNamedPlaces(): Promise<NamedPlaceSnapshot> {
  if (!pending) {
    pending = fetch(publicAsset('pages-data/named-places.json'), {
      credentials: 'omit', signal: AbortSignal.timeout(30_000),
    }).then(async response => {
      if (!response.ok) throw new Error(`Named places returned ${response.status}`);
      const snapshot = await response.json() as NamedPlaceSnapshot;
      if (!Array.isArray(snapshot.places) || !snapshot.places.length || !snapshot.sourceUrl) throw new Error('Named place data unavailable');
      return snapshot;
    }).catch(error => { pending = undefined; throw error; });
  }
  return pending;
}
