import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const port = Number(process.env.CDP_PORT || 9244);
const site = process.env.SITE_URL || 'http://127.0.0.1:4173/parkpulse-hk/';
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0; const pending = new Map(); const errors = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
});
function send(method, params = {}) { return new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); }); }
async function ev(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression) { for (let n = 0; n < 150; n++) { if (await ev(`Boolean(${expression})`)) return; await pause(200); } throw new Error(`Timeout: ${expression}`); }
async function click(selector) {
  await ev(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'nearest',inline:'nearest'})`);
  await pause(40);
  const p = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  assert.ok(p, selector);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p });
}
async function key(name) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name });
}
const primary = mode => `.facility-mode-choice[data-facility="${mode}"] > button:first-child`;
const edit = mode => `.facility-mode-choice[data-facility="${mode}"] .facility-edit-button`;
async function isOn(mode) { return ev(`document.querySelector(${JSON.stringify(primary(mode))}).getAttribute('aria-pressed')==='true'`); }
async function mapBox() { return ev("(()=>{const r=document.querySelector('.landsd-map').getBoundingClientRect();return{top:r.top,height:r.height,width:r.width}})()"); }
function sameBox(a, b) { for (const field of ['top', 'height', 'width']) assert.ok(Math.abs(a[field] - b[field]) < 1, `Map ${field} changed: ${JSON.stringify({a,b})}`); }
async function openWater() { await click(edit('drinkingWater')); await wait("document.querySelector('.water-environment-picker')"); }
async function fits(selector) { return ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1})()`); }
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', {cacheDisabled: true});
  await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.addScriptToEvaluateOnNewDocument', {source:"Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(cb){setTimeout(()=>cb({coords:{latitude:22.4515,longitude:114.1702,accuracy:10}}),50)}}})"});
  await send('Page.navigate', {url:site}); await wait("document.querySelector('.app-shell')");
  await ev("sessionStorage.clear();localStorage.setItem('parkspot:preferences:v1',JSON.stringify({facilityMode:'trafficCamera',searchScope:'radius',language:'zh-Hant',atmSelectedBanks:[]}))");
  await send('Page.reload', {ignoreCache:true}); await wait("document.querySelector('.selected-center-marker-shell.is-current-location')"); await pause(1700);
  const baseline = await mapBox();
  assert.equal(await ev("document.querySelectorAll('.water-filter,.atm-bank-summary').length"), 0);

  await click(primary('atm')); await wait(`document.querySelector(${JSON.stringify(edit('atm'))})`);
  assert.ok(await isOn('atm')); sameBox(baseline, await mapBox());
  assert.equal(await ev("document.querySelectorAll('.atm-bank-picker').length"), 0, 'Activation must not open bank choices automatically');
  await click(edit('atm')); await wait("document.querySelector('.atm-bank-picker')");
  await wait("document.querySelectorAll('.atm-bank-multiselect__options > button').length>=2");
  await click('.atm-bank-multiselect__options > button:nth-of-type(1)');
  await click('.atm-bank-multiselect__options > button:nth-of-type(2)');
  assert.equal(await ev("document.querySelectorAll('.atm-bank-multiselect__options button[aria-pressed=\"true\"]').length"), 2);
  await click('.atm-bank-picker__close'); await wait("!document.querySelector('.atm-bank-picker')");
  await click(primary('atm')); assert.equal(await isOn('atm'), false);
  await click(primary('atm')); await wait(`document.querySelector(${JSON.stringify(edit('atm'))})`);
  await pause(5500);
  assert.equal(await ev(`!!document.querySelector(${JSON.stringify(edit('atm'))})`), false, 'Ignored edit hint disappears after 5 seconds');
  assert.ok(await isOn('atm')); sameBox(baseline, await mapBox());
  assert.equal(await ev("JSON.parse(localStorage.getItem('parkspot:preferences:v1')).atmSelectedBanks.length"), 2, 'Timeout must not reset bank preferences');
  console.log('ATM: same-row edit, two-bank selection, auto-hide, reactivation and unchanged map geometry passed.');

  await click(primary('drinkingWater')); await wait(`document.querySelector(${JSON.stringify(edit('drinkingWater'))})`);
  assert.equal(await isOn('atm'), false); sameBox(baseline, await mapBox());
  assert.equal(await ev("document.querySelectorAll('.water-environment-picker').length"), 0);
  await wait("document.querySelectorAll('.water-card').length>0");
  await openWater(); assert.ok(await fits('.water-environment-picker'));
  for (let n=0;n<6;n++) { await key('Tab'); assert.ok(await ev("document.querySelector('.water-environment-picker').contains(document.activeElement)"), 'All-radio Tab stays in the modal'); }
  await click('.water-environment-picker input[value="indoor"]'); await wait("!document.querySelector('.water-environment-picker')");
  await openWater(); assert.equal(await ev("document.querySelector('.water-environment-picker input:checked').value"), 'indoor');
  for (let n=0;n<6;n++) { await key('Tab'); assert.ok(await ev("document.querySelector('.water-environment-picker').contains(document.activeElement)"), 'Indoor-radio Tab stays in the modal'); }
  await ev('history.back()'); await wait("!document.querySelector('.water-environment-picker')");
  assert.ok((await ev('location.href')).startsWith(site.split('?')[0]));
  await openWater(); await key('Escape'); await wait("!document.querySelector('.water-environment-picker')");
  await openWater();
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:5,y:5});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:5,y:5});
  await wait("!document.querySelector('.water-environment-picker')");
  assert.ok(await isOn('drinkingWater')); sameBox(baseline, await mapBox());
  await click(primary('drinkingWater')); assert.equal(await isOn('drinkingWater'), false);
  await click(primary('drinkingWater')); await wait(`document.querySelector(${JSON.stringify(edit('drinkingWater'))})`);
  await pause(5500);
  assert.equal(await ev(`!!document.querySelector(${JSON.stringify(edit('drinkingWater'))})`), false);
  assert.ok(await isOn('drinkingWater')); sameBox(baseline, await mapBox());
  console.log('Water: click-to-edit only, indoor choice retained, X/Back/Escape/backdrop, timeout and toggle cycles passed.');

  await click(primary('drinkingWater')); await click(primary('drinkingWater'));
  await wait(`document.querySelector(${JSON.stringify(edit('drinkingWater'))})`);
  await pause(300);
  assert.ok(await ev("(()=>{const e=document.querySelector('[data-facility=drinkingWater] .facility-edit-button'),r=e.getBoundingClientRect(),t=e.closest('.filter-scroll-track').getBoundingClientRect();return r.right<=t.right+1&&r.left>=t.left&&r.right<=innerWidth})()"), 'Entire water Edit button must remain visible, including after data loading');
  if (process.env.SCREENSHOT) {const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(process.env.SCREENSHOT,Buffer.from(shot.data,'base64'));}
  await openWater();
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await ev("document.documentElement.style.fontSize='20.8px'"); await pause(150);
  assert.ok(await fits('.water-environment-picker')); assert.ok(await fits('.water-environment-picker__close'));
  await click('.water-environment-picker__close'); await wait("!document.querySelector('.water-environment-picker')");
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await ev("document.documentElement.style.fontSize=''"); await pause(150);

  await click('.map-focus-toggle'); await wait("document.querySelector('.app-shell.map-focus')");
  await click('.map-extra-tools > summary'); await wait("document.querySelector('.map-extra-tools[open]')");
  await click('.map-extra-tools-panel button:nth-of-type(2)'); await wait("document.querySelector('.water-environment-picker')");
  await key('Escape'); await wait("!document.querySelector('.water-environment-picker')");
  assert.ok(await ev("!!document.querySelector('.app-shell.map-focus')"));
  assert.equal(await ev("document.querySelectorAll('.map-extra-tools[open]').length"), 0, 'No ghost more-tools layer after water choices');
  const full=await mapBox(); assert.equal(full.height,844); assert.equal(full.width,390);
  await ev('history.back()'); await wait("!document.querySelector('.app-shell.map-focus')");
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log(JSON.stringify({site,noPersistentTopFilters:true,inlineEdit:true,hideAfter5Seconds:true,repeatToggle:true,bankMultiSelectRetained:true,waterSelectionRetained:true,mapBoxUnchanged:baseline,waterAllExits:true,landscape130PercentFits:true,fullscreenMoreEdit:true,noGhostHistory:true,noJsErrors:true}));
} finally { ws.close(); }
