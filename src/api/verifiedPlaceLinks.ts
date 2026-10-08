import { isStaticPages, publicAsset } from './site';

export type VerifiedPlaceLink = {
  key: string;
  placeUrl: string;
};

type Response = { records?: VerifiedPlaceLink[] };

export async function fetchVerifiedPlaceLinks(signal: AbortSignal) {
  if (!isStaticPages) return new Map<string, string>();

  const response = await fetch(publicAsset('pages-data/verified-place-links.json'), { signal });
  if (!response.ok) throw new Error('未能讀取已核實相片地點');
  const payload = await response.json() as Response;
  return new Map((payload.records ?? [])
    .filter((record) => record.key && record.placeUrl)
    .map((record) => [record.key, record.placeUrl]));
}
