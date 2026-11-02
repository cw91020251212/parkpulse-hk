export const ATM_RESULT_LIMIT = 50;

type AtmBankCandidate = {
  facility: { kind: string; brand?: string };
  distanceKm: number;
};

export const shortBankName = (bank: string) => bank.replace(/\(香港\)\s*/g, '').replace(/\s*有限公司$/, '');

/** Empty selections mean all banks; never persist blanks or duplicate bank names. */
export function normalizeAtmSelectedBanks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((bank): bank is string => typeof bank === 'string').map((bank) => bank.trim()).filter(Boolean))];
}

/** The new preference is authoritative, including an explicitly empty array. */
export function readAtmSelectedBanks(preferences: unknown): string[] {
  if (!preferences || typeof preferences !== 'object') return [];
  const saved = preferences as { atmSelectedBanks?: unknown; atmBank?: unknown };
  if (Object.prototype.hasOwnProperty.call(saved, 'atmSelectedBanks')) {
    return normalizeAtmSelectedBanks(saved.atmSelectedBanks);
  }
  return typeof saved.atmBank === 'string' ? normalizeAtmSelectedBanks([saved.atmBank]) : [];
}

export function toggleAtmBank(selectedBanks: readonly string[], bank: string): string[] {
  const current = normalizeAtmSelectedBanks(selectedBanks);
  const name = bank.trim();
  if (!name) return current;
  return current.includes(name) ? current.filter((selected) => selected !== name) : [...current, name];
}

export function matchesAtmBank(brand: string | undefined, selectedBanks: readonly string[]): boolean {
  return selectedBanks.length === 0 || (brand !== undefined && selectedBanks.includes(brand));
}

const normalizeBankSearch = (value: string) => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');

/** Search bank names only; this query does not filter ATM results or enter preferences. */
export function filterAtmBankOptions(banks: readonly string[], query: string): string[] {
  const needle = normalizeBankSearch(query.trim());
  return banks.filter((bank) => !needle || normalizeBankSearch(bank).includes(needle) || normalizeBankSearch(shortBankName(bank)).includes(needle));
}

/** Call with complete in-scope candidates, before any bank filtering or display limit. */
export function countAtmBanks(candidates: readonly AtmBankCandidate[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const { facility } of candidates) {
    if (facility.kind === 'atm' && facility.brand) counts.set(facility.brand, (counts.get(facility.brand) ?? 0) + 1);
  }
  return counts;
}

/** OR-union first, nearest-first second, and the shared map/list limit last. */
export function selectAtmBankResults<T extends AtmBankCandidate>(candidates: readonly T[], selectedBanks: readonly string[]): { items: T[]; total: number } {
  const matching = candidates
    .filter(({ facility }) => facility.kind === 'atm' && matchesAtmBank(facility.brand, selectedBanks))
    .sort((left, right) => left.distanceKm - right.distanceKm);
  return { items: matching.slice(0, ATM_RESULT_LIMIT), total: matching.length };
}
