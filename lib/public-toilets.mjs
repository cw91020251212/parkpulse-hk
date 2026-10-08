const HONG_KONG_BOUNDS = { minLat: 22.13, maxLat: 22.57, minLng: 113.8, maxLng: 114.5 };

function decodeXml(value) {
  const decodeNumber = (raw, radix) => {
    const codePoint = Number.parseInt(raw, radix);
    return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '';
  };

  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => decodeNumber(value, 16))
    .replace(/&#(\d+);/g, (_, value) => decodeNumber(value, 10))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity]);
}

function textFor(block, tag) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? decodeXml(match[1]).replace(/<[^>]*>/g, '').trim() : undefined;
}

function optionalText(value) {
  return value && !['N/A', 'NA', '-'].includes(value.toUpperCase()) ? value : undefined;
}

function coordinatesFor(value) {
  const [latitude, longitude] = (value ?? '').split(',').map((part) => Number(part.trim()));
  const { minLat, maxLat, minLng, maxLng } = HONG_KONG_BOUNDS;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < minLat || latitude > maxLat || longitude < minLng || longitude > maxLng) return null;
  return { latitude, longitude };
}

export function parsePublicToilets(xml) {
  if (typeof xml !== 'string') return [];
  const records = [];
  const maps = xml.matchAll(/<map\b[^>]*>([\s\S]*?)<\/map>/gi);

  for (const match of maps) {
    const block = match[1];
    if (textFor(block, 'map_type') !== 'toilet') continue;
    const name = optionalText(textFor(block, 'name_c'));
    const coordinates = coordinatesFor(textFor(block, 'map_coordinate'));
    if (!name || !coordinates) continue;

    records.push({
      id: optionalText(textFor(block, 'mapID')) ?? `${coordinates.latitude},${coordinates.longitude}:${name}`,
      name,
      address: optionalText(textFor(block, 'address_c')),
      openingHours: optionalText(textFor(block, 'openHr_c')),
      remarks: optionalText(textFor(block, 'remarks_c')),
      updatedAt: optionalText(textFor(block, 'updateDate')),
      ...coordinates,
    });
  }

  return records;
}
