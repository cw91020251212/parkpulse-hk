import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const payload = JSON.parse(await readFile('public/pages-data/motorcycle-roadside.json', 'utf8'));
assert.match(payload.source, /香港出行易/, 'snapshot must name the official HKeMobility source');
assert.match(payload.sourceUrl, /hkemobility\.gov\.hk/, 'snapshot must keep the official WFS URL');
assert.ok(payload.recordCount >= 10_000, 'snapshot must include the official motorcycle roadside dataset');
assert.ok(Array.isArray(payload.groups) && payload.groups.length >= 600, 'snapshot must aggregate motorcycle spaces by street');
assert.ok(payload.groups.every((group) => group.kind === 'motorcycle' && group.static === true && group.vehicleType === 'Motor Cycles'), 'snapshot groups must contain only static motorcycle roadside spaces');
assert.ok(payload.groups.every((group) => group.total > 0 && group.vacant === 0 && group.occupied === 0 && group.unavailable === 0), 'static motorcycle groups must not invent live availability');
assert.ok(payload.groups.some((group) => group.name === '南寧街' && group.total >= 2), 'official Nam Ning Street motorcycle spaces must be retained');
console.log(`Verified ${payload.recordCount} official motorcycle spaces in ${payload.groups.length} street groups`);
