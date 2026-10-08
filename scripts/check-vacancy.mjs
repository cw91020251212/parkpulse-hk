import assert from 'node:assert/strict';
import { getVacancyStatus, selectVacancyEntry } from '../src/domain/carpark.ts';

const openPark = { park_Id: 'demo', name: '測試停車場', latitude: 22.3, longitude: 114.1, opening_status: 'OPEN' };

assert.equal(getVacancyStatus(openPark, { vacancy_type: 'A', vacancy: 3 }).kind, 'count');
assert.equal(getVacancyStatus(openPark, { vacancy_type: 'A', vacancy: 0 }).kind, 'full');
assert.equal(getVacancyStatus(openPark, { vacancy_type: 'A', vacancy: -1 }).kind, 'unknown');
assert.equal(getVacancyStatus(openPark, { vacancy_type: 'B', vacancy: 1 }).kind, 'available');
assert.equal(getVacancyStatus(openPark, { vacancy_type: 'B', vacancy: 0 }).kind, 'full');
assert.equal(getVacancyStatus(openPark, { vacancy_type: 'C', vacancy: 0 }).kind, 'closed');
assert.equal(getVacancyStatus({ ...openPark, opening_status: 'CLOSED' }, { vacancy_type: 'A', vacancy: 9 }).kind, 'closed');
assert.equal(selectVacancyEntry([{ category: 'MONTHLY', vacancy_type: 'A', vacancy: 0, lastupdate: '2026-10-08 10:00:00' }, { category: 'HOURLY', vacancy_type: 'A', vacancy: 2, lastupdate: '2026-10-08 09:59:00' }])?.vacancy, 2);
assert.equal(selectVacancyEntry([{ category: 'HOURLY', vacancy_type: 'A', vacancy: 1, lastupdate: '2026-10-08 09:58:00' }, { category: 'HOURLY', vacancy_type: 'A', vacancy: 4, lastupdate: '2026-10-08 10:01:00' }])?.vacancy, 4);

console.log('vacancy status checks passed');
