import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { countWaterEnvironments, matchesWaterEnvironment } from '../src/domain/drinkingWater.ts';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const water = (indoorOutdoor, unitCount = null) => ({
  kind: 'drinkingWater', drinkingWater: { indoorOutdoor, unitCount },
});
let fixtureChecks = 0;
function check(name, items, expected) {
  assert.deepEqual(countWaterEnvironments(items), expected, name);
  fixtureChecks += 1;
}

check('empty input retains every zero', [], { all: 0, indoor: 0, outdoor: 0 });
check('unknown belongs only to all', [water('unknown')], { all: 1, indoor: 0, outdoor: 0 });
check('missing drinkingWater belongs only to all', [{ kind: 'drinkingWater' }], { all: 1, indoor: 0, outdoor: 0 });
check('explicit undefined drinkingWater belongs only to all', [{ kind: 'drinkingWater', drinkingWater: undefined }], { all: 1, indoor: 0, outdoor: 0 });
check('missing classification belongs only to all', [{ kind: 'drinkingWater', drinkingWater: {} }], { all: 1, indoor: 0, outdoor: 0 });
check('non-water records never contribute, even with water info', [
  { kind: 'atm', drinkingWater: { indoorOutdoor: 'indoor' } },
  { kind: 'fuel', drinkingWater: { indoorOutdoor: 'outdoor' } },
  { kind: 'toilet' },
], { all: 0, indoor: 0, outdoor: 0 });
check('indoor leaves outdoor at zero', [water('indoor')], { all: 1, indoor: 1, outdoor: 0 });
check('outdoor leaves indoor at zero', [water('outdoor')], { all: 1, indoor: 0, outdoor: 1 });
check('zero units is still one location record', [water('indoor', 0)], { all: 1, indoor: 1, outdoor: 0 });
check('multiple or unpublished units never change location counts', [
  water('indoor', 12), water('outdoor', 3), water('unknown', null),
], { all: 3, indoor: 1, outdoor: 1 });

const mixed = [
  water('indoor', 5), water('indoor', 0), water('outdoor', 20),
  water('unknown', null), { kind: 'drinkingWater' },
  { kind: 'drinkingWater', drinkingWater: {} },
  { kind: 'atm', drinkingWater: { indoorOutdoor: 'outdoor' } },
];
check('mixed records count only explicitly known environments', mixed, { all: 6, indoor: 2, outdoor: 1 });
for (const environment of ['all', 'indoor', 'outdoor']) {
  const matching = mixed.filter((item) => item.kind === 'drinkingWater'
    && matchesWaterEnvironment(environment, item.drinkingWater));
  assert.equal(countWaterEnvironments(mixed)[environment], matching.length, `matchesWaterEnvironment parity: ${environment}`);
}
fixtureChecks += 1;

function* once() {
  yield water('indoor');
  yield { kind: 'drinkingWater' };
  yield water('outdoor');
  yield { kind: 'atm' };
}
check('single-pass generator input', once(), { all: 3, indoor: 1, outdoor: 1 });
check('non-array iterable input', new Set([water('indoor'), water('unknown')]), { all: 2, indoor: 1, outdoor: 0 });

const frozen = Object.freeze([
  Object.freeze({ kind: 'drinkingWater', drinkingWater: Object.freeze({ indoorOutdoor: 'indoor', unitCount: 7 }) }),
  Object.freeze({ kind: 'drinkingWater' }),
  Object.freeze({ kind: 'atm' }),
]);
const frozenBefore = JSON.stringify(frozen);
check('frozen input is accepted without mutation', frozen, { all: 2, indoor: 1, outdoor: 0 });
assert.equal(JSON.stringify(frozen), frozenBefore, 'input and nested water info must not change');
const first = countWaterEnvironments(frozen);
first.all = 999;
assert.deepEqual(countWaterEnvironments(frozen), { all: 2, indoor: 1, outdoor: 0 }, 'results must be independent objects');
fixtureChecks += 1;

