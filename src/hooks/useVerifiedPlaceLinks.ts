import { useEffect, useState } from 'react';
import { fetchVerifiedPlaceLinks, type VerifiedPlaceLink } from '../api/verifiedPlaceLinks';
import { isStaticPages } from '../api/site';

export function useVerifiedPlaceLinks() {
  const [links, setLinks] = useState<Map<string, VerifiedPlaceLink>>(() => new Map());
  useEffect(() => {
    if (!isStaticPages) return;
    const controller = new AbortController();
    void fetchVerifiedPlaceLinks(controller.signal).then(setLinks).catch(() => setLinks(new Map()));
    return () => controller.abort();
  }, []);
  return links;
}
