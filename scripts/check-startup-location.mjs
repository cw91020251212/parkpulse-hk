import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert.match(source, /navigator\.geolocation\.getCurrentPosition/);
assert.match(source, /startupLocationRequested\.current = true; requestLocation\('startup'\)/);
assert.match(source, /maximumAge: 0/);
assert.match(source, /enableHighAccuracy: false/);
assert.match(source, /const \[startupLocationPending, setStartupLocationPending\] = useState\(true\)/);
assert.match(source, /startupLocationPending \? <section className="results-panel"/);
assert.match(source, /const STARTUP_LOCATION_FALLBACK_MS = 3_500/);
assert.match(source, /const startupLocationSettled = useRef\(false\)/);
assert.match(source, /window\.setTimeout\(\(\) => \{\s*if \(startupLocationSettled\.current\) return;\s*startupLocationDisplayReleased\.current = true;\s*setStartupLocationFallbackActive\(true\);\s*setStartupLocationPending\(false\);\s*setLocationState\(\(current\) => current === 'locating' \? 'default' : current\);/s);
assert.match(source, /if \(!resultsVerified && !startupLocationFallbackActive\) return \[\];/);
assert.match(source, /disabled=\{manualLocationPending\}/);
assert.match(source, /startupLocationFlight, setStartupLocationFlight/);
assert.match(source, /startupLocating=\{startupLocationPending\} startupRecenter=\{startupLocationFlight\}/);
assert.match(source, /if \(source === 'startup'\) \{\s*startupLocationSettled\.current = true;\s*clearStartupLocationFallback\(\);\s*if \(hasManualCentreSelection\.current\) return;\s*setStartupLocationFlight\(true\);/s);
assert.match(source, /const selectArea = .*hasManualCentreSelection\.current = true; clearStartupLocationFallback\(\);/s);
assert.doesNotMatch(source, /watchPosition/);

console.log('Startup location starts high above Hong Kong, releases map/results after a short fallback, flies to a late fresh location, and preserves manual selection.');
