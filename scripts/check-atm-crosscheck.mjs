import assert from 'node:assert/strict';
import { filterVerifiedAtmExclusions } from '../lib/nearby-facilities.mjs';

const records = [
  { id: 'official-no-atm-1', brand: '富邦銀行(香港)有限公司', address: '皇后大道東 213 號胡忠大廈地下 2 號舖' },
  { id: 'official-no-atm-2', brand: '富邦銀行(香港)有限公司', address: '堅尼地城卑路乍街44A-46號低層地下1號舖' },
  { id: 'official-no-atm-3', brand: '富邦銀行(香港)有限公司', address: '安慈路翠屏花園地下28號舖' },
  { id: 'verified-fubon-atm', brand: '富邦銀行(香港)有限公司', address: '軒尼詩道455-457號勝華樓地下' },
  { id: 'other-bank', brand: '渣打銀行(香港) 有限公司', address: '安慈路翠屏花園地下28號舖' },
];

const visible = filterVerifiedAtmExclusions(records);
assert.deepEqual(visible.map((record) => record.id), ['verified-fubon-atm', 'other-bank']);
console.log('Verified bank-official Fubon ATM exclusions without affecting other ATM records');
