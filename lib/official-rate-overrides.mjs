function privateCar(sourceUrl, sourceZh, sourceEn, cardZh, cardEn, detailZh = [cardZh], detailEn = [cardEn]) {
  return {
    privateCar: {
      sourceUrl,
      sourceLabel: { 'zh-Hant': sourceZh, en: sourceEn },
      cardSummary: { 'zh-Hant': cardZh, en: cardEn },
      hourlySummary: { 'zh-Hant': cardZh.replace(/^.*?：/, ''), en: cardEn.replace(/^.*?:\s*/, '') },
      detailNotes: { 'zh-Hant': detailZh, en: detailEn },
    },
  };
}

const MTR = 'https://www.mtr.com.hk/ch/customer/services/stations_carpark.html';
const AIRPORT = 'https://www.hongkongairport.com/en/transport/parking/parking-charges.page';
const HZMB = 'https://www.hzmbparking.com.hk/zh-hk/parking-rates';
const MACK = 'https://www.mackcarpark.com.hk/big5/pricelist.php';
const TELFORD = 'https://www.telford-plaza.com/tch/parking';
const LEE = 'https://www.leegardens.com.hk/car-park-promotion.aspx?lang=zh-HK';
const WESTK = 'https://www.westk.hk/tc/parking';

const STATIC_RATES = {
  tdc8p3: privateCar(MTR, '港鐵官方價目', 'MTR official parking rates', '港鐵官方：平日每小時 HK$38；六、日及公眾假期 HK$34', 'MTR official: HK$38/hr weekdays; HK$34 weekends/public holidays'),
  tdc8p2: privateCar(MTR, '港鐵官方價目', 'MTR official parking rates', '港鐵官方：平日每小時 HK$31；六、日及公眾假期 HK$27', 'MTR official: HK$31/hr weekdays; HK$27 weekends/public holidays'),
  tdc8p1: privateCar(MTR, '港鐵官方價目', 'MTR official parking rates', '港鐵官方：每小時 HK$19', 'MTR official: HK$19/hr'),
  tdc8p15: privateCar(MTR, '港鐵官方價目', 'MTR official parking rates', '港鐵官方：每半小時 HK$8', 'MTR official: HK$8 / 30 min'),
  tdc8p14: privateCar(MTR, '港鐵官方價目', 'MTR official parking rates', '港鐵官方：平日每小時 HK$21；六、日及公眾假期 HK$26', 'MTR official: HK$21/hr weekdays; HK$26 weekends/public holidays'),
  tdc8p11: privateCar(MTR, '港鐵官方價目', 'MTR official parking rates', '港鐵官方：平日每小時 HK$25；六、日及公眾假期 HK$33', 'MTR official: HK$25/hr weekdays; HK$33 weekends/public holidays'),

  tdc2p1: privateCar(AIRPORT, '香港國際機場官方價目', 'Hong Kong International Airport official rates', '機場官方：首小時 HK$35；其後每小時 HK$50', 'Airport official: HK$35 first hour; HK$50 each hour after'),
  tdc2p4: privateCar(AIRPORT, '香港國際機場官方價目', 'Hong Kong International Airport official rates', '機場官方：每小時 HK$32；每日 HK$256', 'Airport official: HK$32/hr; HK$256 daily'),
  tdc2p16: privateCar(AIRPORT, '香港國際機場官方價目', 'Hong Kong International Airport official rates', '機場官方：每小時 HK$32；每日 HK$256', 'Airport official: HK$32/hr; HK$256 daily'),

  tdc15p1: privateCar(HZMB, '港珠澳大橋官方價目', 'HZMB Hong Kong Port official rates', '港珠澳大橋官方：第 1–2 小時 HK$28；第 3 小時 HK$42', 'HZMB official: HK$28 for hours 1–2; HK$42 for hour 3', ['標準私家車時租：第 1–2 小時 HK$28；第 3 小時 HK$42；第 4 小時及以後 HK$56。', '1 號停車場任何 3 小時時段內可享一次 30 分鐘免費泊車；超過後由入場起按標準時租計算。'], ['Standard private-car rate: HK$28 for hours 1–2; HK$42 for hour 3; HK$56 from hour 4 onward.', 'Car Park 1 has one 30-minute free-parking entitlement in any 3-hour period; standard rates apply from entry after that.']),
  tdc15p2: privateCar(HZMB, '港珠澳大橋官方價目', 'HZMB Hong Kong Port official rates', '港珠澳大橋官方：第 1–2 小時 HK$28；第 3 小時 HK$42', 'HZMB official: HK$28 for hours 1–2; HK$42 for hour 3', ['標準私家車時租：第 1–2 小時 HK$28；第 3 小時 HK$42；第 4 小時及以後 HK$56。', '預約私家車：所有日子 HK$28/小時；周一至四日租 HK$120；周五至日及公眾假期 HK$160。'], ['Standard private-car rate: HK$28 for hours 1–2; HK$42 for hour 3; HK$56 from hour 4 onward.', 'Pre-booked private car: HK$28/hr every day; HK$120 daily Mon–Thu; HK$160 Fri–Sun and public holidays.']),
  tdc15p3: privateCar(HZMB, '港珠澳大橋官方價目', 'HZMB Hong Kong Port official rates', '港珠澳大橋官方：第 1–2 小時 HK$28；第 3 小時 HK$42', 'HZMB official: HK$28 for hours 1–2; HK$42 for hour 3', ['標準私家車時租：第 1–2 小時 HK$28；第 3 小時 HK$42；第 4 小時及以後 HK$56。', '預約私家車：所有日子 HK$28/小時；周一至四日租 HK$120；周五至日及公眾假期 HK$160。'], ['Standard private-car rate: HK$28 for hours 1–2; HK$42 for hour 3; HK$56 from hour 4 onward.', 'Pre-booked private car: HK$28/hr every day; HK$120 daily Mon–Thu; HK$160 Fri–Sun and public holidays.']),

  tdcp10: privateCar(MACK, 'Mack 官方價目', 'Mack official parking rates', 'Mack 官方：日間每小時 HK$17；夜間 HK$15', 'Mack official: HK$17/hr daytime; HK$15/hr overnight'),
  tdcp12: privateCar(MACK, 'Mack 官方價目', 'Mack official parking rates', 'Mack 官方：日間每小時 HK$13；夜間 HK$11', 'Mack official: HK$13/hr daytime; HK$11/hr overnight'),
  tdcp2: privateCar(MACK, 'Mack 官方價目', 'Mack official parking rates', 'Mack 官方：日間每小時 HK$23；夜間 HK$17', 'Mack official: HK$23/hr daytime; HK$17/hr overnight'),
  tdcp7: privateCar(MACK, 'Mack 官方價目', 'Mack official parking rates', 'Mack 官方：每小時 HK$13', 'Mack official: HK$13/hr'),
  tdcp9: privateCar(MACK, 'Mack 官方價目', 'Mack official parking rates', 'Mack 官方：日間每小時 HK$13；夜間 HK$11', 'Mack official: HK$13/hr daytime; HK$11/hr overnight'),

  '30': privateCar(TELFORD, '德福廣場官方價目', 'Telford Plaza official parking rates', '德福官方：每小時 HK$25', 'Telford official: HK$25/hr'),
  '31': privateCar(TELFORD, '德福廣場官方價目', 'Telford Plaza official parking rates', '德福官方：每小時 HK$25', 'Telford official: HK$25/hr'),
  '32': privateCar(TELFORD, '德福廣場官方價目', 'Telford Plaza official parking rates', '德福官方：每小時 HK$25', 'Telford official: HK$25/hr'),

  tdc1p1: privateCar(LEE, '利園官方價目', 'Lee Gardens official parking rates', '利園官方：平日每半小時 HK$20；六、日及公眾假期 HK$22', 'Lee Gardens official: HK$20 / 30 min weekdays; HK$22 weekends/public holidays'),
  tdc1p2: privateCar(LEE, '利園官方價目', 'Lee Gardens official parking rates', '利園官方：平日每半小時 HK$18；六、日及公眾假期 HK$19', 'Lee Gardens official: HK$18 / 30 min weekdays; HK$19 weekends/public holidays'),
  tdc1p3: privateCar(LEE, '利園官方價目', 'Lee Gardens official parking rates', '利園官方：每半小時 HK$14', 'Lee Gardens official: HK$14 / 30 min'),
  tdc1p4: privateCar(LEE, '利園官方價目', 'Lee Gardens official parking rates', '利園官方：每半小時 HK$18', 'Lee Gardens official: HK$18 / 30 min'),
  tdc1p5: privateCar(LEE, '利園官方價目', 'Lee Gardens official parking rates', '利園官方：每半小時 HK$18', 'Lee Gardens official: HK$18 / 30 min'),

  tdc52p1: privateCar(WESTK, '西九官方價目', 'WestK official parking rates', '西九官方：平日每小時 HK$28；六、日及公眾假期 HK$32', 'WestK official: HK$28/hr weekdays; HK$32 weekends/public holidays'),
  tdc17p1: privateCar(WESTK, '西九官方價目', 'WestK official parking rates', '西九官方：平日每小時 HK$28；六、日及公眾假期 HK$32', 'WestK official: HK$28/hr weekdays; HK$32 weekends/public holidays'),
  tdc17p2: privateCar(WESTK, '西九官方價目', 'WestK official parking rates', '西九官方：平日每小時 HK$28；六、日及公眾假期 HK$32', 'WestK official: HK$28/hr weekdays; HK$32 weekends/public holidays'),
  tdc17p3: privateCar(WESTK, '西九官方價目', 'WestK official parking rates', '西九官方：平日每小時 HK$25；六、日及公眾假期 HK$28', 'WestK official: HK$25/hr weekdays; HK$28 weekends/public holidays'),
  tdc117p1: privateCar(WESTK, '西九官方價目', 'WestK official parking rates', '西九官方：平日每小時 HK$28；六、日及公眾假期 HK$32', 'WestK official: HK$28/hr weekdays; HK$32 weekends/public holidays'),
};

export function buildOfficialRateOverrides(records, checkedAt = new Date().toISOString().slice(0, 10)) {
  const knownIds = new Set(records.map((record) => record.park_Id));
  const output = Object.fromEntries(Object.entries(STATIC_RATES).filter(([id]) => knownIds.has(id)).map(([id, rates]) => [id, Object.fromEntries(Object.entries(rates).map(([vehicleType, rate]) => [vehicleType, { ...rate, checkedAt }]))]));
  return { source: '官方共享停車場價目頁', generatedAt: new Date().toISOString(), checkedAt, attempted: Object.keys(STATIC_RATES).length, records: output };
}
