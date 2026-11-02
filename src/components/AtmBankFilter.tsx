import { useId, useMemo, useState } from 'react';
import { filterAtmBankOptions, shortBankName, toggleAtmBank } from '../domain/atmBanks';
import { text, type Language } from '../i18n';
import './AtmBankFilter.css';

type Props = {
  language: Language;
  banks: readonly string[];
  selectedBanks: readonly string[];
  bankCounts: ReadonlyMap<string, number>;
  scopedTotal: number;
  scopeLabel: string;
  onChange: (banks: string[]) => void;
};

export function AtmBankFilter({ language, banks, selectedBanks, bankCounts, scopedTotal, scopeLabel, onChange }: Props) {
  const id = useId();
  const [query, setQuery] = useState('');
  const visibleBanks = useMemo(() => filterAtmBankOptions(banks, query), [banks, query]);
  const allBanks = selectedBanks.length === 0;

  return <section className="atm-bank-filter atm-bank-multiselect" aria-labelledby={`${id}-title`}>
    <div className="atm-bank-multiselect__heading">
      <strong id={`${id}-title`}>{text(language, 'atmBank')}</strong>
      <span role="status">{allBanks ? text(language, 'allBanks') : text(language, 'atmBanksSelected', { count: selectedBanks.length })}</span>
      <button className="atm-bank-multiselect__button" type="button" aria-pressed={allBanks} onClick={() => { onChange([]); setQuery(''); }}>
        <span>{text(language, 'allBanks')}</span><b>{scopedTotal}</b>
      </button>
    </div>
    <p id={`${id}-hint`}>{text(language, 'atmBankHint')}</p>
    <label className="atm-bank-multiselect__search" htmlFor={`${id}-search`}>
      <span>{text(language, 'atmBankSearch')}</span>
      <input id={`${id}-search`} type="search" name="atm-bank-name-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text(language, 'atmBankSearch')} autoComplete="off" spellCheck={false} aria-describedby={`${id}-hint`} />
    </label>
    <p id={`${id}-scope`} className="atm-bank-multiselect__scope">{scopeLabel}</p>
    <div className="atm-bank-multiselect__options" role="group" aria-label={text(language, 'atmBank')} aria-describedby={`${id}-hint ${id}-scope`}>
      {visibleBanks.map((bank) => <button key={bank} className="atm-bank-multiselect__button" type="button" aria-pressed={selectedBanks.includes(bank)} title={bank} onClick={() => onChange(toggleAtmBank(selectedBanks, bank))}>
        <span className="atm-bank-multiselect__check" aria-hidden="true">{selectedBanks.includes(bank) ? '✓' : '+'}</span>
        <span>{shortBankName(bank)}</span><b>{bankCounts.get(bank) ?? 0}</b>
      </button>)}
      {query.trim() && visibleBanks.length === 0 && <p role="status">{text(language, 'atmBankNoMatches')}</p>}
    </div>
    {selectedBanks.length > 0 && <p className="atm-bank-multiselect__selection">{text(language, 'atmBankMap', { bank: selectedBanks.map(shortBankName).join(language === 'en' ? ', ' : '、') })}</p>}
  </section>;
}
