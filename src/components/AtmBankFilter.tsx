import { useId, useMemo, useState } from 'react';
import { filterAtmBankOptions, shortBankName, toggleAtmBank } from '../domain/atmBanks';
import { text, type Language } from '../i18n';
import './AtmBankFilter.css';
import { ScreenOverlay } from './ScreenOverlay';

type Props = {
  language: Language;
  banks: readonly string[];
  selectedBanks: readonly string[];
  bankCounts: ReadonlyMap<string, number>;
  scopedTotal: number;
  scopeLabel: string;
  onChange: (banks: string[]) => void;
  onClose?: () => void;
  onComplete?: () => void;
};

export function AtmBankFilter({ language, banks, selectedBanks, bankCounts, scopedTotal, scopeLabel, onChange, onClose, onComplete }: Props) {
  const id = useId();
  const [query, setQuery] = useState('');
  const visibleBanks = useMemo(() => filterAtmBankOptions(banks, query), [banks, query]);
  const allBanks = selectedBanks.length === 0;
  const closeLabel = language === 'en' ? 'Close bank selection' : '關閉銀行選擇';

  return <ScreenOverlay><section className="atm-bank-filter atm-bank-multiselect atm-bank-picker" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint ${id}-scope`}>
    <header className="atm-bank-picker__header">
      <div className="atm-bank-multiselect__heading">
        <strong id={`${id}-title`}>{text(language, 'atmBank')}</strong>
        <button className="atm-bank-picker__close" type="button" aria-label={closeLabel} onClick={onClose}>
          <span aria-hidden="true">×</span>
          <span>{closeLabel}</span>
        </button>
      </div>
      <div className="atm-bank-picker__context">
        <span role="status">{allBanks ? text(language, 'allBanks') : text(language, 'atmBanksSelected', { count: selectedBanks.length })}</span>
        <button className="atm-bank-multiselect__button atm-bank-picker__all" type="button" aria-pressed={allBanks} onClick={() => { onChange([]); setQuery(''); }}>
          <span>{text(language, 'allBanks')} <span className="atm-bank-multiselect__count">({scopedTotal})</span></span>
        </button>
      </div>
      <p id={`${id}-hint`}>{text(language, 'atmBankHint')}</p>
      <p id={`${id}-scope`} className="atm-bank-multiselect__scope">{scopeLabel}</p>
    </header>
    <div className="atm-bank-picker__body">
      <label className="atm-bank-multiselect__search" htmlFor={`${id}-search`}>
        <span>{text(language, 'atmBankSearch')}</span>
        <input id={`${id}-search`} type="search" name="atm-bank-name-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text(language, 'atmBankSearch')} autoComplete="off" spellCheck={false} aria-describedby={`${id}-hint`} />
      </label>
      <div className="atm-bank-multiselect__options" role="group" aria-label={text(language, 'atmBank')} aria-describedby={`${id}-hint ${id}-scope`}>
        {visibleBanks.map((bank) => <button key={bank} className="atm-bank-multiselect__button" type="button" aria-pressed={selectedBanks.includes(bank)} title={bank} onClick={() => onChange(toggleAtmBank(selectedBanks, bank))}>
          <span className="atm-bank-multiselect__name">{shortBankName(bank)} <span className="atm-bank-multiselect__count">({bankCounts.get(bank) ?? 0})</span></span>
          <span className="atm-bank-multiselect__check" aria-hidden="true">{selectedBanks.includes(bank) ? '✓' : ''}</span>
        </button>)}
        {query.trim() && visibleBanks.length === 0 && <p role="status">{text(language, 'atmBankNoMatches')}</p>}
        {selectedBanks.length > 0 && <p className="atm-bank-multiselect__selection">{text(language, 'atmBankMap', { bank: selectedBanks.map(shortBankName).join(language === 'en' ? ', ' : '、') })}</p>}
      </div>
    </div>
    <div className="atm-bank-picker__footer">
      <button className="atm-bank-picker__complete" type="button" onClick={onComplete}>{language === 'en' ? 'Done, view map' : '完成，查看地圖'}</button>
    </div>
  </section></ScreenOverlay>;
}
