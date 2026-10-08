import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(await readFile(new URL('../public/operator-rates.json', import.meta.url), 'utf8'));
const records = snapshot.records ?? {};
const hoiFu = records.tdc14p8428?.privateCar;
if (!hoiFu || !hoiFu.cardSummary['zh-Hant'].includes('HK$29') || !hoiFu.cardSummary['zh-Hant'].includes('HK$31')) throw new Error('Hoi Fu Link rates are missing or incorrect');
if (!hoiFu.detailNotes['zh-Hant'].some((note) => note.includes('每 24 小時：平日 HK$220'))) throw new Error('Hoi Fu 24-hour Link rate is missing');
const cornell = records.tdc25p42?.privateCar;
if (!cornell || !cornell.cardSummary['zh-Hant'].includes('$31/小時') || !cornell.cardSummary['zh-Hant'].includes('$14/小時')) throw new Error('Cornell Centre Sino rates are missing or incorrect');
const hongKongStation = records.tdc8p3?.privateCar;
const westGate = records.tdc17p3?.privateCar;
if (!hongKongStation?.cardSummary['zh-Hant'].includes('HK$38') || !westGate?.cardSummary['zh-Hant'].includes('HK$25')) throw new Error('MTR or WestK official shared-page rates are missing');
if (Object.keys(records).length < 180) throw new Error(`Expected at least 180 official operator rate records, found ${Object.keys(records).length}`);
console.log(`Verified operator rates: ${Object.keys(records).length}/${snapshot.attempted} private-car records; Hoi Fu ${hoiFu.cardSummary['zh-Hant']}; Cornell ${cornell.cardSummary['zh-Hant']}; Hong Kong Station ${hongKongStation.cardSummary['zh-Hant']}`);
