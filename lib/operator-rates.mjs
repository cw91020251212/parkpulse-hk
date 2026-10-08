export const LINK_RATE_API_BASE = 'https://apim-gateway-prd.azure.linkreit.com/MPCMS/PRD2/parking/';
const SINO_PORTFOLIO_URL = 'https://www.sino-propertyservices.com/tc/parking-services/portfolio';
const SINO_PORTFOLIO_EN_URL = 'https://www.sino-propertyservices.com/en/parking-services/portfolio';

export function getLinkFacilityKey(website) {
  try {
    const url = new URL(website);
    const match = url.hostname.endsWith('linkhk.com') && url.pathname.match(/\/parking\/(\d+)\/?$/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function htmlLines(markup = '') {
  return markup
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:li|p|h4|h5|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function decodeMarkup(markup = '') {
  return markup.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&amp;amp;', '&').replaceAll('&amp;', '&');
}

function extractJsonArray(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const arrayStart = start + marker.length;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = arrayStart; index < html.length; index += 1) {
    const character = html[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === '[') depth += 1;
    else if (character === ']' && --depth === 0) return JSON.parse(html.slice(arrayStart, index + 1));
  }
  throw new Error('Sino properties JSON was incomplete');
}

function normaliseName(value = '') {
  return value.replace(/[\s（）()\-]/g, '').toLowerCase();
}

function privateCarLines(markup, labelPattern) {
  const block = (decodeMarkup(markup).match(/<p\b[\s\S]*?<\/p>/gi) ?? [])
    .find((section) => labelPattern.test(htmlLines(section).join(' ')));
  return block ? htmlLines(block) : [];
}

function sectionPairs(lines, heading) {
  const start = lines.findIndex((line) => line.includes(heading));
  if (start < 0) return [];
  const pairs = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > start + 1 && /^(?:時租泊車|每\s*12\s*小時|每\s*24\s*小時|Hourly Rate|12-Hour Rate|24-Hour Rate)/.test(line)) break;
    const price = line.match(/^\$\s*([\d,]+(?:\.\d+)?)/);
    if (!price) continue;
    const label = lines[index - 1];
    if (!label || /^\$/.test(label)) continue;
    pairs.push({ label, price: price[1].replaceAll(',', '') });
  }
  return pairs;
}

function formatPairs(pairs, withHourlyUnit = false) {
  return pairs.map(({ label, price }) => `${label}${withHourlyUnit ? '每小時 ' : ' ' }HK$${price}`).join('；');
}

function formatEnglishPairs(pairs, unit = '') {
  return pairs.map(({ label, price }) => `${label}: HK$${price}${unit}`).join('; ');
}

export function parseLinkOperatorRate(website, payload, checkedAt) {
  const parking = payload?.data?.parkingInfo;
  const rateHtml = parking?.allRateHtmlTc ?? '';
  const rateHtmlEn = parking?.allRateHtmlEn ?? '';
  const remarkHtml = parking?.remarkTc ?? '';
  const remarkHtmlEn = parking?.remarkEn ?? '';
  if (!rateHtml || !/私家車/.test(`${rateHtml}\n${remarkHtml}`)) return undefined;

  const rateLines = htmlLines(rateHtml);
  const hourly = sectionPairs(rateLines, '時租泊車');
  if (!hourly.length) return undefined;
  const rateLinesEn = htmlLines(rateHtmlEn);
  const hourlyEn = sectionPairs(rateLinesEn, 'Hourly Rate');

  const notes = [`時租泊車：${formatPairs(hourly, true)}。`];
  for (const [heading, label] of [['每12小時', '每 12 小時'], ['每24小時', '每 24 小時']]) {
    const pairs = sectionPairs(rateLines, heading);
    if (pairs.length) notes.push(`${label}：${formatPairs(pairs)}。`);
  }

  const remarkText = htmlLines(remarkHtml).join(' ');
  const overnight = remarkText.match(/時租泊車\s*\(([^)]+)\)\s*-\s*平日:\s*\$(\d+).*?\$(\d+)/);
  if (overnight) notes.splice(1, 0, `凌晨時租（${overnight[1]}）：平日每小時 HK$${overnight[2]}；六、日及公眾假期每小時 HK$${overnight[3]}。`);
  if (/全單加收\s*\$10/.test(remarkText)) notes.push('特別泊車時段進場可能令時租、12 泊及 24 泊全單加收 HK$10；請以入口告示為準。');

  const notesEn = [`Hourly rate: ${formatEnglishPairs(hourlyEn.length ? hourlyEn : hourly, '/hr')}.`];
  for (const [heading, label] of [['12-Hour Rate', '12-hour rate'], ['24-Hour Rate', '24-hour rate']]) {
    const pairs = sectionPairs(rateLinesEn, heading);
    if (pairs.length) notesEn.push(`${label}: ${formatEnglishPairs(pairs)}.`);
  }
  const remarkTextEn = htmlLines(remarkHtmlEn).join(' ');
  const overnightEn = remarkTextEn.match(/Hourly Rate\s*\(([^)]+)\)\s*-\s*Weekday:\s*\$(\d+).*?\$(\d+)/);
  if (overnightEn) notesEn.splice(1, 0, `00:00–06:59: HK$${overnightEn[2]} weekdays; HK$${overnightEn[3]} on weekends and public holidays.`);
  if (/extra \$10/i.test(remarkTextEn)) notesEn.push('Entry during specified special sessions may add HK$10 to hourly, 12-hour and 24-hour transactions; check the entrance notice.');

  const hourlySummary = formatPairs(hourly.slice(0, 2), true);
  const englishHourly = formatEnglishPairs((hourlyEn.length ? hourlyEn : hourly).slice(0, 2), '/hr');
  return {
    sourceUrl: website,
    sourceLabel: { 'zh-Hant': '領展官方價目', en: 'Link official parking rates' },
    checkedAt,
    cardSummary: { 'zh-Hant': `領展官方：${hourlySummary}`, en: `Link official: ${englishHourly}` },
    hourlySummary: { 'zh-Hant': hourlySummary, en: englishHourly },
    detailNotes: { 'zh-Hant': notes, en: notesEn },
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const output = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      output[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return output;
}

export async function buildLinkOperatorRates(records, { fetchImpl = fetch, checkedAt = new Date().toISOString().slice(0, 10), concurrency = 8 } = {}) {
  const candidates = records.map((record) => ({ record, facilityKey: getLinkFacilityKey(record.website) })).filter(({ facilityKey }) => facilityKey);
  const resolved = await mapWithConcurrency(candidates, concurrency, async ({ record, facilityKey }) => {
    let failure;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetchImpl(`${LINK_RATE_API_BASE}${facilityKey}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error(`Link returned ${response.status}`);
        const privateCar = parseLinkOperatorRate(record.website, await response.json(), checkedAt);
        return privateCar ? [record.park_Id, { privateCar }] : undefined;
      } catch (error) {
        failure = error;
      }
    }
    console.warn(`Skipping Link rate ${record.park_Id}: ${failure instanceof Error ? failure.message : failure}`);
    return undefined;
  });
  const operatorRates = Object.fromEntries(resolved.filter(Boolean));
  if (Object.keys(operatorRates).length !== candidates.length) throw new Error(`Link returned incomplete private-car rate records (${Object.keys(operatorRates).length}/${candidates.length})`);
  return { source: '領展官方公開泊車資料', generatedAt: new Date().toISOString(), checkedAt, attempted: candidates.length, records: operatorRates };
}

export async function buildSinoOperatorRates(records, { fetchImpl = fetch, checkedAt = new Date().toISOString().slice(0, 10) } = {}) {
  const [zhResponse, enResponse] = await Promise.all([
    fetchImpl(SINO_PORTFOLIO_URL, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) }),
    fetchImpl(SINO_PORTFOLIO_EN_URL, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30_000) }),
  ]);
  if (!zhResponse.ok || !enResponse.ok) throw new Error(`Sino returned ${zhResponse.status}/${enResponse.status}`);
  const [zhProperties, enProperties] = await Promise.all([
    zhResponse.text().then((html) => extractJsonArray(html, 'properties: ')),
    enResponse.text().then((html) => extractJsonArray(html, 'properties: ')),
  ]);
  const englishBySlug = new Map(enProperties.map((property) => [property.url_slug, property]));
  const candidates = records.filter((record) => record.website && new URL(record.website).hostname.endsWith('sino-propertyservices.com'));
  const operatorRates = Object.fromEntries(candidates.flatMap((record) => {
    const zhProperty = zhProperties.find((property) => normaliseName(property.title) === normaliseName(record.name));
    const enProperty = zhProperty && englishBySlug.get(zhProperty.url_slug);
    const zhLines = zhProperty && privateCarLines(zhProperty.hourly_parking_description, /私家車/);
    const enLines = enProperty && privateCarLines(enProperty.hourly_parking_description, /Private Car/i);
    const zhHourly = (zhLines ?? []).filter((line) => /\$[\d,]+\s*\/\s*小時/.test(line));
    const enHourly = (enLines ?? []).filter((line) => /\$[\d,]+\s*\/\s*(?:hr|hour)/i.test(line));
    if (!zhProperty || !zhHourly.length) return [];
    const zhSummary = zhHourly.slice(0, 2).join('；');
    const enSummary = (enHourly.length ? enHourly : zhHourly).slice(0, 2).join('; ');
    return [[record.park_Id, { privateCar: {
      sourceUrl: record.website,
      sourceLabel: { 'zh-Hant': '信和官方價目', en: 'Sino official parking rates' },
      checkedAt,
      cardSummary: { 'zh-Hant': `信和官方：${zhSummary}`, en: `Sino official: ${enSummary}` },
      hourlySummary: { 'zh-Hant': zhSummary, en: enSummary },
      detailNotes: { 'zh-Hant': zhLines, en: enLines?.length ? enLines : zhLines },
    } }]];
  }));
  if (Object.keys(operatorRates).length !== candidates.length) throw new Error(`Sino returned incomplete name-matched rates (${Object.keys(operatorRates).length}/${candidates.length})`);
  return { source: '信和管業優勢官方泊車服務資料', generatedAt: new Date().toISOString(), checkedAt, attempted: candidates.length, records: operatorRates };
}
