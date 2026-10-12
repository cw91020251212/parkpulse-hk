import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isCoordinateInViewport, isWithinSearchScope } from '../src/domain/mapViewport.ts';

const viewport = { north: 22.5, south: 22.2, east: 114.4, west: 113.9, center: { lat: 22.35, lng: 114.15 } };
assert.equal(isCoordinateInViewport({ lat: 22.2, lng: 113.9 }, viewport), true, 'viewport edges are inclusive');
assert.equal(isCoordinateInViewport({ lat: 22.51, lng: 114.15 }, viewport), false, 'north outside viewport is excluded');
assert.equal(isCoordinateInViewport({ lat: 22.35, lng: 114.41 }, viewport), false, 'east outside viewport is excluded');
assert.equal(isWithinSearchScope({ lat: 22.4, lng: 114.3 }, 25, 'viewport', viewport, 2), true, 'viewport mode includes visible points beyond 2 km');
assert.equal(isWithinSearchScope({ lat: 22.51, lng: 114.15 }, 1, 'viewport', viewport, 2), false, 'viewport mode excludes points outside visible bounds even when near the search centre');
assert.equal(isWithinSearchScope({ lat: 22.4, lng: 114.3 }, 1.9, 'radius', viewport, 2), true, 'radius mode includes points within 2 km');
assert.equal(isWithinSearchScope({ lat: 22.4, lng: 114.3 }, 2.1, 'radius', viewport, 2), false, 'radius mode excludes points beyond 2 km');
assert.equal(isWithinSearchScope({ lat: 22.4, lng: 114.3 }, 1, 'viewport', null, 2), false, 'viewport mode waits for actual map bounds instead of falling back to radius');
const wrapped = { north: 10, south: -10, east: -170, west: 170, center: { lat: 0, lng: 180 } };
assert.equal(isCoordinateInViewport({ lat: 0, lng: 179 }, wrapped), true, 'antimeridian-wrapping bounds include longitudes on either side');
assert.equal(isCoordinateInViewport({ lat: 0, lng: 0 }, wrapped), false, 'antimeridian-wrapping bounds exclude the opposite longitude');

const [app, map, filters, styles] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/MapView.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/Filters.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);
assert.match(app, /searchScope/);
assert.match(app, /isWithinSearchScope/);
assert.match(app, /onViewportChange=\{updateMapViewport\}/);
assert.match(app, /atmBank, language, searchScope/);
assert.match(app, /startupLocationDisplayReleased = useRef\(searchScope === 'viewport'\)/, 'saved viewport mode is available before startup GPS finishes');
assert.match(app, /const searchScopeRef = useRef\(searchScope\)/, 'late startup GPS reads the current scope instead of the initial render');
assert.match(app, /const \[hasGpsPosition, setHasGpsPosition\] = useState\(false\)/, 'GPS success is tracked separately from a manual map centre');
assert.match(app, /const \[hasManualMapMarker, setHasManualMapMarker\] = useState\(false\)/, 'a long-press marker is tracked separately from GPS');
assert.doesNotMatch(app, /useLayoutEffect|mapColumnRef|visualViewport/, 'map height does not dynamically fill the remaining screen');
assert.match(app, /facilityMode && facilityMode !== 'onStreet' \? ' is-facility-mode' : ''/, 'only nearby facilities, not vehicle-specific roadside parking, receive the facility layout');
assert.match(app, /setPosition\(\{ lat: coords\.latitude, lng: coords\.longitude \}\);\s*setHasGpsPosition\(true\);/s, 'a successful geolocation result enables the current-location marker');
assert.match(app, /setHasGpsPosition\(true\);\s*setHasManualMapMarker\(false\);/s, 'GPS success replaces an older manual map marker');
assert.match(app, /const selectArea = .*setPosition\(coordinates\); setHasGpsPosition\(false\); setHasManualMapMarker\(behavior\.showManualMarker === true\);/s, 'only an explicit long-press centre keeps a manual marker without masquerading as GPS');
assert.match(app, /showCurrentLocation=\{hasGpsPosition\}/, 'the GPS state is provided to the map');
assert.match(app, /showManualCenter=\{hasManualMapMarker\}/, 'the manual map-marker state is provided to the map');
assert.match(styles, /\.map-column \{ height: max\(407px, calc\(100dvh - 173px\)\); \}/, 'parking mode retains its original mobile map height');
assert.match(styles, /\.workspace\.is-facility-mode \.map-column \{ height: calc\(max\(407px, calc\(100dvh - 173px\)\) \+ 42px\); \}/, 'nearby facilities mode adds exactly one filter-row of map height');
assert.match(app, /onSearchScopeChange=\{changeSearchScope\}/, 'choosing viewport mode releases the startup location gate');
assert.match(app, /startupLocationPending && searchScope === 'radius'/, 'startup location loading only blocks the original radius mode');
assert.match(app, /searchScope === 'radius' && !resultsVerified && !startupLocationFallbackActive/, 'unverified park results may render in viewport mode without waiting for location fallback');
assert.match(app, /searchScope !== 'viewport' \|\| isWithinSearchScope\(\{ lat: park\.info\.latitude, lng: park\.info\.longitude \}/, 'accessible-parking fallback remains inside the viewport result scope');
assert.match(app, /searchScopeRef\.current === 'radius'/, 'late GPS recenters only if the user has switched back to the radius mode');
assert.match(app, /if \(previous === 'viewport'\) setRecenterRequest/, 'switching back to radius restores its current search centre');
assert.match(map, /ReportViewport/);
assert.match(map, /moveend zoomend resize/);
assert.match(map, /searchScope === 'radius'/);
assert.match(map, /showCurrentLocation: boolean/, 'the map accepts a GPS-location flag');
assert.match(map, /showManualCenter: boolean/, 'the map accepts an explicit manual-centre marker flag');
assert.match(map, /const showPositionMarker = searchScope === 'radius' \|\| showCurrentLocation \|\| showManualCenter;/, 'GPS and long-press pins remain visible in viewport mode');
assert.match(map, /showManualMarker: true/, 'long-press selection explicitly requests its static marker');
assert.match(map, /showPositionMarker && <Marker position=\{\[position\.lat, position\.lng\]\} icon=\{positionMarkerIcon\} zIndexOffset=\{showCurrentLocation \? 10_000 : 1_000\}/, 'the location pin is rendered independently of the 2 km circle and stays above dense facility markers');
assert.match(filters, /searchScope === 'viewport'/);
assert.match(filters, /aria-pressed=\{searchScope === 'viewport'\}/);
assert.match(filters, /switchToViewportScope/);
console.log('Map scope OK: radius remains distinct, visible bounds update from Leaflet, and edge/antimeridian filtering is covered.');
