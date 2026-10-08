function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function simplifyEpdRecord(record) {
  const latitude = Number(record?.location?.lat);
  const longitude = Number(record?.location?.lng);
  const name = typeof record?.car_park_name_cn === 'string' ? record.car_park_name_cn.trim() : '';
  if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const types = Array.isArray(record.by_charger_type)
    ? record.by_charger_type
      .map((item) => typeof item?.type_name_cn === 'string' ? item.type_name_cn.trim() : '')
      .filter(Boolean)
    : [];
  return {
    id: String(record.id ?? record.car_park_id ?? `${latitude},${longitude}`),
    name,
    address: typeof record.address_cn === 'string' ? record.address_cn.trim() : undefined,
    latitude,
    longitude,
    total: numberOrNull(record.number_of_chargers) ?? 0,
    available: numberOrNull(record.number_of_available_chargers),
    types,
    updatedAt: typeof record.last_update_date === 'string' ? record.last_update_date : undefined,
  };
}
