import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const [mapView, toiletCard, symbol, styles] = await Promise.all([
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ToiletCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WashroomSymbol.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);

await Promise.all([
  access(new URL('../public/facility-icons/venue-sport.png', import.meta.url)),
  access(new URL('../public/facility-icons/public-toilet-gender.png', import.meta.url)),
]);

assert.match(symbol, /const venueSource = '\/facility-icons\/venue-sport\.png';/);
assert.match(symbol, /const publicSource = '\/facility-icons\/public-toilet-gender\.png';/);
assert.match(symbol, /washroom-symbol \$\{kind\}/);
assert.match(mapView, /const washroom = !fuel && !atm && !onStreet;/);
assert.match(mapView, /washroom \? washroomSymbolMarkup\(venue\)/);
assert.match(toiletCard, /<WashroomSymbol venue=\{isLcsdVenue\} \/>/);
assert.doesNotMatch(mapView, /venue \? '🏟️'/);
assert.doesNotMatch(toiletCard, /isLcsdVenue \? '🏟️' : '🚻'/);
assert.match(styles, /\.toilet-marker:not\(\.is-onstreet\) \{ background: linear-gradient\(to top right,/);
assert.match(styles, /\.toilet-card-icon\.is-fuel:not\(\.is-brand\) \{ background: linear-gradient\(to top right,/);
assert.match(styles, /\.toilet-card-icon\.is-atm:not\(\.is-brand\) \{ background: linear-gradient\(to top right,/);
assert.match(styles, /\.toilet-marker\.is-atm\.is-brand \{[^}]*linear-gradient\(to top right,/);
assert.match(styles, /\.legend-toilet \{ background: linear-gradient\(to top right,/);

console.log('User-specified venue and public-toilet symbols are used in cards and Leaflet markers; all facility colours run deep bottom-left to light top-right.');
