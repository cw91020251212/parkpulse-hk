import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { googleMapsPlaceUrl } from '../src/domain/placeLinks.ts';

const [nearbyCard, detailPanel, mapView, toiletCard, styles, i18n, app] = await Promise.all([
  readFile(new URL('../src/components/NearbyFacilityCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/NearbyFacilityDetail.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ToiletCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/i18n.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
]);

const placeUrl = new URL(googleMapsPlaceUrl('加油站', '香港中環皇后大道中 1 號', 22.281, 114.158));
assert.equal(placeUrl.origin, 'https://www.google.com');
assert.equal(placeUrl.pathname, '/maps/search/');
assert.equal(placeUrl.searchParams.get('query'), '加油站, 香港中環皇后大道中 1 號');
const coordinateUrl = new URL(googleMapsPlaceUrl('未命名設施', '', 22.281, 114.158));
assert.equal(coordinateUrl.searchParams.get('query'), '22.281,114.158');

assert.match(nearbyCard, /nearby-facility-main[\s\S]*?onClick=\{onSelect\}/);
assert.match(nearbyCard, /facility-details-button/);
assert.match(detailPanel, /className="detail-address"[\s\S]*?facility\.address/);
assert.match(detailPanel, /openPlaceOnMap/);
assert.match(mapView, /map-popup-address/);
assert.match(mapView, /map-popup-detail-button[\s\S]*?onClick=\{selectFacility\}/);
assert.match(app, /onSelect: \(\) => openFacilityDetail\(facility\.id\)/);
assert.match(app, /selectedFacility && <NearbyFacilityDetail/);
assert.match(app, /closeDetailFromBack[\s\S]*?setSelectedFacilityId\(null\)/);
assert.match(toiletCard, /card-address-link/);
assert.match(styles, /\.toilet-card \.card-heading p\s*\{[^}]*white-space:\s*normal/s);
assert.match(styles, /overflow-wrap:\s*anywhere/);
assert.match(i18n, /viewFacilityDetails:[\s\S]*?View full details/);
assert.match(app, /onSelect: \(\) => openFacilityDetail\(facility\.id\)/);
assert.match(app, /selectedFacility && <NearbyFacilityDetail/);
assert.match(app, /closeDetailFromBack[\s\S]*?setSelectedFacilityId\(null\)/);

console.log('Nearby facility and washroom addresses open complete details without truncation.');
