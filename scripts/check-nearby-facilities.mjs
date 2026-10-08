import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const request = async (path) => {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, 200, `${path} should return HTTP 200`);
  return response.json();
};

const [fuel, atm] = await Promise.all([request('/api/fuel-stations'), request('/api/atms')]);
assert.match(fuel.source, /消費者委員會/);
assert.ok(fuel.records.length >= 170, `Expected at least 170 fuel stations, got ${fuel.records.length}`);
assert.ok(fuel.records.every((item) => item.kind === 'fuel' && item.name && item.address && item.brand && item.latitude >= 22.13 && item.latitude <= 22.57 && item.longitude >= 113.8 && item.longitude <= 114.5), 'Fuel stations need brand, address and Hong Kong coordinates');
assert.match(atm.source, /香港金融管理局/);
assert.ok(atm.records.length >= 1_500, `Expected at least 1,500 ATMs, got ${atm.records.length}`);
assert.ok(atm.records.every((item) => item.kind === 'atm' && item.name && item.address && item.latitude >= 22.13 && item.latitude <= 22.57 && item.longitude >= 113.8 && item.longitude <= 114.5), 'ATMs need bank, address and Hong Kong coordinates');
console.log(`Verified ${fuel.records.length} fuel stations and ${atm.records.length} ATMs`);
