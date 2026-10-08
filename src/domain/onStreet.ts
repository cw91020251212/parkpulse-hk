import type { OnStreetParkingGroup, OnStreetParkingRecordViewModel, OnStreetParkingViewModel } from '../types';

export const MAX_ON_STREET_RENDER = 120;

function streetName(name: string) {
  return name.replace(/^(咪錶位|路旁感應試行)\s*·\s*/, '');
}

function oneValue(values: Array<string | undefined>) {
  const unique = [...new Set(values.filter((value): value is string => Boolean(value)))];
  return unique.length === 1 ? unique[0] : undefined;
}

export function groupOnStreetResults(items: OnStreetParkingRecordViewModel[]) {
  const groups = new Map<string, OnStreetParkingRecordViewModel[]>();
  for (const item of items) {
    const key = `${item.onStreet.kind}:${streetName(item.onStreet.name)}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()].map<OnStreetParkingViewModel>(([id, members]) => {
    const first = members[0].onStreet;
    const vacant = members.filter(({ onStreet }) => onStreet.occupancy === 'vacant').length;
    const occupied = members.filter(({ onStreet }) => onStreet.occupancy === 'occupied').length;
    const unavailable = members.length - vacant - occupied;
    const sections = [...new Set(members.map(({ onStreet }) => onStreet.address).filter(Boolean))];
    const onStreet: OnStreetParkingGroup = {
      id,
      kind: first.kind,
      name: streetName(first.name),
      address: sections.length <= 1 ? (sections[0] ?? '') : `${streetName(first.name)} · ${sections.length} 路段`,
      sections,
      latitude: members.reduce((sum, { onStreet }) => sum + onStreet.latitude, 0) / members.length,
      longitude: members.reduce((sum, { onStreet }) => sum + onStreet.longitude, 0) / members.length,
      total: members.length,
      vacant,
      occupied,
      unavailable,
      occupancy: vacant > 0 ? 'vacant' : occupied > 0 ? 'occupied' : 'unavailable',
      operatingPeriod: oneValue(members.map(({ onStreet }) => onStreet.operatingPeriod)),
      timeUnit: oneValue(members.map(({ onStreet }) => onStreet.timeUnit)),
      paymentUnit: oneValue(members.map(({ onStreet }) => onStreet.paymentUnit)),
      source: first.source,
      snapshot: members.some(({ onStreet }) => onStreet.snapshot),
    };
    return { onStreet, distanceKm: Math.min(...members.map(({ distanceKm }) => distanceKm)) };
  }).sort((left, right) => left.distanceKm - right.distanceKm);
}

export function limitOnStreetResults(items: OnStreetParkingViewModel[], availableOnly: boolean) {
  const matching = availableOnly ? items.filter(({ onStreet }) => onStreet.vacant > 0) : items;
  return { total: matching.length, items: matching.slice(0, MAX_ON_STREET_RENDER) };
}
