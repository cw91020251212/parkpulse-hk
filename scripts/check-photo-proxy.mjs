const baseUrl = process.env.PARKSPOT_BASE_URL ?? 'http://127.0.0.1:3000';
const parameters = new URLSearchParams({
  name: '圓方停車場',
  address: '九龍柯士甸道西1號',
  lat: '22.30493235',
  lng: '114.16157933',
});

const response = await fetch(`${baseUrl}/api/place-photo?${parameters}`);
if (!response.ok) throw new Error(`Photo lookup returned ${response.status}`);
const payload = await response.json();
if (payload.state !== 'found' || !payload.photoUrl || payload.distanceMeters > 250) {
  throw new Error('Photo lookup did not return a nearby verified image');
}

const image = await fetch(`${baseUrl}${payload.photoUrl}`, { redirect: 'manual' });
if (image.status !== 302 && !image.headers.get('content-type')?.startsWith('image/')) {
  throw new Error(`Photo image route returned ${image.status}`);
}

console.log(`Verified ${payload.placeName} photo at ${payload.distanceMeters}m`);
