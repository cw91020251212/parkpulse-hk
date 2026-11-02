import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { official3dUrl, readMapReturn, saveMapReturn, returnViewport, MAP_RETURN_KEY } from '../src/domain/official3d.ts';
const point={lat:22.299,lng:114.171};
for(const [p,lang,expected] of [[point,'zh-Hant','zh-HK'],[{lat:22.45,lng:114.17},'en','en-US']]){
 const u=new URL(official3dUrl(p,lang));assert.equal(u.origin,'https://3d.map.gov.hk');assert.equal(u.searchParams.get('l'),expected);assert.equal(u.searchParams.get('i'),'false');assert.equal(u.searchParams.get('lookat'),`${p.lat.toFixed(6)},${p.lng.toFixed(6)},500c`);
}
for(const p of [{lat:NaN,lng:114},{lat:22,lng:Infinity},{lat:0,lng:0}])assert.throws(()=>official3dUrl(p,'en'));
const now=Date.now();const state={savedAt:now,position:point,view:{center:{lat:22.325,lng:114.182},zoom:17},searchScope:'viewport',hasGpsPosition:false,hasManualMapMarker:true,areaName:'test area',waterEnvironment:'indoor'};
let saved;const storage={setItem:(k,v)=>{assert.equal(k,MAP_RETURN_KEY);saved=v},getItem:k=>saved};
assert.equal(saveMapReturn(state,storage),true);assert.deepEqual(readMapReturn(storage,now),state);
assert.equal(readMapReturn(storage,now+3*60*60*1000),null);assert.equal(readMapReturn(storage,now-1),null);
for(const bad of [{...state,view:{center:point,zoom:100}},{...state,searchScope:'wrong'},{...state,waterEnvironment:'wrong'},{...state,position:{lat:0,lng:0}}]){saved=JSON.stringify(bad);assert.equal(readMapReturn(storage,now),null)}
assert.equal(readMapReturn({getItem:()=>'{broken'},now),null);assert.equal(saveMapReturn(state,{setItem:()=>{throw Error('Storage blocked')}}),false);
assert.deepEqual(returnViewport(null,point),{center:point,zoom:14});
assert.deepEqual(returnViewport({north:23,south:22,east:115,west:113,center:point,zoom:16},point),{center:point,zoom:16});
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const link=await read('src/components/Official3DLink.tsx');assert.match(link,/target="_blank"/);assert.match(link,/noopener noreferrer/);assert.match(link,/dispatchEvent/);assert.doesNotMatch(link,/iframe|location\.href\s*=/);assert.match(link,/if \(!isHkPoint\(point\)\)/);assert.match(link,/onClickCapture/);
const app=await read('src/App.tsx');assert.match(app,/saveMapReturn\(state\)/);assert.match(app,/captureLiveMap\(mapViewport\)/);assert.match(app,/if \(initial3dReturn\)/);assert.match(app,/setRestore3dView/);assert.match(app,/setRecenterRequest\(0\)/);assert.match(app,/current\.zoom === next\.zoom/);
const map=await read('src/components/MapView.tsx');assert.match(map,/zoom: map\.getZoom\(\)/);assert.match(map,/<Restore3DMapView/);assert.match(map,/<Official3DMapControl/);
const ctrl=await read('src/components/Official3DMapControl.tsx');assert.match(ctrl,/map\.stop\(\)\.setView/);assert.match(ctrl,/animate: false/);assert.match(ctrl,/official3dReturn/);
console.log('Official 3D OK: exact target links, new tab, local-only original center+zoom, stale/corrupt storage rejection, restore without GPS recenter.');
