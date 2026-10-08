import assert from 'node:assert/strict';

const baseUrl = process.env.PARKSPOT_BASE_URL ?? 'http://127.0.0.1:3000';
const { records } = await (await fetch(`${baseUrl}/api/public-toilets`)).json();
const sample = records.filter((record) => record.latitude > 22.30 && record.latitude < 22.34 && record.longitude > 114.15 && record.longitude < 114.19).slice(0, 8);
assert.ok(sample.length > 0, 'Expected nearby official toilet records');

let match;
for (const toilet of sample) {
  const parameters = new URLSearchParams({ name: toilet.name, address: toilet.address ?? '', lat: String(toilet.latitude), lng: String(toilet.longitude) });
  const payload = await (await fetch(`${baseUrl}/api/place-photo?${parameters}`)).json();
  if (payload.state === 'found') {
    match = { toilet, payload };
    break;
  }
}

assert.ok(match, 'Expected at least one nearby public toilet with a verified photo');
assert.ok(match.payload.photoUrl && match.payload.placeUrl && match.payload.distanceMeters <= 250, 'Photo must be coordinate-verified within 250m');
const image = await fetch(`${baseUrl}${match.payload.photoUrl}`, { redirect: 'manual' });
assert.ok(image.status === 200 || (image.status >= 300 && image.status < 400), `Photo route returned ${image.status}`);
console.log(`Verified ${match.toilet.name} photo at ${match.payload.distanceMeters}m`);
