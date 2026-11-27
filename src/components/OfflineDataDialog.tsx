import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { publicAsset } from '../api/site';
import { OFFLINE_DATA_CACHE_NAME, OFFLINE_DATASETS, type OfflineDatasetId } from '../domain/offlineData';
import { text, type Language } from '../i18n';
import './OfflineDataDialog.css';

type Props = { language: Language; onClose: () => void };
type SavedCounts = Partial<Record<OfflineDatasetId, number>>;

function datasetUrls(files: readonly string[]) {
  return files.map((file) => new URL(publicAsset(file), window.location.href).href);
}

export function OfflineDataDialog({ language, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const busyRef = useRef(false);
  const closeRef = useRef(onClose);
  const languageRef = useRef(language);
  closeRef.current = onClose;
  languageRef.current = language;

  const [selected, setSelected] = useState<OfflineDatasetId[]>(['toilets']);
  const [savedCounts, setSavedCounts] = useState<SavedCounts>({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  busyRef.current = busy;

  const readSavedCounts = async () => {
    const cache = await window.caches.open(OFFLINE_DATA_CACHE_NAME);
    const counts: SavedCounts = {};
    const savedIds: OfflineDatasetId[] = [];
    for (const dataset of OFFLINE_DATASETS) {
      let saved = 0;
      for (const url of datasetUrls(dataset.files)) {
        if (await cache.match(url)) saved += 1;
      }
      counts[dataset.id] = saved;
      if (saved === dataset.files.length) savedIds.push(dataset.id);
    }
    return { counts, savedIds };
  };

  useEffect(() => {
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
    };
    window.addEventListener('keydown', closeOnEscape);
    let active = true;
    void readSavedCounts()
      .then(({ counts, savedIds }) => {
        if (!active) return;
        setSavedCounts(counts);
        if (savedIds.length) setSelected(savedIds);
      })
      .catch(() => { if (active) setError(text(languageRef.current, 'offlineStorageUnavailable')); })
      .finally(() => { if (active) setLoadingStatus(false); });
    return () => {
      active = false;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const toggleDataset = (id: OfflineDatasetId) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setStatus('');
    setError('');
  };

  const saveSelected = async () => {
    if (!selected.length) {
      setError(text(language, 'offlineChooseAtLeastOne'));
      return;
    }
    if (!('caches' in window)) {
      setError(text(language, 'offlineStorageUnavailable'));
      return;
    }
    const datasets = OFFLINE_DATASETS.filter((dataset) => selected.includes(dataset.id));
    const total = datasets.reduce((sum, dataset) => sum + dataset.files.length, 0);
    setBusy(true);
    setError('');
    setStatus('');
    setProgress({ done: 0, total });
    let done = 0;
    let failed = 0;
    try {
      const cache = await window.caches.open(OFFLINE_DATA_CACHE_NAME);
      for (const dataset of datasets) {
        for (const url of datasetUrls(dataset.files)) {
          try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await response.clone().json();
            await cache.put(url, response.clone());
          } catch {
            failed += 1;
          }
          done += 1;
          setProgress({ done, total });
        }
      }
      const { counts, savedIds } = await readSavedCounts();
      setSavedCounts(counts);
      if (savedIds.length) setSelected(savedIds);
      if (failed) setError(text(language, 'offlineSomeDownloadsFailed', { count: failed }));
      else setStatus(text(language, 'offlineDownloadComplete', { count: total }));
    } catch {
      setError(text(language, 'offlineStorageUnavailable'));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="help-backdrop offline-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section ref={dialogRef} className="help-dialog offline-dialog" role="dialog" aria-modal="true" aria-labelledby="offline-title" tabIndex={-1}>
        <div className="help-dialog-heading">
          <div><p className="eyebrow">PARKPULSE HK</p><h2 id="offline-title">{text(language, 'offlineDataTitle')}</h2></div>
          <button type="button" className="close-help" onClick={onClose} disabled={busy} aria-label={text(language, 'helpClose')}>×</button>
        </div>
        <p className="help-intro">{text(language, 'offlineDataIntro')}</p>
        <div className="offline-datasets" role="group" aria-label={text(language, 'offlineDataChoose')}>
          {OFFLINE_DATASETS.map((dataset) => {
            const saved = savedCounts[dataset.id] ?? 0;
            const total = dataset.files.length;
            const stateKey = saved === total ? 'offlineSaved' : saved > 0 ? 'offlinePartiallySaved' : 'offlineNotSaved';
            return <label className="offline-category" key={dataset.id}>
              <input type="checkbox" checked={selected.includes(dataset.id)} disabled={busy} onChange={() => toggleDataset(dataset.id)} />
              <span className="offline-category-copy"><strong>{text(language, dataset.titleKey)}</strong><small>{text(language, dataset.descriptionKey)}</small></span>
              <span className={`offline-category-state${saved === total ? ' is-saved' : ''}`}>{loadingStatus ? '…' : text(language, stateKey, { saved, total })}</span>
            </label>;
          })}
        </div>
        <p className="offline-note">{text(language, 'offlineDataLimit')}</p>
        {progress && busy && <p className="offline-progress" role="status">{text(language, 'offlineDownloadProgress', progress)}</p>}
        {status && <p className="offline-success" role="status">{status}</p>}
        {error && <p className="offline-error" role="alert">{error}</p>}
        <div className="offline-actions">
          <button type="button" className="help-done" onClick={() => void saveSelected()} disabled={busy || loadingStatus || !selected.length}>{busy ? text(language, 'offlineSaving') : text(language, 'offlineSaveSelected')}</button>
          <button type="button" className="offline-close-action" onClick={onClose} disabled={busy}>{text(language, 'helpClose')}</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