check('unitCount must not even be read', [{
  kind: 'drinkingWater',
  drinkingWater: {
    indoorOutdoor: 'outdoor',
    get unitCount() { throw new Error('location counts must not inspect machine totals'); },
  },
}], { all: 1, indoor: 0, outdoor: 1 });

const scopedInput = [
  { ...water('indoor'), distanceKm: 1 },
  { ...water('outdoor'), distanceKm: 1.5 },
  { ...water('outdoor'), distanceKm: 3 },
];
const candidates = scopedInput.filter((item) => item.distanceKm <= 2);
check('caller-scoped candidates retain all environments before selection', candidates, { all: 2, indoor: 1, outdoor: 1 });

const snapshots = await Promise.all(['lcsd', 'afcd', 'mtr'].map(async (provider) => ({
  provider,
  ...JSON.parse(await read(`public/pages-data/${provider}-drinking-water.json`)),
})));
const records = snapshots.flatMap((snapshot) => snapshot.records);
assert.equal(records.length, 1094, 'current three-source location snapshot baseline');
assert.ok(records.some((record) => record.unitCount > 1), 'real input must include multiple machines at one location');
assert.ok(records.some((record) => record.unitCount === null), 'real input must include unpublished machine totals');
const toFacilities = (rows) => rows.map((record) => ({
  kind: 'drinkingWater', drinkingWater: record,
}));
const expected = (rows) => ({
  all: rows.length,
  indoor: rows.filter((record) => record.indoorOutdoor === 'indoor').length,
  outdoor: rows.filter((record) => record.indoorOutdoor === 'outdoor').length,
});
const recordsBefore = JSON.stringify(records);
for (const snapshot of snapshots) {
  assert.deepEqual(countWaterEnvironments(toFacilities(snapshot.records)), expected(snapshot.records), `${snapshot.provider} real snapshot`);
}
const actual = countWaterEnvironments(toFacilities(records));
assert.deepEqual(actual, expected(records), 'combined real snapshot counts locations, not unitCount');
assert.equal(JSON.stringify(records), recordsBefore, 'real snapshot records must remain unmodified');

// Lightweight component contract checks; no browser, App wiring or i18n changes.
const picker = await read('src/components/WaterEnvironmentPicker.tsx');
assert.match(picker, /counts:\s*WaterEnvironmentCounts/);
assert.match(picker, /scopeLabel:\s*string/);
assert.match(picker, /text\(language, 'waterCountScope', \{ scope: scopeLabel \}\)/);
assert.match(picker, /<p id=\{scopeId\}/);
assert.equal((picker.match(/aria-describedby=\{scopeId\}/g) ?? []).length, 2, 'dialog and radiogroup describe scope/units');
assert.match(picker, /data-environment-count=\{option\.value\}/, 'stable count selector for browser regression checks');
assert.match(picker, /\(\{counts\[option\.value\]\}\)/, 'counts are unconditional, including zero');
assert.doesNotMatch(picker, /counts\[option\.value\]\s*&&/, 'zero counts must not be hidden');
assert.match(picker, /onChange\(environment\);\s*onClose\(\);/, 'selection still changes value before closing');
assert.match(picker, /if \(value === option\.value\) choose\(option\.value\)/, 'selecting checked radio still finishes');
const css = await read('src/components/WaterEnvironmentPicker.css');
assert.match(css, /\.water-environment-picker\s*\{[^}]*max-height:\s*100%/);
assert.match(css, /\.water-environment-picker\s*\{[^}]*overflow-y:\s*auto/, 'whole dialog can scroll on short/zoomed screens');
assert.doesNotMatch(css, /position:\s*sticky/, 'no persistent picker header added');

console.log(`Water environment counts OK: ${fixtureChecks} fixture checks; 3 real snapshots (${snapshots.map((snapshot) => `${snapshot.provider}=${snapshot.records.length}`).join(', ')}); all=${actual.all}, indoor=${actual.indoor}, outdoor=${actual.outdoor} location records; Picker scope/count/accessibility/scroll contracts OK. No machine totals inferred.`);
