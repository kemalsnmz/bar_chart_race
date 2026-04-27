import { palettes, paletteLabels } from '../../utils/colorPalettes';
import type { PaletteName } from '../../utils/colorPalettes';

interface Props {
  value: PaletteName;
  onChange: (name: PaletteName) => void;
}

export function PresetPaletteSelector({ value, onChange }: Props) {
  const entries = Object.entries(palettes) as [PaletteName, string[]][];

  return (
    <div className="pps-wrap">
      <div className="pps-label">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="13" r="2.5"/>
          <circle cx="6" cy="13" r="2.5"/><circle cx="10" cy="19.5" r="2.5"/>
          <path d="M11.16 6.82L8.5 11M14.87 8.77L17 10.6M6.5 15.5l2.29 2.5M15 15.5l-3 2.5"/>
        </svg>
        Preset Palettes
      </div>

      <div className="pps-grid">
        {entries.map(([name, colors]) => {
          const active = value === name;
          return (
            <button
              key={name}
              className={'pps-card' + (active ? ' pps-card-active' : '')}
              onClick={() => onChange(name)}
              title={paletteLabels[name]}
            >
              <div className="pps-strip">
                {colors.slice(0, 6).map((c, i) => (
                  <span key={i} className="pps-chip" style={{ background: c }} />
                ))}
              </div>
              <span className="pps-name">{paletteLabels[name]}</span>
              {active && (
                <span className="pps-check">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
