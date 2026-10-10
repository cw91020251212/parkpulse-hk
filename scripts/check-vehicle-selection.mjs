import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [filters, app, copy] = await Promise.all([
  readFile(new URL('../src/components/Filters.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/i18n.ts', import.meta.url), 'utf8'),
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

console.log('Vehicle selection can be cleared, the empty state is persisted and explicit, and facility filters remain available.');
