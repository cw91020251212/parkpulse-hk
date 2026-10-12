import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appSource, mapSource, detailSource, styles, borderIcon, facilityCard, filters] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/NearbyFacilityDetail.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../public/icons/border-control.svg', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/NearbyFacilityCard.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Filters.tsx', import.meta.url), 'utf8'),
]);

assert.match(appSource, /const mapParks = \(startupLocationPending && searchScope === 'radius'\) \|\| facilityMode \? \[\] : displayedParks;/);
assert.match(appSource, /const mapNearbyItems = \(startupLocationPending && searchScope === 'radius'\) \|\| !facilityMode \? \[\] : activeNearbyResults;/);
assert.match(appSource, /legend-aed-symbol/);
assert.match(appSource, /aedSnapshotGeneratedAt/);
assert.match(appSource, /legend-emergency-symbol/);
assert.match(appSource, /emergencyWaitStatistics/);
assert.match(appSource, /legend-border-symbol/);
assert.match(appSource, /borderSnapshotGeneratedAt/);
assert.match(mapSource, /nearbyItems\.map\(\(item\)/);
assert.match(mapSource, /kind === 'aed'/);
assert.match(mapSource, /kind === 'emergency'/);
assert.match(mapSource, /kind === 'border'/);
assert.match(mapSource, /is-aed/);
assert.match(mapSource, /is-emergency/);
assert.match(mapSource, /is-border/);
assert.match(mapSource, /AED_SYMBOL_URL/);
assert.match(mapSource, /EMERGENCY_SYMBOL_URL/);
assert.match(mapSource, /BORDER_SYMBOL_URL/);
assert.match(mapSource, /aedSources/);
assert.match(mapSource, /emergencySources/);
assert.match(mapSource, /borderSources/);
assert.match(detailSource, /aed-detail-symbol/);
assert.match(detailSource, /aedSnapshot/);
assert.match(detailSource, /emergency-detail-symbol/);
assert.match(detailSource, /emergencyUrgentNotice/);
assert.match(detailSource, /border-detail-symbol/);
assert.match(detailSource, /borderWaitingTimes/);
assert.match(styles, /\.toilet-marker \.aed-symbol \{ width: 30px; height: 30px; \}/);
assert.match(styles, /\.toilet-marker\.is-emergency/);
assert.match(styles, /\.emergency-pill-symbol/);
assert.match(styles, /\.border-control-symbol/);
assert.match(borderIcon, /<circle[^>]+fill="none"/);
assert.match(borderIcon, /<path d="M0 0h64v35H0Z" fill="#fff"/);
assert.match(borderIcon, /<path d="M0 35h64v29H0Z" fill="#15384b"/);
assert.match(borderIcon, /<path[^>]+fill="#18a8cb"/);
assert.match(borderIcon, /stroke-dasharray="5 4"/);
assert.doesNotMatch(borderIcon, /<rect[^>]+fill="(?!none|transparent)/);
assert.match(appSource, /facilityMode === 'hkjc' \? hkjcSourceNote/);
assert.match(appSource, /legend-hkjc/);
assert.match(filters, /'border', 'hkjc'/);
assert.match(mapSource, /kind === 'hkjc'/);
assert.match(mapSource, /is-hkjc/);
assert.match(mapSource, /hkjcLocationPrecision/);
assert.match(facilityCard, /facility\.kind === 'hkjc'/);
assert.match(facilityCard, /hkjcSources/);
assert.match(detailSource, /hkjcNoLiveStatus/);
assert.match(styles, /\.toilet-marker\.is-hkjc/);
assert.match(styles, /\.toilet-marker\.is-hkjc \{ --marker-outline: #ffd84a; background: linear-gradient\(to top right, #176f9b, #49bde8\); \}/);
assert.match(styles, /\.hkjc-horse-icon.*color: #ffda44/);
assert.match(styles, /\.toilet-card-icon\.is-hkjc:not\(\.is-brand\), \.legend-hkjc \{ color: #ffda44; background: linear-gradient\(to top right, #176f9b, #49bde8\); \}/);
assert.match(mapSource, /hkjc \? '<span class="hkjc-horse-icon">♞<\/span>'/);
assert.match(facilityCard, /hkjc \? <span className="hkjc-horse-icon">♞<\/span>/);
assert.match(appSource, /legend-hkjc" aria-hidden="true"><span className="hkjc-horse-icon">♞<\/span>/);
assert.match(appSource, /legendHkjcFirstPrize/, 'The legend should explain the gold first-prize crown');
assert.match(mapSource, /hkjc-first-prize-marker-badge/, 'Map markers should show the official first-prize count badge');
assert.match(mapSource, /hkjcFirstPrizeTicketCount/, 'Map markers should use official outlet counts');
assert.match(facilityCard, /hkjc-first-prize-card-badge/, 'The top-ten crown should appear on list cards');
assert.match(facilityCard, /hkjcFirstPrizeRankCount/, 'Cards should show rank and ticket count');
assert.match(detailSource, /hkjcFirstPrizeAsOf/, 'The outlet detail should show the statistics cutoff date');
assert.match(detailSource, /hkjcFirstPrizeSource/, 'The outlet detail should link to the official statistics');
assert.match(styles, /\.hkjc-first-prize-marker-badge/);
assert.match(mapSource, /hkjc-first-prize-marker-badge" aria-hidden="true"><svg viewBox="0 0 48 36"/, 'Map count should sit inside a crown-shaped SVG');
assert.match(mapSource, /<text x="24" y="25"[^>]*>\$\{firstPrizeCount\}<\/text>/, 'Map crown should contain the count directly');
assert.match(facilityCard, /hkjc-first-prize-card-badge"><svg viewBox="0 0 48 36"/, 'Card badge should use the same crown shape');
assert.match(facilityCard, /<text x="24" y="25"[^>]*>\{facility\.hkjcFirstPrizeTicketCount\}<\/text>/, 'Card crown should contain its count directly');
assert.match(styles, /\.hkjc-first-prize-marker-badge, \.hkjc-first-prize-card-badge \{[^}]*background: transparent/, 'Crown badges must not have a round backing');
assert.doesNotMatch(styles, /\.hkjc-first-prize-marker-badge \{[^}]*border-radius/, 'The map badge itself must not be circular');

console.log('Verified AED, emergency-department, border and HKJC outlet controls, markers, legends, sources and location precision across map and detail views.');
