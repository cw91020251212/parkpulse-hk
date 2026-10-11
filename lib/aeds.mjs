import { createHash } from 'node:crypto';

export const FSD_AED_API_URL = 'https://es.hkfsd.gov.hk/aed_api/export_aed.php?lang=TC';
export const FSD_AED_SOURCE_URL = 'https://data.gov.hk/en-data/dataset/hk-fsd-fsd1-fsdaedapi';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = '';
    } else value += character;
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function hashId(values) {
  return `fsd-aed-${createHash('sha256').update(values.join('|')).digest('hex').slice(0, 18)}`;
}

function value(record, column) {
  return String(record[column] ?? '').trim();
}

function validCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= 22.13 && latitude <= 22.57
    && longitude >= 113.8 && longitude <= 114.5;
}

export function buildFsdAeds(csvText, generatedAt = new Date().toISOString()) {
  const [headers = [], ...rows] = parseCsv(csvText.replace(/^\uFEFF/, ''));
  const records = [];
  const seen = new Set();
  let excludedNonPublic = 0;
  let excludedInvalid = 0;

  for (const cells of rows) {
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    if (value(record, 'Whether the AED can be used by anyone').toLowerCase() !== 'yes') {
      excludedNonPublic += 1;
      continue;
    }

    const name = value(record, 'AED Name');
    const address = value(record, 'AED Address');
    const detail = value(record, 'Detailed location of the AED installed');
    const latitude = Number(value(record, 'Location Google Map coordinate: latitude'));
    const longitude = Number(value(record, 'Location Google Map coordinate: longitude'));
    if (!name || !address || !validCoordinates(latitude, longitude)) {
      excludedInvalid += 1;
      continue;
    }

    const access = value(record, 'Person who has access to the AED');
    const operator = value(record, 'Person allowed to operate the AED');
    const remarks = [
      detail && `裝設位置：${detail}`,
      operator && `可操作 AED：${operator}`,
      access && `可接觸 AED：${access}`,
    ].filter(Boolean).join(' · ');
    const dedupeKey = [name, address, detail, latitude.toFixed(6), longitude.toFixed(6)].join('|');
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    records.push({
      id: hashId([dedupeKey]),
      kind: 'aed',
      name,
      address,
      latitude,
      longitude,
      openingHours: value(record, 'Service Hour Remark') || undefined,
      remarks: remarks || undefined,
      source: '消防處 CARE AED 官方登記快照',
      sourceUrl: FSD_AED_SOURCE_URL,
    });
  }

  records.sort((left, right) => left.name.localeCompare(right.name, 'zh-Hant') || left.address.localeCompare(right.address, 'zh-Hant'));
  return {
    source: '消防處 CARE AED 官方登記快照',
    sourceUrl: FSD_AED_SOURCE_URL,
    generatedAt,
    rawRecordCount: rows.length,
    excludedNonPublic,
    excludedInvalid,
    records,
  };
}
