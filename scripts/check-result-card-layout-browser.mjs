import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
const port=Number(process.env.CDP_PORT||9248),site=process.env.SITE_URL||'http://127.0.0.1:4173/parkpulse-hk/';
const target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page');
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}});
const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(exp){for(let i=0;i<200;i++){if(await ev(`Boolean(${exp})`))return;await sleep(100)}throw new Error(`Timeout: ${exp}`)}
async function click(selector){await ev(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'nearest'})`);await sleep(50);const p=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});}
async function key(key){await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key});}
const taiPo={lat:22.4515,lng:114.1702};
async function fixture(file,key='records'){const d=JSON.parse(await readFile(new URL(`../public/pages-data/${file}.json`,import.meta.url)));const r=d[key][0];return{lat:r.latitude,lng:r.longitude}}
const cases=[
 {mode:'toilets',point:taiPo},
 {mode:'fuel',point:await fixture('fuel-stations')},
 {mode:'atm',point:await fixture('atms')},
 {mode:'aed',point:await fixture('aeds')},
 {mode:'emergency',point:await fixture('emergency-departments')},
 {mode:'border',point:await fixture('border-control-points')},
 {mode:'hkjc',point:await fixture('hkjc-betting-outlets')},
 {mode:'trafficCamera',point:await fixture('traffic-cameras')},
 {mode:'drinkingWater',point:await fixture('lcsd-drinking-water')},
 {mode:'medical',point:taiPo},
 {mode:'onStreet',point:await fixture('motorcycle-roadside','groups'),vehicle:'motorCycle'},
 {mode:null,point:taiPo},
 {mode:'toilets',point:taiPo,width:320,height:568,scale:130,language:'en'},
 {mode:'toilets',point:taiPo,width:844,height:390,scale:130},
 {mode:'toilets',point:taiPo,width:1440,height:900},
];
const selector='.results-list > article';
async function inspect(label){
 const r=await ev(`(()=>{const list=document.querySelector('.results-list');const cards=[...list.querySelectorAll(':scope > article')];const bad=[];for(const e of cards){const r=e.getBoundingClientRect(),h=e.querySelector('.card-heading,.water-card-heading,.camera-card-heading'),m=e.querySelector('.toilet-card-main,.park-card-main,.water-card-main'),hr=h?.getBoundingClientRect(),mr=m?.getBoundingClientRect();if((hr&&(hr.top<r.top-1||hr.bottom>r.bottom+1))||(mr&&(mr.top<r.top-1||mr.bottom>r.bottom+1))||r.width>list.getBoundingClientRect().width+2)bad.push({name:e.querySelector('h3,strong')?.textContent,height:r.height,headTop:hr?.top-r.top,mainTop:mr?.top-r.top,mainBottom:mr?.bottom-r.bottom});}return{count:cards.length,bad,firstHeight:cards[0]?.getBoundingClientRect().height,listHeight:list.getBoundingClientRect().height,scrollHeight:list.scrollHeight}})()`);
 assert.ok(r.count>0,`${label}: real records required`);assert.deepEqual(r.bad,[],`${label}: own border clips content`);return r;
}
const result=[];
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(cb){const p=JSON.parse(localStorage.getItem('parkpulse:layout-fixture')||'{\"lat\":22.4515,\"lng\":114.1702}');setTimeout(()=>cb({coords:{latitude:p.lat,longitude:p.lng,accuracy:10}}),30)}}})"});
 await send('Page.navigate',{url:site});await wait("document.querySelector('.app-shell')");
 for(const c of cases){
  const width=c.width||390,height=c.height||844,scale=c.scale||100;
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<1000});
  await ev(`sessionStorage.clear();localStorage.setItem('parkpulse:layout-fixture',${JSON.stringify(JSON.stringify(c.point))});localStorage.setItem('parkspot:preferences:v1',JSON.stringify({facilityMode:${JSON.stringify(c.mode)},vehicleType:${JSON.stringify(c.vehicle||'privateCar')},searchScope:'radius',language:${JSON.stringify(c.language||'zh-Hant')},textScale:${scale},waterEnvironment:'all',atmSelectedBanks:[],filters:{availableOnly:false,openOnly:false,includeNoLiveData:true}}))`);
  await send('Page.reload',{ignoreCache:true});await wait(`document.querySelectorAll(${JSON.stringify(selector)}).length>0`);await sleep(350);
  const normal=await inspect(`${c.mode||'parking'} normal ${width}/${scale}`);
  await ev("document.querySelector('.map-results-link').click()");await wait("document.querySelector('.results-panel.is-fullscreen')");await sleep(100);
  const fullscreen=await inspect(`${c.mode||'parking'} fullscreen ${width}/${scale}`);
  assert.ok(fullscreen.listHeight>44,'Fullscreen needs a readable scrolling region');
  await ev("document.querySelector('.results-list').scrollTop=document.querySelector('.results-list').scrollHeight");await sleep(30);await inspect('end of list');
  if(c.mode==='toilets'){
   assert.ok(await ev("document.querySelectorAll('.results-list .toilet-card-title-button').length>0"));
   const title='.results-list > article:nth-of-type(4) .toilet-card-title-button';
   await click(title);await wait("document.querySelector('.washroom-detail-panel')");
   assert.ok(await ev("document.querySelector('.washroom-detail-panel .card-heading').getBoundingClientRect().top>=document.querySelector('.washroom-detail-panel .toilet-card').getBoundingClientRect().top"));
   assert.equal(await ev("document.querySelectorAll('.washroom-detail-panel .toilet-card-title-button').length"),0,'Detail must not recursively open itself');
   for(const exit of ['X','Back','Escape']){
    if(exit==='X')await click('.washroom-detail-panel .close-detail');else if(exit==='Back')await ev('history.back()');else await key('Escape');
    await wait("!document.querySelector('.washroom-detail-panel')");assert.ok(await ev("Boolean(document.querySelector('.results-panel.is-fullscreen'))"),'Closing detail keeps results');
    if(exit!=='Escape'){await click(title);await wait("document.querySelector('.washroom-detail-panel')");}
   }
   if(width===390&&scale===100&&process.env.SCREENSHOT){await ev("document.querySelector('.results-list').scrollTop=0");const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(process.env.SCREENSHOT,Buffer.from(shot.data,'base64'));}
  }
  await click('.results-fullscreen-close');await wait("!document.querySelector('.results-panel.is-fullscreen')");
  result.push({mode:c.mode||'parking',width,height,scale,language:c.language||'zh-Hant',normalCount:normal.count,fullscreenCount:fullscreen.count,clipped:0,listHeight:fullscreen.listHeight});console.log(JSON.stringify(result.at(-1)));
 }
 assert.deepEqual(errors,[],'No JS exceptions');console.log(JSON.stringify({site,cases:result.length,allCardHeadsAndBodiesVisible:true,washroomTitleOpensDetail:true,allWashroomDetailExits:true,noJsErrors:true}));
}finally{ws.close();}
