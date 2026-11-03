import { useId } from 'react';
import type { WaterEnvironment } from '../domain/drinkingWater';
import { text, type Language } from '../i18n';
import { ScreenOverlay } from './ScreenOverlay';
import './WaterEnvironmentPicker.css';

type Props = {
  language: Language;
  value: WaterEnvironment;
  onChange: (value: WaterEnvironment) => void;
  onClose: () => void;
};

const options = [
  { value: 'all', label: 'waterAll' },
  { value: 'indoor', label: 'waterIndoor' },
  { value: 'outdoor', label: 'waterOutdoor' },
] as const;

export function WaterEnvironmentPicker({ language, value, onChange, onClose }: Props) {
  const id = useId();
  const titleId = `${id}-title`;
  const name = `${id}-environment`;

  function choose(environment: WaterEnvironment) {
    onChange(environment);
    onClose();
  }

  return <ScreenOverlay>
    <div
      className="water-environment-picker-backdrop"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => {
        // Wait for the completed click before unmounting the backdrop.
        // Portal events must not reach controls in the underlying React tree.
        event.stopPropagation();
        if (event.target === event.currentTarget) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <section
        className="water-environment-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        lang={language}
        tabIndex={-1}
      >
        <header className="water-environment-picker__header">
          <h2 id={titleId}>{text(language, 'waterEnvironment')}</h2>
          <button className="water-environment-picker__close" type="button" onClick={onClose}>
            <span aria-hidden="true">×</span>
            <span>{text(language, 'closeScreen')}</span>
          </button>
        </header>
        <div className="water-environment-picker__options" role="radiogroup" aria-labelledby={titleId}>
          {options.map((option) => <label
            key={option.value}
            className="water-environment-picker__option"
            data-selected={value === option.value}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => choose(option.value)}
              onClick={() => {
                // A checked radio does not emit change, but choosing it still finishes.
                if (value === option.value) choose(option.value);
              }}
            />
            <span>{text(language, option.label)}</span>
          </label>)}
        </div>
      </section>
    </div>
  </ScreenOverlay>;
}
