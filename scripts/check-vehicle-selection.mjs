import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [filters, app, copy, styles] = await Promise.all([
  readFile(new URL('../src/components/Filters.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/i18n.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
]);

assert.match(filters, /export type FilterSection = 'parking' \| 'facilities'/);
assert.match(filters, /onClick=\{\(\) => onVehicleChange\(type === vehicleType \? null : type\)\}/);
assert.match(filters, /aria-pressed=\{type === vehicleType\}/);
assert.match(filters, /section === 'parking' \?/);
assert.match(filters, /section === 'facilities'/);
assert.match(filters, /FACILITY_MODES = \['toilets', 'fuel', 'atm', 'aed', 'emergency', 'border', 'hkjc'\] as const/);
assert.doesNotMatch(filters, /!vehicleType && \(\['toilets'/, 'Facility choices are not mixed into the parking filters');
assert.match(filters, /onClick=\{\(\) => onSectionChange\('facilities'\)\}/);
assert.match(filters, /facilityMode === 'onStreet'/, 'On-street parking remains in the parking section');

assert.match(app, /useState<VehicleType \| null>\(\(\) => readPreferences\(\)\.vehicleType\)/);
assert.match(app, /saved\.vehicleType === null \? null/);
assert.match(app, /const facilityMode = \['toilets', 'fuel', 'atm', 'aed', 'emergency', 'border', 'hkjc', 'onStreet'\]/, 'Persisted HKJC and roadside modes remain valid');
assert.match(app, /vehicleType: facilityMode && facilityMode !== 'onStreet' \? null : vehicleType/, 'Legacy simultaneous facility and vehicle preferences open without both modes');
assert.match(app, /const \[filterSection, setFilterSection\] = useState<FilterSection>/);
assert.match(app, /const changeFilterSection = \(section: FilterSection\)/);
assert.match(app, /updateFacilityMode\(null\);\s*setVehicleType\(null\);\s*setFilterSection\(section\)/, 'Changing sections clears the selected facility and vehicle rather than restoring an old mode');
assert.match(app, /setFilterSection\('facilities'\)/, 'Selecting a facility opens the facilities section');
assert.match(app, /setFilterSection\('parking'\)/, 'Selecting a vehicle or roadside parking returns to Parking');
assert.match(app, /filterSection === 'facilities' \? 'facilityNotSelected' : 'vehicleNotSelected'/);
assert.match(app, /if \(!vehicleType\) return \[\];/);
assert.match(app, /useOnStreetParking\(facilityMode === 'onStreet' && vehicleType !== null && vehicleType !== 'motorCycle'\)/);
assert.match(app, /facilityMode !== 'onStreet' \|\| !vehicleType \|\| activeVehicleType === 'motorCycle'/);
assert.match(app, /onVehicleChange=\{updateVehicleType\}/);
assert.match(app, /onSectionChange=\{changeFilterSection\}/);

for (const value of ['泊車', '附近設施', '請在上方選擇洗手間、AED、油站等附近設施。', '請選擇車種以查看附近停車場空位。', 'Parking', 'Nearby facilities', 'Choose a nearby facility above—washrooms, AEDs, fuel and more.', 'Select a vehicle type to view nearby parking availability.']) {
  assert.ok(copy.includes(value), `Missing bilingual navigation or empty-state copy: ${value}`);
}
assert.match(styles, /\.filter-mode-switch/);
assert.match(styles, /\.facility-mode-grid/);

console.log('Parking and nearby facilities use separate sections; section switches clear the other selection, while roadside parking stays with vehicles.');
