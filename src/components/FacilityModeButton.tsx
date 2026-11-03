import { useEffect, useRef, useState } from 'react';
import { text, type Language } from '../i18n';
import type { NearbyMode } from '../types';
import './FacilityModeButton.css';

export const FACILITY_EDIT_HINT_MS = 5_000;
export type EditableFacilityMode = 'atm' | 'drinkingWater';
export const canEditFacility = (mode: NearbyMode): mode is EditableFacilityMode => mode === 'atm' || mode === 'drinkingWater';

type Props = {
  language: Language;
  mode: NearbyMode;
  label: string;
  active: boolean;
  loading: boolean;
  editing: boolean;
  onToggle: () => void;
  onEdit: (mode: EditableFacilityMode) => void;
};

/** The secondary action never adds a row above the map or changes the primary toggle. */
export function FacilityModeButton({ language, mode, label, active, loading, editing, onToggle, onEdit }: Props) {
  const editable = canEditFacility(mode);
  const [visible, setVisible] = useState(active && editable);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const showEdit = active && editable && visible;

  useEffect(() => {
    setVisible(active && editable);
    if (!active) { setFocused(false); setPressed(false); }
  }, [active, editable]);

  useEffect(() => {
    if (!showEdit || focused || pressed || editing) return;
    const timer = window.setTimeout(() => setVisible(false), FACILITY_EDIT_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [showEdit, focused, pressed, editing]);

  useEffect(() => {
    if (!showEdit) return;
    // Reveal the edit target horizontally without scrolling the page or moving the map.
    const frame = requestAnimationFrame(() => {
      const track = ref.current?.closest<HTMLElement>('.filter-scroll-track');
      const wrapper = ref.current;
      if (!track || !wrapper || track.scrollWidth <= track.clientWidth) return;
      const a = wrapper.getBoundingClientRect(), b = track.getBoundingClientRect();
      const scale = b.width / track.offsetWidth || 1;
      if (a.right > b.right) track.scrollLeft += (a.right - b.right + 4) / scale;
      else if (a.left < b.left) track.scrollLeft -= (b.left - a.left + 4) / scale;
    });
    return () => cancelAnimationFrame(frame);
  }, [showEdit, loading, label]);

  return <span ref={ref} className={`facility-mode-choice${showEdit ? ' has-edit' : ''}`} data-facility={mode}>
    <button className={active ? 'chip is-on' : 'chip'} type="button" aria-pressed={active} onClick={onToggle}>
      {loading && active ? text(language, 'dataLoading') : label}
    </button>
    {showEdit && <button className="chip facility-edit-button" type="button" aria-haspopup="dialog" aria-expanded={editing}
      aria-label={text(language, 'editFacilityOptions', { label })}
      onFocus={event => setFocused(event.currentTarget.matches(':focus-visible'))} onBlur={() => setFocused(false)}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setPressed(true); }}
      onPointerUp={() => setPressed(false)} onPointerCancel={() => setPressed(false)} onLostPointerCapture={() => setPressed(false)}
      onClick={() => onEdit(mode)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z" /></svg>
      <span>{text(language, 'editFacility')}</span>
    </button>}
  </span>;
}
