import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [mapView, toiletCard, symbol, styles] = await Promise.all([
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/ToiletCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/WashroomSymbol.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);

assert.match(symbol, /export function washroomSymbolMarkup\(venue: boolean\)/);
assert.match(symbol, /export function WashroomSymbol\(/);
assert.match(symbol, /M4\.5 3\.5h6v17h-6z/);
assert.match(symbol, /M5 12h14v2\.5/);
assert.match(mapView, /const washroom = !fuel && !atm && !onStreet;/);
assert.match(mapView, /washroom \? washroomSymbolMarkup\(venue\)/);
assert.match(toiletCard, /<WashroomSymbol venue=\{isLcsdVenue\} \/>/);
assert.doesNotMatch(mapView, /venue \? '🏟️'/);
assert.doesNotMatch(toiletCard, /isLcsdVenue \? '🏟️' : '🚻'/);
assert.match(styles, /\.washroom-symbol \{ display: block; width: 17px; height: 17px;/);
assert.match(styles, /\.toilet-marker \.washroom-symbol \{ width: 20px; height: 20px;/);

console.log('Public toilets use a cubicle icon and venue washrooms use a matching basin icon in both cards and Leaflet markers.');
