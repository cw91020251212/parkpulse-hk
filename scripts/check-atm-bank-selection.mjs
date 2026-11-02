import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ATM_RESULT_LIMIT,
  countAtmBanks,
  filterAtmBankOptions,
  matchesAtmBank,
  normalizeAtmSelectedBanks,
  readAtmSelectedBanks,
  selectAtmBankResults,
  shortBankName,
  toggleAtmBank,
} from '../src/domain/atmBanks.ts';

const bankA = '甲銀行(香港)有限公司';
const bankB = '乙銀行有限公司';
const bankC = 'Gamma Bank Limited';

assert.deepEqual(readAtmSelectedBanks({ atmBank: bankA }), [bankA], 'legacy single-bank preference migrates');
assert.deepEqual(readAtmSelectedBanks({ atmBank: '' }), [], 'legacy all-banks preference remains all banks');
assert.deepEqual(readAtmSelectedBanks({ atmBank: ` ${bankA} ` }), [bankA]);
assert.deepEqual(readAtmSelectedBanks({ atmSelectedBanks: [bankB], atmBank: bankA }), [bankB], 'new array takes precedence');
assert.deepEqual(readAtmSelectedBanks({ atmSelectedBanks: [], atmBank: bankA }), [], 'explicitly empty new array never falls back to the legacy bank');
assert.deepEqual(readAtmSelectedBanks({ atmSelectedBanks: null, atmBank: bankA }), [], 'malformed new preference safely resets instead of resurrecting a legacy choice');
assert.deepEqual(readAtmSelectedBanks({ atmSelectedBanks: [bankA, 4, null, '', '  ', bankA, bankB] }), [bankA, bankB]);
for (const value of [null, undefined, {}, 'bank', 123]) assert.deepEqual(readAtmSelectedBanks(value), []);
assert.deepEqual(normalizeAtmSelectedBanks([bankA, ` ${bankA} `, bankB, {}, false]), [bankA, bankB]);

const one = Object.freeze([bankA]);
assert.deepEqual(toggleAtmBank([], bankA), [bankA]);
assert.deepEqual(toggleAtmBank(one, bankB), [bankA, bankB], 'another bank is added without replacing the first');
assert.deepEqual(toggleAtmBank([bankA, bankB], bankA), [bankB], 'individual banks can be cancelled');
assert.deepEqual(toggleAtmBank(one, bankA), [], 'cancelling the final bank returns to all banks');
assert.deepEqual(toggleAtmBank(one, '  '), [bankA]);
assert.deepEqual(one, [bankA], 'toggle does not mutate its input');
assert.equal(matchesAtmBank(undefined, []), true, 'all banks also includes records without a brand');
assert.equal(matchesAtmBank(undefined, [bankA]), false);
assert.equal(matchesAtmBank(bankA, [bankA, bankB]), true);
assert.equal(matchesAtmBank(bankB, [bankA, bankB]), true);
assert.equal(matchesAtmBank(bankC, [bankA, bankB]), false, 'selection is an OR union, not inferred network compatibility');
assert.equal(shortBankName(bankA), '甲銀行');
assert.deepEqual(filterAtmBankOptions([bankA, bankB, bankC], '甲'), [bankA]);
assert.deepEqual(filterAtmBankOptions([bankA, bankB, bankC], ' GAmMa bank '), [bankC], 'bank-name search is case-insensitive');
assert.deepEqual(filterAtmBankOptions([bankA, bankB, bankC], 'ＧＡＭＭＡ'), [bankC], 'full-width Latin text is supported');
assert.deepEqual(filterAtmBankOptions([bankA, bankB], 'nothing'), []);
assert.deepEqual(filterAtmBankOptions([bankA, bankB], '  '), [bankA, bankB]);

