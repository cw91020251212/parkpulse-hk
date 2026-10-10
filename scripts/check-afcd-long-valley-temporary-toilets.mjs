import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [snapshot, builder] = await Promise.all([
  readFile(new URL('../public/pages-data/afcd-long-valley-temporary-toilets.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../lib/afcd-long-valley-temporary-toilets.mjs', import.meta.url), 'utf8'),
]);
assert.equal(snapshot.recordCount, 1);
const [site] = snapshot.records ?? [];
assert.equal(site.id, 'afcd-long-valley-temporary-toilets-venue');
assert.equal(site.kind, 'afcdLongValleyTemporaryToilets');
assert.equal(site.locationPrecision, 'venue-uncertain');
assert.equal(site.nameEn, 'AFCD temporary toilets near Long Valley Nature Park (3 sites)');
assert.ok(site.latitude >= 22.13 && site.latitude <= 22.57 && site.longitude >= 113.8 && site.longitude <= 114.5);
assert.deepEqual([site.latitude, site.longitude], [22.508721, 114.112952]);
assert.ok(site.sourceUrl.includes('info.gov.hk/gia/general/202406/12/'));
assert.ok(site.coordinateSourceUrl.includes('hk-afcd-afcdlist-lvnpcsdi'));
assert.doesNotMatch(builder, /services3\.arcgis\.com/);
assert.match(site.remarks, /灰色標記及導航只指向.*並非其中任何廁所位置/u);
assert.match(site.remarksEn, /not any of the toilet sites/u);
console.log('Verified one grey Long Valley park-venue marker for the three reported temporary toilets; it is not an exact toilet point.');
