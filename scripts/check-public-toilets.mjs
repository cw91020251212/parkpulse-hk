import assert from 'node:assert/strict';
import { parsePublicToilets } from '../lib/public-toilets.mjs';

const parsedSample = parsePublicToilets(`
  <root>
    <map><map_type>toilet</map_type><mapID>demo</mapID><name_c><![CDATA[測試 &amp; 公廁]]></name_c><address_c>測試地址</address_c><openHr_c>24小時</openHr_c><map_coordinate>22.3001,114.1701</map_coordinate></map>
    <map><map_type>toilet</map_type><name_c>缺失座標</name_c><map_coordinate>invalid</map_coordinate></map>
    <map><map_type>market</map_type><name_c>不是公廁</name_c><map_coordinate>22.3001,114.1701</map_coordinate></map>
  </root>
`);
assert.equal(parsedSample.length, 1, 'parser should exclude non-toilets and invalid coordinates');
assert.equal(parsedSample[0].id, 'demo');
assert.equal(parsedSample[0].name, '測試 & 公廁');
assert.equal(parsedSample[0].openingHours, '24小時');

const baseUrl = process.env.PARKSPOT_BASE_URL ?? 'http://127.0.0.1:3000';
const response = await fetch(`${baseUrl}/api/public-toilets`);
assert.equal(response.ok, true, `Public toilet endpoint returned ${response.status}`);
const { source, records } = await response.json();
assert.match(source, /食物環境衞生署/);
assert.ok(Array.isArray(records) && records.length >= 700, `Expected official public-toilet data, got ${records?.length ?? 0} records`);
assert.ok(records.every((record) => typeof record.id === 'string' && record.name && record.latitude >= 22.13 && record.latitude <= 22.57 && record.longitude >= 113.8 && record.longitude <= 114.5), 'All public-toilet records need valid Hong Kong coordinates');

console.log(`Verified ${records.length} FEHD public toilets`);