const candidates = Object.freeze(Array.from({ length: 90 }, (_, index) => Object.freeze({
  facility: Object.freeze({ id: `atm-${index}`, kind: 'atm', brand: index < 60 ? bankA : bankB }),
  distanceKm: (90 - index) / 100,
  onSelect: () => index,
})));
const counts = countAtmBanks(candidates);
assert.equal(counts.get(bankA), 60, 'per-bank counts use all in-scope candidates, not the first 50');
assert.equal(counts.get(bankB), 30);
assert.equal(ATM_RESULT_LIMIT, 50);
const all = selectAtmBankResults(candidates, []);
assert.equal(all.total, 90);
assert.equal(all.items.length, 50);
assert.equal(all.items[0].facility.id, 'atm-89', 'nearest ATM is first even if the source is not sorted');
assert.equal(all.items.at(-1).facility.id, 'atm-40');
assert.equal(all.items[0].onSelect(), 89, 'map/detail callbacks survive filtering');
const union = selectAtmBankResults(candidates, [bankA, bankB]);
assert.deepEqual(union.items, all.items);
assert.equal(union.total, 90, 'matching total is retained independently of the render limit');
const onlyA = selectAtmBankResults(candidates, [bankA]);
assert.equal(onlyA.total, 60);
assert.equal(onlyA.items.length, 50, 'the 50-result limit applies after bank matching');
assert.equal(onlyA.items[0].facility.id, 'atm-59');
const onlyB = selectAtmBankResults(candidates, [bankB]);
assert.equal(onlyB.total, 30);
assert.equal(onlyB.items.length, 30);
assert.equal(candidates[0].facility.id, 'atm-0', 'sorting must not mutate the shared candidate array');
const fifty = selectAtmBankResults(candidates.slice(0, 50), []);
assert.equal(fifty.total, fifty.items.length, 'exactly 50 matches must not imply omitted records');
assert.deepEqual(selectAtmBankResults(candidates, ['Unknown Bank']), { items: [], total: 0 });
const missingBrand = { facility: { id: 'unbranded', kind: 'atm' }, distanceKm: 0 };
const otherMode = { facility: { id: 'fuel', kind: 'fuel', brand: bankA }, distanceKm: 0 };
assert.equal(selectAtmBankResults([missingBrand, otherMode], []).total, 1, 'non-ATM facilities do not leak into ATM results');
assert.equal(countAtmBanks([missingBrand, otherMode]).size, 0);
assert.equal(selectAtmBankResults([missingBrand], [bankA]).total, 0);
const saved = JSON.parse(JSON.stringify({ atmSelectedBanks: toggleAtmBank([bankA], bankB) }));
assert.deepEqual(readAtmSelectedBanks(saved), [bankA, bankB], 'a reload restores multiple selected banks');
assert.deepEqual(readAtmSelectedBanks(JSON.parse(JSON.stringify({ atmSelectedBanks: [] }))), []);

const [app, component, css] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/AtmBankFilter.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/AtmBankFilter.css', import.meta.url), 'utf8'),
]);
assert.match(app, /const \[atmSelectedBanks, setAtmSelectedBanks\] = useState<string\[\]>/);
assert.match(app, /const PREFERENCES_KEY = 'parkspot:preferences:v1'/);
assert.match(app, /atmSelectedBanks: readAtmSelectedBanks\(saved\)/);
assert.match(app, /JSON\.stringify\(\{ vehicleType, filters, textScale, facilityMode, atmSelectedBanks, language, searchScope \}\)/);
assert.doesNotMatch(app, /JSON\.stringify\([^\n]*\batmBank\b/);
assert.match(app, /countAtmBanks\(nearbyFacilityCandidates\)/);
assert.match(app, /selectAtmBankResults\(nearbyFacilityCandidates, atmSelectedBanks\)/);
assert.match(app, /const nearbyFacilityCandidates = useMemo[\s\S]*?isWithinSearchScope[\s\S]*?const atmBankCounts/, 'scope filtering precedes bank counts and capping');
assert.match(app, /const activeNearbyResults = showingToilets \? nearbyToilets : showingOnStreet \? nearbyOnStreet : nearbyFacilities/);
assert.match(app, /const mapNearbyItems = [^\n]*activeNearbyResults/);
assert.match(app, /nearbyFacilities\.map\(\(item\) => [^\n]*<NearbyFacilityCard/, 'map and list share the same filtered and capped collection, including when other facility kinds use dedicated cards');
assert.match(app, /if \(navigation\.has\('detail'\) && !detailVisible\) navigation\.retire\('detail'\)/, 'hidden ATM details close via the history-cleaning path');
assert.match(app, /const closeFacilityDetail = useCallback\([\s\S]*?navigation\.close\('detail'\)/);
assert.match(app, /nearbyFacilityTotal > nearbyFacilities\.length/, 'cap notice uses the complete matching total');
assert.match(app, /'atmBankResultLimit', \{ shown: nearbyFacilities\.length, total: nearbyFacilityTotal \}/);
assert.match(app, /scopedTotal=\{nearbyFacilityCandidates\.length\}/);
assert.doesNotMatch(app, /nearbyFacilities\.length === 50/);
assert.match(component, /aria-pressed=\{selectedBanks\.includes\(bank\)\}/);
assert.match(component, /aria-pressed=\{allBanks\}/);
assert.match(component, /onChange\(\[\]\); setQuery\(''\)/, 'one tap restores all banks and clears the option-name query');
assert.match(component, /type="search"[\s\S]*?autoComplete="off"/);
assert.match(component, /filterAtmBankOptions\(banks, query\)/);
assert.match(component, /'atmBankNoMatches'/);
assert.match(component, /bankCounts\.get\(bank\) \?\? 0/);
assert.match(css, /min-height: 48px;/);
assert.match(css, /:focus-visible/);
assert.match(css, /\.atm-bank-picker \.atm-bank-multiselect__options \{[^}]*flex-direction: column;/);
assert.match(component, /atm-bank-multiselect__check/);
assert.match(component, /onClick=\{onClose\}/);
assert.match(component, /onClick=\{onComplete\}/);
assert.match(css, /\.app-shell \.results-heading\.is-bank-filtered h2 \{[^}]*white-space: normal;/, 'multiple bank names can wrap');
console.log('ATM bank selection OK: migration, array precedence, OR union, deselection, search, pre-cap counts, nearest-50 limit, shared map/list, and history cleanup.');
