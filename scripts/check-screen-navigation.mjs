import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ScreenHistory } from '../src/domain/screenHistory.ts';
class MemoryHistory {
  items = [{ external: 'preserved' }]; index = 0; requested = null;
  get state() { return this.items[this.index]; }
  pushState(state) { this.items.splice(++this.index); this.items.push(state); }
  replaceState(state) { this.items[this.index] = state; }
  go(delta) { this.requested = delta; }
  finish(nav) { this.index += this.requested; this.requested = null; nav.handlePop(this.state); }
}
const port = new MemoryHistory();
const nav = new ScreenHistory(port, 'test');
const closed = [];
const open = (name) => nav.open(name, () => closed.push(name));
open('map'); open('results'); open('detail');
nav.close(); nav.close();
assert.equal(port.requested, -1, 'double taps consume only one history entry');
assert.equal(nav.depth, 3, 'closing is atomic with the browser popstate');
port.finish(nav);
assert.deepEqual(closed, ['detail']);
assert.ok(nav.has('results') && nav.has('map'));
nav.close('results'); port.finish(nav);
assert.ok(nav.isTop('map'));
open('atm-banks'); nav.close('atm-banks'); port.finish(nav);
assert.ok(nav.isTop('map'), 'closing picker restores its original map');
nav.close('map'); port.finish(nav);
assert.equal(nav.depth, 0);
assert.equal(port.index, 0, 'explicit closes leave no ghost entries before root');
nav.close(); assert.equal(port.requested, null, 'root Back is not trapped');
open('atm-banks');
assert.ok(nav.replace('atm-banks', 'map', () => closed.push('map-from-picker')));
assert.ok(!nav.has('atm-banks') && nav.isTop('map'));
nav.close(); port.finish(nav);
assert.equal(port.index, 0, 'Done replaces picker rather than leaving dead selection in history');
open('map'); open('popup'); open('detail');
nav.close(); port.finish(nav);
assert.ok(nav.isTop('popup'), 'detail Back retains the Leaflet popup');
nav.close(); port.finish(nav);
assert.ok(nav.isTop('map'), 'second Back closes only popup');
nav.close(); port.finish(nav);
for (const name of ['settings','help','disclaimer','district','legend','results','detail','atm-banks','water-options','map','popup']) {
  assert.ok(open(name)); nav.close(); port.finish(nav); assert.equal(nav.depth, 0, `${name} has a working Back exit`);
}
open('map'); open('popup'); open('detail');
nav.retire('popup');
assert.equal(port.requested, null, 'a disappearing popup never dismisses the live detail above it');
nav.close('detail'); port.finish(nav);
assert.equal(port.requested, -1, 'dead popup is automatically removed when revealed');
port.finish(nav);
assert.ok(nav.isTop('map'));
nav.close(); port.finish(nav);
open('detail'); open('atm-banks'); nav.retire('detail');
assert.ok(nav.isTop('atm-banks'));
assert.equal(port.requested, null, 'invalidation does not close newer bank choices');
nav.close('atm-banks'); port.finish(nav); port.finish(nav);
assert.equal(nav.depth, 0, 'invalid ancestor cleans itself once child exits');
assert.equal(port.state.external, 'preserved', 'unrelated history fields are retained');
const [app, css, filter, main, map] = await Promise.all([
  'src/App.tsx', 'src/ScreenNavigation.css', 'src/components/AtmBankFilter.tsx', 'src/main.tsx', 'src/components/MapView.tsx',
].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
assert.match(main, /ScreenNavigationProvider/);
assert.match(app, /onComplete=\{completeAtmPicker\}/);
assert.doesNotMatch(app, /className="atm-bank-summary"/);
assert.match(app, /onEditFacility=\{editFacility\}/);
assert.match(app, /navigation\.open\('water-options'/);
assert.match(app, /navigation\.replace\('map-tools', 'water-options'/);
assert.match(app, /map-screen-tools/);
assert.match(app, /onClose=\{closeFacilityDetail\}/);
assert.match(css, /\.app-shell\.map-focus \.desktop-controls \{ display: none !important;/);
assert.match(css, /\.detail-close-bar \{ position: sticky;/);
assert.match(css, /height: 100dvh/);
assert.match(filter, /atm-bank-picker__complete/);
assert.match(filter, /atm-bank-multiselect__count/);
assert.match(map, /navigation\.open\('popup'/);
console.log('Screen navigation OK: nested Back, explicit exits, double-tap guard, picker→map replacement, popup/detail order and all screen types.');
