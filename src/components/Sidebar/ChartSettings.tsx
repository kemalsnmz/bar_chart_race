import { useChartStore } from '../../store/chartStore';
import { palettes } from '../../utils/colorPalettes';
import type { PaletteName } from '../../utils/colorPalettes';

export function ChartSettings() {
  const { settings, updateSettings } = useChartStore();

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
        </div>
        <h2>Chart Settings</h2>
      </div>

      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          type="text"
          className="form-input"
          value={settings.title}
          onChange={(e) => updateSettings({ title: e.target.value })}
        />
      </div>

      <div className="form-row">
        <div>
          <label className="form-label">Max Bars</label>
          <input
            type="number"
            className="form-input"
            min={3}
            max={20}
            value={settings.maxBars}
            onChange={(e) => updateSettings({ maxBars: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="form-label">Duration (ms)</label>
          <input
            type="number"
            className="form-input"
            min={300}
            max={3000}
            step={100}
            value={settings.durationMs}
            onChange={(e) => updateSettings({ durationMs: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="form-row">
        <div>
          <label className="form-label">Unit</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. $, %"
            value={settings.unit}
            onChange={(e) => updateSettings({ unit: e.target.value })}
          />
        </div>
        <div>
          <label className="form-label">Color Palette</label>
          <select
            className="form-select"
            value={settings.palette}
            onChange={(e) => updateSettings({ palette: e.target.value as PaletteName })}
          >
            {Object.keys(palettes).map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
