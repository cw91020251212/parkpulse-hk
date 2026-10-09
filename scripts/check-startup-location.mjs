import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert.match(source, /navigator\.geolocation\.getCurrentPosition/);
assert.match(source, /startupLocationRequested\.current = true; requestLocation\('startup'\)/);
assert.match(source, /maximumAge: 0/);
assert.match(source, /enableHighAccuracy: false/);
assert.match(source, /const \[startupLocationPending, setStartupLocationPending\] = useState\(true\)/);
assert.match(source, /startupLocationPending \? <section className="results-panel"/);
assert.match(source, /startupLocationFlight, setStartupLocationFlight/);
assert.match(source, /startupLocating=\{startupLocationPending\} startupRecenter=\{startupLocationFlight\}/);
assert.match(source, /if \(source === 'startup'\) \{ setStartupLocationFlight\(/);
assert.match(source, /if \(source === 'startup' && hasManualCentreSelection\.current\) return;/);
assert.match(source, /const selectArea = .*hasManualCentreSelection\.current = true/s);
assert.doesNotMatch(source, /watchPosition/);

console.log('Startup location starts high above Hong Kong, hides default results, flies to the fresh location, and preserves manual selection.');
