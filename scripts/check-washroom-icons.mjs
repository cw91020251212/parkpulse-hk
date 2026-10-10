import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const [mapView, toiletCard, symbol, styles, app] = await Promise.all([
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ToiletCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WashroomSymbol.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
]);

await Promise.all([
  access(new URL('../public/facility-icons/venue-sport.png', import.meta.url)),
  access(new URL('../public/facility-icons/public-toilet-gender.png', import.meta.url)),
]);

assert.match(symbol, /const venueSource = `\$\{import\.meta\.env\.BASE_URL\}facility-icons\/venue-sport\.png`;/);
assert.match(symbol, /const publicSource = `\$\{import\.meta\.env\.BASE_URL\}facility-icons\/public-toilet-gender\.png`;/);
assert.match(symbol, /washroom-symbol \$\{kind\}/);
assert.match(mapView, /const washroom = !fuel && !atm && !onStreet;/);
assert.match(mapView, /washroom \? washroomSymbolMarkup\(venue\)/);
assert.match(toiletCard, /<WashroomSymbol venue=\{isVenueLocation\} \/>/);
assert.match(toiletCard, /toilet\.locationPrecision === 'venue' \|\| toilet\.locationPrecision === 'venue-uncertain' \|\| isLcsdVenue/);
assert.match(toiletCard, /isUnconfirmedVenue = toilet\.kind === 'hadCommunityToilet' \|\| isLongValleyTemporaryVenue/);
assert.match(toiletCard, /isLongValleyTemporaryVenue \? 'afcdLongValleyTemporaryPrecision'/);
assert.match(mapView, /kind === 'hadCommunityToilet'/);
assert.match(mapView, /kind === 'afcdLongValleyTemporaryToilets'/);
assert.match(mapView, /afcdLongValleyTemporaryPrecision/);
assert.match(mapView, /is-location-unconfirmed/);
assert.match(toiletCard, /hadVenuePrecision/);
assert.match(toiletCard, /venueLocationPrecision/);
assert.match(toiletCard, /showPhoto && !isStaticPages && !isVenueLocation/);
assert.match(mapView, /distanceToVenue/);
assert.match(mapView, /venueLocationPrecision/);
assert.match(mapView, /nearbyIcon\(place\.kind,[^\n]+venueLocation, locationUnconfirmed\)/);
assert.match(mapView, /item\.toilet\.locationPrecision === 'venue-uncertain'/);
assert.match(app, /Food and Environmental Hygiene Department · Agriculture, Fisheries and Conservation Department · Leisure and Cultural Services Department · Home Affairs Department/);
assert.match(app, /食物環境衞生署、漁農自然護理署、康樂及文化事務署、民政事務總署/);
assert.match(app, /Data © HKSAR Government \/ AFCD; source:/);
assert.match(app, /資料版權屬香港特別行政區政府／漁護署；來源：/);
assert.match(app, /href="https:\/\/portal\.csdi\.gov\.hk\/csdi-webpage\/doc\/TNC"[^>]*>Common Spatial Data Infrastructure \(CSDI\) Portal<\/a>/);
assert.match(styles, /\.csdi-attribution \{ font-size: 12px; font-weight: 700; \}/);
assert.doesNotMatch(mapView, /venue \? '🏟️'/);
assert.doesNotMatch(toiletCard, /isLcsdVenue \? '🏟️' : '🚻'/);
assert.match(styles, /\.toilet-marker:not\(\.is-onstreet\) \{ background: linear-gradient\(to top right,/);
assert.match(styles, /linear-gradient\(to top right, #a8d6e8, #eef9fd\)/);
assert.match(styles, /linear-gradient\(to top right, #cbbbe2, #f5f0fb\)/);
assert.match(styles, /linear-gradient\(to top right, #c87835, #f8d8ac\)/);
assert.match(styles, /linear-gradient\(to top right, #4b9e7c, #c3ebd7\)/);
assert.match(styles, /\.toilet-card-icon\.is-fuel:not\(\.is-brand\) \{ background: linear-gradient\(to top right,/);
assert.match(styles, /\.toilet-card-icon\.is-atm:not\(\.is-brand\) \{ background: linear-gradient\(to top right,/);
assert.match(styles, /\.toilet-marker\.is-atm\.is-brand \{[^}]*linear-gradient\(to top right,/);
assert.match(styles, /\.legend-toilet \{ background: linear-gradient\(to top right,/);
assert.match(styles, /\.legend-venue-unconfirmed/);
assert.match(styles, /\.toilet-facts \{\s*grid-template-rows: none;[\s\S]*?max-height: none;[\s\S]*?overflow: visible;/);
assert.match(styles, /\.toilet-facts span \{\s*max-width: 100%;\s*overflow: visible;[\s\S]*?white-space: normal;/);

console.log('User-specified venue and public-toilet symbols are used in cards and Leaflet markers; all facility colours run deep bottom-left to light top-right.');
