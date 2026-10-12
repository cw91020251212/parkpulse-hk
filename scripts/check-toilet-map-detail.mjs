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
assert.match(map, /<a className="landsd-credit" href="https:\/\/www\.map\.gov\.hk\/gm\/" target="_blank" rel="noreferrer"><span>\{text\(language, 'landsdCredit'\)\}<\/span><img src=\{LANDSD_LOGO_URL\} alt=\{text\(language, 'landsdLogo'\)\} \/><\/a>/);
assert.doesNotMatch(map, /<a className="landsd-credit" href="https:\/\/api\.portal\.hkmapservice\.gov\.hk\/disclaimer"/);
assert.match(map, /const selectToilet = 'toilet' in item \? \(\) => onSelectToilet\(item\.toilet\.id\)/);
assert.match(map, /viewedMarkerId: string \| null/);
assert.match(map, /popupopen: \(\) => onViewPopup\(markerKey\)/);
assert.match(map, /viewedMarkerId === markerKey/);
assert.match(app, /const \[viewedMarkerId, setViewedMarkerId\] = useState<string \| null>/);
assert.match(app, /const markMarkerViewed = useCallback/);
assert.match(app, /setViewedMarkerId\(markerKey\)/);
assert.match(app, /onViewPopup=\{markMarkerViewed\}/);
assert.doesNotMatch(app, /viewedMarkerIds|new Set\(current\)\.add/);
assert.match(app, /selectedToilet && <aside className="detail-panel washroom-detail-panel" role="dialog"/);
assert.match(app, /onSelectToilet=\{openToiletDetail\}/);
assert.match(styles, /\.parking-marker\.is-viewed,\s*\.toilet-marker\.is-viewed \{\s*--marker-outline: #ff3b78;/);
assert.doesNotMatch(styles, /\.parking-marker\.is-viewed \{\s*outline:/);
const viewedMarkerRule = styles.lastIndexOf('.parking-marker.is-viewed,\n.toilet-marker.is-viewed { --marker-outline: #ff3b78; }');
assert.ok(viewedMarkerRule > styles.lastIndexOf('.toilet-marker.is-aed'));
assert.doesNotMatch(styles.slice(viewedMarkerRule, viewedMarkerRule + 140), /\n\s+outline:/);
assert.match(styles, /\.washroom-detail-panel \{ padding-top: 52px; \}/);

console.log('Verified each popup immediately marks only the latest viewed marker with a border-following fluorescent outline, alongside detail/back behavior.');
