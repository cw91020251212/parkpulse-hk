import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
// Optional real-browser regression: start a disposable Chrome CDP instance first.
// SITE_URL can target local Pages output or the deployed GitHub Pages site.
const port = Number(process.env.CDP_PORT || 9242);
const site = process.env.SITE_URL || 'http://127.0.0.1:4173/parkpulse-hk/';
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && !t.url.includes('3d.map.gov.hk'));
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0; const pending = new Map(); const errors = []; const dataRequests = []; const outgoingRequests = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') { outgoingRequests.push(m.params.request.url); if (m.params.request.url.includes('named-places')) dataRequests.push(m.params.request.url); }
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.reject(m.error); else p.resolve(m.result); }
});
function send(method, params = {}) { return new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); }); }
async function ev(expression) { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression) { for (let n = 0; n < 150; n++) { if (await ev(`Boolean(${expression})`)) return; await pause(200); } throw new Error(`Timeout: ${expression}`); }
async function click(selector) { await ev(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'nearest'})`); await pause(50); const p = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`); assert.ok(p, selector); await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p }); }
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__gpsPoint={lat:22.2728794,lng:114.1886088};Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(cb){setTimeout(()=>cb({coords:{latitude:window.__gpsPoint.lat,longitude:window.__gpsPoint.lng,accuracy:10}}),50)}}})" });
  await send('Page.navigate', { url: site }); await wait("document.querySelector('.app-shell')");
  await ev("sessionStorage.removeItem('parkpulse:3d-map-return:v1');localStorage.setItem('parkspot:preferences:v1',JSON.stringify({facilityMode:'trafficCamera',searchScope:'radius',language:'zh-Hant'}))");
  await send('Page.reload', { ignoreCache: true }); await wait("document.querySelector('.selected-center-marker-shell.is-current-location')"); await pause(1700);
  assert.equal(await ev("document.querySelectorAll('.position-info-popup').length"), 0);
  await click('.selected-center-marker-shell.is-current-location'); await wait("document.querySelector('.position-info-name')");
  const name = await ev("document.querySelector('.position-info-name').innerText"); assert.ok(/香港大球場|HONG KONG STADIUM/i.test(name), name);
  const snapshot = await (await fetch(new URL('pages-data/named-places.json', site))).json();
  const hks = snapshot.places.find(p => /香港大球場|HONG KONG STADIUM/i.test(p.nameTc + ' ' + p.nameEn)); assert.ok(hks);
  if (hks.addressTc || hks.addressEn) assert.ok(await ev("Boolean(document.querySelector('.position-info-address')?.innerText)"));
  assert.equal(await ev("document.querySelector('.position-info-location-details').open"), false);
  const href = await ev("document.querySelector('.position-info .official-3d-link').href"); assert.equal(new URL(href).searchParams.get('lookat'), '22.272879,114.188609,500c');
  const src = await ev("document.querySelector('.position-info-source').href"); assert.ok(src.includes('gov.hk'));
  const popupFits = await ev("(()=>{const r=document.querySelector('.position-info-popup').getBoundingClientRect();return r.left>=-1&&r.right<=visualViewport.width+2})()"); assert.ok(popupFits, 'Named popup must fit the mobile viewport');
  if (process.env.SCREENSHOT) { const shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(process.env.SCREENSHOT, Buffer.from(shot.data, 'base64')); }
  await click('.position-info-popup .leaflet-popup-close-button'); await wait("!document.querySelector('.position-info-popup')");
  await click('.selected-center-marker-shell.is-current-location'); await wait("document.querySelector('.position-info-name')"); await ev('history.back()'); await wait("!document.querySelector('.position-info-popup')");
  assert.ok((await ev('location.href')).startsWith(site.split('?')[0]));
  await click('.selected-center-marker-shell.is-current-location'); await wait("document.querySelector('.position-info-name')"); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' }); await wait("!document.querySelector('.position-info-popup')");
  await click('.selected-center-marker-shell.is-current-location'); await wait("document.querySelector('.position-info-name')");
  const blank = await ev("(()=>{const r=document.querySelector('.leaflet-container').getBoundingClientRect();return{x:r.left+25,y:r.top+r.height/2}})()");
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...blank});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...blank});
  await wait("!document.querySelector('.position-info-popup')");
  assert.ok(!outgoingRequests.some(url => /pgrst\.open-data\.hk|nominatim|overpass|geih-ws|gih-ws/.test(url)), 'No third-party reverse lookup request');
  assert.ok(dataRequests.length > 0);
  assert.ok(dataRequests.every(url => new URL(url).origin === new URL(site).origin && !new URL(url).search));
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify({ site, realOfficialStadiumName: name, addressWhenRecorded: true, coordinatesCollapsed: true, exactPin3D: true, mobilePopupFits: true, closeBackEscapeMapTap: true, sameOriginDataOnly: true, polygons: snapshot.places.length, noJsErrors: true }));
} finally { ws.close(); }
