import { useEffect, useState } from 'react';
import { isStaticPages } from '../api/site';

export type PlacePhoto = {
  photoUrl: string;
  placeUrl: string;
  placeName: string;
  distanceMeters: number;
  attribution: string;
};

export type PlacePhotoState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'found'; photo: PlacePhoto }
  | { kind: 'not_found' | 'unavailable'; placeUrl: string };

type PlaceTarget = {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
};

function mapsPhotoSearchUrl(target: PlaceTarget) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${target.name} ${target.address ?? ''}`.trim())}`;
}

export function usePlacePhoto(target: PlaceTarget, enabled = true) {
  const [state, setState] = useState<PlacePhotoState>(enabled ? { kind: 'loading' } : { kind: 'idle' });

  useEffect(() => {
    const fallbackUrl = mapsPhotoSearchUrl(target);
    if (!enabled) {
      setState({ kind: 'idle' });
      return;
    }
    if (isStaticPages) {
      setState({ kind: 'unavailable', placeUrl: fallbackUrl });
      return;
    }

    let active = true;
    const controller = new AbortController();
    setState({ kind: 'loading' });
    const parameters = new URLSearchParams({
      name: target.name,
      address: target.address ?? '',
      lat: String(target.latitude),
      lng: String(target.longitude),
    });

    fetch(`/api/place-photo?${parameters}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { state?: string } & Partial<PlacePhoto>;
        if (!active) return;
        if (payload.state === 'found' && payload.photoUrl && payload.placeUrl && payload.placeName && typeof payload.distanceMeters === 'number' && payload.attribution) {
          setState({ kind: 'found', photo: payload as PlacePhoto });
          return;
        }
        setState({ kind: payload.state === 'not_found' ? 'not_found' : 'unavailable', placeUrl: payload.placeUrl ?? fallbackUrl });
      })
      .catch((error: unknown) => {
        if (active && !(error instanceof Error && error.name === 'AbortError')) setState({ kind: 'unavailable', placeUrl: fallbackUrl });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, target.id, target.name, target.address, target.latitude, target.longitude]);

  return [state, setState] as const;
}
