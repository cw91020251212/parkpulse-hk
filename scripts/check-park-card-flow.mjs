import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const cache = new Map();

// Transpile the existing TS/TSX modules in memory; never start a browser or server.
function loadTs(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  const localRequire = (specifier) => {
    if (specifier.endsWith('.css')) return {};
    if (!specifier.startsWith('.')) return require(specifier);
    const base = resolve(dirname(filename), specifier);
    const target = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate));
    assert(target, `Cannot resolve ${specifier} from ${filename}`);
    return loadTs(target);
  };
  new Function('require', 'module', 'exports', outputText)(localRequire, module, module.exports);
  return module.exports;
}

const { ParkCard } = loadTs(resolve(root, 'src/components/ParkCard.tsx'));
const { text } = loadTs(resolve(root, 'src/i18n.ts'));
const source = readFileSync(resolve(root, 'src/components/ParkCard.tsx'), 'utf8');
const css = readFileSync(resolve(root, 'src/components/ParkCardReadability.css'), 'utf8');
const legacy = readFileSync(resolve(root, 'src/styles.css'), 'utf8');
assert.match(source, /import '\.\/ParkCardReadability\.css';/);

function descendants(node, ancestors = []) {
  if (Array.isArray(node)) return node.flatMap((child) => descendants(child, ancestors));
  if (!node || typeof node !== 'object' || !node.props) return [];
  return [{ node, ancestors }, ...descendants(node.props.children, [...ancestors, node])];
}
function byClass(tree, name) {
  return descendants(tree).filter(({ node }) => node.props.className?.split(' ').includes(name));
}
function contents(node) {
  if (Array.isArray(node)) return node.map(contents).join('');
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  return typeof node === 'object' ? contents(node.props?.children) : String(node);
}

