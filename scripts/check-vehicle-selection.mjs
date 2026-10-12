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
assert.match(filters, /!vehicleType && \(\['toilets', 'fuel', 'atm', 'aed', 'emergency', 'border', 'hkjc'\] as const\)/, 'Independent facility buttons are only shown while no vehicle is selected');
assert.match(filters, /mode === 'aed' \? text\(language, 'aed'\)/);
assert.match(app, /useState<VehicleType \| null>\(\(\) => readPreferences\(\)\.vehicleType\)/);
assert.match(app, /saved\.vehicleType === null \? null/);
assert.match(app, /const facilityMode = \['toilets', 'fuel', 'atm', 'aed', 'emergency', 'border', 'hkjc', 'onStreet'\]/, 'Persisted HKJC mode remains valid');
assert.match(app, /vehicleType: facilityMode && facilityMode !== 'onStreet' \? null : vehicleType/, 'Legacy simultaneous facility and vehicle preferences open in facility mode');
assert.match(app, /if \(!vehicleType\) return \[\];/);
assert.match(app, /useOnStreetParking\(facilityMode === 'onStreet' && vehicleType !== null && vehicleType !== 'motorCycle'\)/);
assert.match(app, /facilityMode !== 'onStreet' \|\| !vehicleType \|\| activeVehicleType === 'motorCycle'/);
assert.match(app, /facilityMode !== 'onStreet' \|\| vehicleType !== 'motorCycle'/);
assert.match(app, /const onStreetResultLabel = !vehicleType \? text\(language, 'vehicleNotSelected'\)/);
assert.match(app, /!vehicleType \? 'vehicleNotSelected' : showingMotorcycleOnStreet \? 'noMotorcycleOnStreet'/);
assert.match(app, /!vehicleType \? 'vehicleSelectionHint' : 'tryAnotherArea'/);
assert.match(app, /!facilityMode && !vehicleType && <div className="empty-state">/);
assert.match(app, /setFacilityMode\(mode\); if \(mode && mode !== 'onStreet'\) setVehicleType\(null\);/, 'Choosing an independent facility clears the selected vehicle');
assert.match(app, /const updateVehicleType = \(vehicle: VehicleType \| null\) => \{ if \(\(vehicle && facilityMode && facilityMode !== 'onStreet'\) \|\| \(!vehicle && facilityMode === 'onStreet'\)\) updateFacilityMode\(null\); setVehicleType\(vehicle\); \}/, 'Choosing a vehicle returns to parking mode and clearing it closes vehicle-specific roadside mode');
assert.match(app, /onVehicleChange=\{updateVehicleType\}/, 'Vehicle buttons use the mode-switching handler');
assert.match(copy, /vehicleNotSelected: '未選擇車種'/);
assert.match(copy, /vehicleNotSelected: 'No vehicle type selected'/);
assert.match(styles, /--filter-control-height: 32px;/, 'All filter chips and height controls use the shorter height');
assert.match(styles, /\.chip,\s*\.height-select,\s*\.height-select select\s*\{\s*font-size: 14px;/, 'Filter text remains at 14px');

console.log('Vehicle and independent facility modes are mutually exclusive; parking conditions and vehicle-specific roadside parking remain intact.');
