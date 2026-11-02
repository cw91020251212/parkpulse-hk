import assert from 'node:assert/strict';
import { fetchAllNamedPlaceRows, fetchNamedPlacePage } from '../lib/named-places.mjs';

// Fixtures test the transport contract only; production data always comes from the real source.
const originalFetch = globalThis.fetch;
const originalCache = process.env.NAMED_PLACES_CACHE_DIR;
delete process.env.NAMED_PLACES_CACHE_DIR;
const response = (rows, start, total) => new Response(JSON.stringify(rows), {
  status: 206, headers: { 'content-range': `${start}-${start + rows.length - 1}/${total}` },
});
try {
  const offsets = [];
  globalThis.fetch = async url => {
    const offset = Number(url.searchParams.get('offset'));
    offsets.push(offset);
    const rows = Array.from({ length: Math.min(2, 5 - offset) }, (_, n) => ({ objectid: offset + n + 1 }));
    return response(rows, offset, 5);
  };
  assert.deepEqual((await fetchAllNamedPlaceRows('fixture')).map(row => row.objectid), [1, 2, 3, 4, 5]);
  assert.deepEqual(offsets, [0, 2, 4], 'Advance by actual returned rows, not the requested limit');

  globalThis.fetch = async () => response([{ objectid: 1 }], 0, 5);
  await assert.rejects(fetchNamedPlacePage('fixture', {}, 2), /Incorrect page range/);

  globalThis.fetch = async url => {
    const offset = Number(url.searchParams.get('offset'));
    return response([{ objectid: offset + 1 }], offset, offset ? 3 : 2);
  };
  await assert.rejects(fetchAllNamedPlaceRows('fixture'), /Source changed/);

  globalThis.fetch = async url => {
    const offset = Number(url.searchParams.get('offset'));
    return response([{ objectid: 1 }], offset, 2);
  };
  await assert.rejects(fetchAllNamedPlaceRows('fixture'), /duplicated/);

  let active = 0, maxActive = 0;
  globalThis.fetch = async () => {
    active++; maxActive = Math.max(active, maxActive);
    await new Promise(resolve => setTimeout(resolve, 10));
    active--;
    return response([{ objectid: 1 }], 0, 1);
  };
  await Promise.all(Array.from({ length: 6 }, () => fetchNamedPlacePage('fixture')));
  assert.equal(maxActive, 2, 'Public mirror requests must remain globally bounded to two');

  let attempts = 0;
  globalThis.fetch = async () => ++attempts === 1
    ? new Response(null, { status: 503 }) : response([{ objectid: 1 }], 0, 1);
  assert.equal((await fetchNamedPlacePage('fixture')).rows.length, 1);
  assert.equal(attempts, 2, 'A transient failure is retried without replacing a complete snapshot');
  console.log('Named-place download OK: short-page recovery, exact ranges/counts, unique IDs, two-request bound and transient retry.');
} finally {
  globalThis.fetch = originalFetch;
  if (originalCache === undefined) delete process.env.NAMED_PLACES_CACHE_DIR;
  else process.env.NAMED_PLACES_CACHE_DIR = originalCache;
}