const name = '長名稱停車場及社區設施／Very long official car park name '.repeat(4);
const address = '九龍長沙灣道與多個街道交界／Long official address '.repeat(4);
const labels = { 'zh-Hant': '官方來源及長備註'.repeat(16), en: 'Long official source label '.repeat(16) };
const baseInfo = {
  park_Id: 'flow-regression', name, displayAddress: address,
  latitude: 22.3, longitude: 114.1,
  googleRating: { rating: 4.3, userRatingCount: 241, placeUrl: 'https://maps.google.com/?cid=123' },
  privateCar: { space: 321, hourlyCharges: [{ price: 28 }] }, motorCycle: { space: 0 },
  facilities: ['evCharger', 'disabilities'], paymentMethods: ['octopus'],
};
const baseStatus = { kind: 'unknown', noLiveData: true, stale: false, updatedAt: new Date('2026-11-01T03:00:00Z') };
let selections = 0;
const onSelect = () => { selections += 1; };
let cases = 0;
for (const language of ['zh-Hant', 'en']) {
  for (const variant of ['official-no-live', 'snapshot', 'operator', 'official-pricing', 'unknown', 'no-note']) {
    const info = structuredClone(baseInfo);
    const status = { ...baseStatus };
    if (variant === 'official-no-live') info.officialSource = { availability: 'not-provided', sourceLabel: labels, sourceUrl: 'https://example.com/source' };
    if (variant === 'snapshot') {
      info.officialSource = { availability: 'snapshot', sourceLabel: labels, sourceUrl: 'https://example.com/source' };
      Object.assign(status, { kind: 'count', count: 12, noLiveData: false });
    }
    if (variant === 'operator') info.operatorRates = { privateCar: { cardSummary: { 'zh-Hant': '營辦商官方完整價目 '.repeat(30), en: 'Complete official operator rates '.repeat(30) } } };
    if (variant === 'official-pricing') {
      info.privateCar.hourlyCharges = [];
      info.heightLimits = [{ remark: '私家車月租 $2200' }];
    }
    if (variant === 'no-note') Object.assign(status, { kind: 'count', count: 2, noLiveData: false });
    for (const vehicleType of ['privateCar', 'motorCycle']) {
      for (const lastViewed of [false, true]) {
        const tree = ParkCard({ language, park: { info, status, distanceKm: 1.23, heightLimit: 2.1 }, vehicleType, selected: lastViewed, lastViewed, onSelect });
        const [{ node: button }] = byClass(tree, 'park-card-select');
        const [{ node: rating, ancestors: ratingParents }] = byClass(tree, 'park-card-rating');
        const [{ node: navigation, ancestors: navigationParents }] = byClass(tree, 'nav-link');
        assert.equal(button.type, 'button');
        assert.equal(button.props.type, 'button');
        assert.equal(button.props.onClick, onSelect);
        button.props.onClick();
        assert.equal(button.props['aria-current'], lastViewed ? 'true' : undefined);
        assert.equal(button.props['aria-label'].includes(text(language, 'lastViewed')), lastViewed);
        assert.equal(tree.props.className.includes('is-last-viewed'), lastViewed);
        assert.equal(tree.props.className.includes('is-selected'), lastViewed);
        assert(contents(button).includes(name), 'complete name retained');
        assert(contents(button).includes(address), 'complete address retained');
        assert.equal(contents(byClass(tree, 'total-spaces')[0].node), `${text(language, 'totalSpaces')} ${vehicleType === 'motorCycle' ? 0 : 321}`);
        assert.equal(rating.type, 'a');
        assert.equal(rating.props.href, info.googleRating.placeUrl);
        assert.equal(rating.props.target, '_blank');
        assert.equal(rating.props.rel, 'noreferrer');
        assert.equal(contents(rating), '★ 4.3');
        assert(!ratingParents.includes(button), 'rating is outside the detail button');
        assert(!rating.props.onClick, 'rating does not trigger selection');
        assert.equal(navigation.type, 'a');
        assert.equal(navigation.props.href, 'https://www.google.com/maps/dir/?api=1&destination=22.3,114.1');
        assert.equal(navigation.props.target, '_blank');
        assert(!navigationParents.includes(button));
        assert(!navigation.props.onClick);
        const notes = byClass(tree, 'card-note');
        assert.equal(notes.length, variant === 'no-note' ? 0 : 1);
        if (notes.length) {
          assert(notes[0].ancestors.includes(button), 'note clicks bubble to original onSelect button');
          assert.equal(descendants(button).at(-1).node, notes[0].node, 'note is the final detail content row');
          if (info.officialSource) assert(contents(notes[0].node).includes(labels[language]), 'long source label is complete');
        }
        if (variant === 'operator' && vehicleType === 'privateCar') assert.equal(contents(byClass(tree, 'card-pricing-summary')[0].node), info.operatorRates.privateCar.cardSummary[language]);
        if (variant === 'official-pricing' && vehicleType === 'privateCar') assert(contents(byClass(tree, 'card-pricing-summary')[0].node).includes('私家車月租 $2200'));
        const html = renderToStaticMarkup(tree);
        assert(!/<button\b[^>]*>[\s\S]*?<a\b[\s\S]*?<\/button>/.test(html), 'rendered button never contains a link');
        cases += 1;
      }
    }
  }
}
const withoutRating = ParkCard({ language: 'en', park: { info: { ...baseInfo, googleRating: undefined }, status: baseStatus, distanceKm: 0 }, vehicleType: 'privateCar', selected: false, lastViewed: false, onSelect });
assert.equal(byClass(withoutRating, 'park-card-rating').length, 0);
assert.equal(selections, cases, 'all detail callbacks remain wired');

function declarations(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  assert(match, `Missing scoped CSS selector: ${selector}`);
  return match[1];
}
const ratingStyle = declarations('article.park-card > .park-card-main > .park-card-rating');
assert.match(ratingStyle, /position:\s*static\s*;/);
assert.match(ratingStyle, /inset:\s*auto\s*;/);
assert.match(ratingStyle, /z-index:\s*auto\s*;/);
assert.match(ratingStyle, /margin:\s*0 11px 13px auto\s*;/);
const noteStyle = declarations('article.park-card > .park-card-main > .park-card-select > .card-note');
assert.match(noteStyle, /position:\s*static\s*;/);
assert.match(noteStyle, /overflow-wrap:\s*anywhere\s*;/);
assert.match(noteStyle, /white-space:\s*normal\s*;/);
const buttonStyle = declarations('article.park-card > .park-card-main > .park-card-select');
assert.match(buttonStyle, /grid-template-rows:\s*none\s*;/);
assert.match(buttonStyle, /grid-auto-rows:\s*max-content\s*;/);
assert.match(buttonStyle, /min-height:\s*0\s*;/);
assert.match(declarations('article.park-card .park-card-select .card-heading p'), /padding-right:\s*0\s*;/);
for (const [, selector, body] of legacy.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  if (selector.includes('.park-card-rating') && !selector.includes(':has(')) {
    assert(!/position\s*:[^;]*!important/.test(body), 'legacy rating gained !important: review component override priority');
  }
}
console.log(`ParkCard flow OK: ${cases} bilingual/vehicle/recent-view variants, total spaces (including 0), official/operator pricing, long source notes, independent Google/navigation links, callback wiring and scoped normal-flow CSS. Static/render checks only; no browser geometry tested.`);
