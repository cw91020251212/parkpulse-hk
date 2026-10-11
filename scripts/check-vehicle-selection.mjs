import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [filters, app, copy, styles] = await Promise.all([
  readFile(new URL('../src/components/Filters.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/i18n.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);

assert.match(filters, /onClick=\{\(\) => onVehicleChange\(type === vehicleType \? null : type\)\}/);
assert.match(filters, /aria-pressed=\{type === vehicleType\}/);
assert.match(filters, /\(\['toilets', 'fuel', 'atm'\] as const\)/);
assert.match(app, /useState<VehicleType \| null>\(\(\) => readPreferences\(\)\.vehicleType\)/);
assert.match(app, /saved\.vehicleType === null \? null/);
assert.match(app, /if \(!vehicleType\) return \[\];/);
assert.match(app, /!facilityMode && !vehicleType && <div className="empty-state">/);
assert.match(copy, /vehicleNotSelected: '未選擇車種'/);
assert.match(copy, /vehicleNotSelected: 'No vehicle type selected'/);
assert.match(styles, /--filter-control-height: 34px;/, 'All filter chips and height controls use the shorter height');
assert.match(styles, /\.chip,\s*\.height-select,\s*\.height-select select\s*\{\s*font-size: 14px;/, 'Filter text remains at 14px');

console.log('Vehicle selection can be cleared, the empty state is persisted and explicit, and facility filters remain available.');
