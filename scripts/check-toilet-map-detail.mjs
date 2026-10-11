import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, map, styles] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);

assert.match(map, /className="toilet-popup-detail-trigger"[^>]*aria-haspopup="dialog"/);
assert.match(map, /className="toilet-popup-detail-action"[^>]*aria-haspopup="dialog"[^>]*onClick=\{selectToilet\}>\{text\(language, 'details'\)\}/);
assert.match(styles, /\.toilet-popup-detail-row \{ display: flex; align-items: flex-start;/);
assert.match(styles, /\.toilet-popup-detail-action \{ display: inline-flex;/);
assert.match(map, /function PopupHistory\(\)/);
assert.match(map, /parkspotPopup: true/);
assert.match(map, /event\.state\?\.parkspotPopup === true/);
assert.match(map, /map\.closePopup\(\)/);
assert.match(map, /function LandsdMapCredit\(\{ language \}: \{ language: Language \}\)/);
assert.match(map, /parkspotLandsdMenu: true/);
assert.match(map, /event\.state\?\.parkspotLandsdMenu === true/);
assert.match(map, /window\.history\.back\(\)/);
assert.match(map, /aria-expanded=\{open\}/);
assert.match(map, /document\.addEventListener\('pointerdown', onOutsidePointerDown, true\)/);
assert.match(map, /event\.key !== 'Escape'/);
assert.match(map, /const selectToilet = 'toilet' in item \? \(\) => onSelectToilet\(item\.toilet\.id\)/);
assert.match(map, /lastViewedToiletId/);
assert.match(app, /const \[lastViewedToiletId, setLastViewedToiletId\]/);
assert.match(app, /setSelectedToiletId\(toiletId\);\s*setLastViewedToiletId\(toiletId\)/);
assert.match(app, /selectedToilet && <aside className="detail-panel washroom-detail-panel" role="dialog"/);
assert.match(app, /onSelectToilet=\{openToiletDetail\}/);
assert.match(styles, /\.toilet-marker\.is-last-viewed \{ --marker-outline: #ff3b78; \}/);
assert.match(styles, /\.washroom-detail-panel \{ padding-top: 52px; \}/);

console.log('Verified toilet popup detail action and back behavior, plus LandsD menu history, hardware-back close, Escape, and outside-tap dismissal.');
