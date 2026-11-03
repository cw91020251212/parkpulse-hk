import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [hook, css, app, bank, water, help, disclaimer, closeBar, overlay] = await Promise.all([
  'src/hooks/useOverlayTextScale.ts',
  'src/components/OverlayReadability.css',
  'src/App.tsx',
  'src/components/AtmBankFilter.tsx',
  'src/components/WaterEnvironmentPicker.tsx',
  'src/components/HelpDialog.tsx',
  'src/components/DisclaimerDialog.tsx',
  'src/components/DetailCloseBar.tsx',
  'src/components/ScreenOverlay.tsx',
].map(read));

assert.match(hook, /import ['"]\.\.\/components\/OverlayReadability\.css['"]/);
assert.match(overlay, /createPortal\(children, document\.body\)/);
assert.match(app, /--ui-zoom['"]:\s*String\(textScale\s*\/\s*100\)/);
for (const name of ['results-heading', 'results-list', 'map-marker-legend', 'area-search']) {
  assert.ok(app.includes(name), `App still supplies ${name}`);
}
for (const name of ['header', 'body', 'footer']) {
  assert.ok(bank.includes(`className="atm-bank-picker__${name}"`));
}
for (const name of ['header', 'options']) {
  assert.ok(water.includes(`className="water-environment-picker__${name}"`));
}
for (const source of [help, disclaimer]) {
  for (const name of ['help-dialog-heading', 'help-intro', 'help-steps', 'help-done']) {
    assert.ok(source.includes(`className="${name}"`), `shared help DOM retains ${name}`);
  }
}
assert.match(closeBar, /className="detail-close-bar"/);
assert.match(closeBar, /className="close-detail"/);

// Execute the real transpiled effect with a minimal CSSStyleDeclaration double.
// This exercises normalization/cleanup, not React rendering or browser layout.
class Style {
  values = new Map();
  [Symbol.iterator]() { return this.values.keys(); }
  getPropertyValue(name) { return this.values.get(name)?.[0] ?? ''; }
  getPropertyPriority(name) { return this.values.get(name)?.[1] ?? ''; }
  setProperty(name, value, priority = '') { this.values.set(name, [value, priority]); }
  removeProperty(name) {
    const previous = this.getPropertyValue(name);
    this.values.delete(name);
    return previous;
  }
}
let pendingEffect;
let pendingDependencies;
const exports = {};
const context = vm.createContext({
  exports,
  require(name) {
    if (name === 'react') return { useEffect(effect, dependencies) {
      pendingEffect = effect;
      pendingDependencies = dependencies;
    } };
    if (name.endsWith('/OverlayReadability.css')) return {};
    throw new Error(`Unexpected dependency: ${name}`);
  },
});
const compiled = ts.transpileModule(hook, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
vm.runInContext(compiled, context, { filename: 'useOverlayTextScale.cjs' });
const property = '--overlay-text-scale';
function mount(percentage, style) {
  context.document = style ? { documentElement: { style } } : undefined;
  pendingEffect = undefined;
  exports.useOverlayTextScale(percentage);
  assert.equal(typeof pendingEffect, 'function');
  assert.equal(pendingDependencies.length, 1);
  assert.equal(pendingDependencies[0], percentage);
  return pendingEffect();
}

for (const [percentage, expected] of [
  [-20, '1'], [99, '1'], [100, '1'], [104, '1'], [105, '1.1'],
  [110, '1.1'], [115, '1.2'], [120, '1.2'], [130, '1.3'], [999, '1.3'],
  [NaN, '1'], [Infinity, '1'], [-Infinity, '1'],
]) {
  const style = new Style();
  style.setProperty('--unrelated', 'keep');
  const cleanup = mount(percentage, style);
  assert.equal(style.getPropertyValue(property), expected, `normalize ${percentage}`);
  assert.equal(style.getPropertyPriority(property), '');
  assert.equal(typeof cleanup, 'function');
  cleanup();
  assert.ok(!style.values.has(property), 'remove property that did not exist');
  assert.equal(style.getPropertyValue('--unrelated'), 'keep');
}
const style = new Style();
style.setProperty(property, '1.07', 'important');
let cleanup = mount(110, style);
assert.equal(style.getPropertyValue(property), '1.1');
cleanup();
assert.equal(style.getPropertyValue(property), '1.07');
assert.equal(style.getPropertyPriority(property), 'important');
cleanup = mount(130, style); // dependency update / StrictMode re-setup
assert.equal(style.getPropertyValue(property), '1.3');
cleanup();
assert.deepEqual(style.values.get(property), ['1.07', 'important']);
assert.equal(mount(130, undefined), undefined, 'SSR effect is harmless');

// The centralized sheet is intentionally flat so every scaling boundary can
// be audited. Do not replace this whitelist with a broad descendant selector.
const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...cleanCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, declarations]) => ({
  selectors: selectors.split(',').map((selector) => selector.trim()),
  declarations,
}));
assert.equal(cleanCss.replace(/[^{}]/g, '').length, rules.length * 2, 'flat, balanced CSS');
const scaleBoundaries = new Set([
  'main.app-shell .results-panel.is-fullscreen > .results-heading',
  'main.app-shell .results-panel.is-fullscreen > .results-list',
  'body .detail-backdrop .detail-panel > :not(.detail-close-bar)',
  'body .atm-bank-picker > .atm-bank-picker__header',
  'body .atm-bank-picker > .atm-bank-picker__body',
  'body .atm-bank-picker > .atm-bank-picker__footer',
  'body .water-environment-picker > .water-environment-picker__header',
  'body .water-environment-picker > .water-environment-picker__options',
  'body .help-dialog > .help-intro',
  'body .help-dialog > .help-steps',
  'body .help-dialog > .help-done',
  'body .help-dialog > .help-dialog-heading > div',
  'body .map-marker-legend > span',
  'body .map-marker-legend > .screen-section-heading > *',
  'body .area-search > label',
  'body .area-search > div:not(.screen-section-heading)',
  'body .area-search > small',
  'body .area-search > .screen-section-heading > *',
]);
const seen = new Set();
for (const rule of rules) {
  if (!/(?:^|;)\s*zoom\s*:/.test(rule.declarations)) continue;
  for (const selector of rule.selectors) {
    assert.ok(scaleBoundaries.has(selector), `unapproved/nested/fixed zoom boundary: ${selector}`);
    assert.ok(!seen.has(selector), `duplicate zoom rule: ${selector}`);
    seen.add(selector);
    const variable = selector.startsWith('main.') ? '--ui-zoom' : '--overlay-text-scale';
    assert.ok(rule.declarations.includes(`zoom: var(${variable}, 1);`));
  }
}
assert.deepEqual(seen, scaleBoundaries, 'all intended content regions scale exactly once');
function declaration(selector, pattern) {
  assert.ok(rules.some((rule) => rule.selectors.includes(selector) && pattern.test(rule.declarations)),
    `${selector} must retain ${pattern}`);
}
for (const selector of [
  'body .atm-bank-picker > .atm-bank-picker__body',
  'body .water-environment-picker > .water-environment-picker__options',
]) {
  declaration(selector, /overflow-y:\s*auto/);
  declaration(selector, /flex:\s*1 1/);
  declaration(selector, /min-height:\s*0/);
}
declaration('body .detail-close-bar .close-detail', /font-size:\s*calc\(14px \* var\(--overlay-text-scale, 1\)\)/);
declaration('body .map-marker-legend > span', /white-space:\s*normal/);
assert.match(css, /flex-shrink:\s*0/);
assert.doesNotMatch(cleanCss, /(?:^|[;{])\s*(?:position|inset|transform)\s*:/, 'do not alter fixed frame geometry');
assert.doesNotMatch(cleanCss, /display:\s*none|visibility:\s*hidden/, 'never hide readable content');
console.log('Overlay text-scale static checks OK: 100–130% / 10% steps, effect restoration, portal DOM and single content-only zoom boundaries.');
console.log('Not a browser/layout test: verify 390px, 320px and short landscape at 130%, including scroll ends and close actions.');
