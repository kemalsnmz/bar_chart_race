import { useState } from 'react';
import { useChartStore } from '../../store/chartStore';
import type { ColorMode, TextAlign } from '../../store/chartStore';
import { palettes } from '../../utils/colorPalettes';
import type { PaletteName } from '../../utils/colorPalettes';
import { ColorPicker } from './ColorPicker';
import { PresetPaletteSelector } from './PresetPaletteSelector';

// ── Collapsible section ────────────────────────────────
function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="fl-section">
      <button className="fl-section-hdr" onClick={() => setOpen(o => !o)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .18s ease', flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span style={{ fontWeight: 700 }}>{title}</span>
      </button>
      {open && <div className="fl-section-body">{children}</div>}
    </div>
  );
}

// ── Sub-heading divider ────────────────────────────────
function SubHeading({ label }: { label: string }) {
  return (
    <div className="fl-sub-heading">
      <span>{label}</span>
      <div className="fl-sub-line" />
    </div>
  );
}

// ── Color tab button ───────────────────────────────────
function ColorTab({ id, active, onClick, children }: {
  id: ColorMode; active: boolean; onClick: (id: ColorMode) => void; children: React.ReactNode;
}) {
  return (
    <button
      className={'fl-color-tab' + (active ? ' fl-color-tab-active' : '')}
      onClick={() => onClick(id)}
    >{children}</button>
  );
}

// ── Main panel ─────────────────────────────────────────
export function SettingsPanel() {
  const { settings, updateSettings, data } = useChartStore();

  const allEntities = [...new Set(data.map(d => d.name))];
  const allCategories = [...new Set(data.map(d => d.category ?? '(no category)'))];

  return (
    <div className="fl-panel">

      {/* ── Top title ── */}
      <div className="fl-title-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <span>Settings</span>
      </div>

      {/* ════ Color section ════ */}
      <Section title="Color">

        {/* — Background — */}
        <SubHeading label="Background" />
        <ColorPicker
          value={settings.backgroundColor}
          onChange={color => updateSettings({ backgroundColor: color })}
        />

        {/* — Bars — */}
        <SubHeading label="Bars" />
        <div className="fl-tabs">
          <ColorTab id="category" active={settings.colorMode === 'category'} onClick={m => updateSettings({ colorMode: m })}>By category</ColorTab>
          <ColorTab id="bar"      active={settings.colorMode === 'bar'}      onClick={m => updateSettings({ colorMode: m })}>By bar</ColorTab>
          <ColorTab id="single"   active={settings.colorMode === 'single'}   onClick={m => updateSettings({ colorMode: m })}>Single</ColorTab>
        </div>

        {/* By category */}
        {settings.colorMode === 'category' && (
          <div className="fl-color-body">
            {allCategories.length === 0 || (allCategories.length === 1 && allCategories[0] === '(no category)') ? (
              <p className="fl-hint" style={{ marginBottom: 10 }}>No categories in data. Add a "Category" column to group bars by color.</p>
            ) : (
              <div className="fl-entity-list" style={{ marginBottom: 10 }}>
                {allCategories.map((cat, i) => {
                  const pal = palettes[settings.palette as PaletteName];
                  return (
                    <div key={cat} className="fl-entity-row">
                      <span className="fl-entity-dot" style={{ background: pal[i % pal.length] }} />
                      <span className="fl-entity-name">{cat}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <PresetPaletteSelector
              value={settings.palette as PaletteName}
              onChange={p => updateSettings({ palette: p })}
            />
          </div>
        )}

        {/* By bar */}
        {settings.colorMode === 'bar' && (
          <div className="fl-color-body">
            <PresetPaletteSelector
              value={settings.palette as PaletteName}
              onChange={p => updateSettings({ palette: p })}
            />
          </div>
        )}

        {/* Single */}
        {settings.colorMode === 'single' && (
          <div className="fl-color-body">
            <p className="fl-hint" style={{ marginBottom: 8 }}>
              One rule per line: <strong>Name: #hex</strong>
            </p>
            <textarea
              className="fl-single-textarea"
              value={settings.singleColorText}
              onChange={e => updateSettings({ singleColorText: e.target.value })}
              spellCheck={false}
              placeholder={'Apple: #6c63ff\nAmazon: #f7971e'}
            />
          </div>
        )}

      </Section>

      {/* ════ Text ════ */}
      <Section title="Text">

        <SubHeading label="Title" />

        {/* Title input */}
        <div className="fl-field">
          <input className="form-input" value={settings.title}
            onChange={e => updateSettings({ title: e.target.value })}
            placeholder="Chart title…" />
        </div>

        {/* Alignment */}
        <div className="fl-field">
          <label className="fl-tiny-label">Alignment</label>
          <div className="fl-tabs" style={{ marginTop: 4 }}>
            {(['left', 'center', 'right'] as TextAlign[]).map(align => (
              <button
                key={align}
                className={'fl-color-tab' + (settings.titleAlign === align ? ' fl-color-tab-active' : '')}
                onClick={() => updateSettings({ titleAlign: align })}
                title={align.charAt(0).toUpperCase() + align.slice(1)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}
              >
                {align === 'left' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
                  </svg>
                )}
                {align === 'center' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                  </svg>
                )}
                {align === 'right' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bold toggle */}
        <div className="fl-field">
          <label className="fl-tiny-label">Weight</label>
          <div className="fl-tabs" style={{ marginTop: 4 }}>
            <button
              className={'fl-color-tab' + (!settings.titleBold ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ titleBold: false })}
              style={{ flex: 1, fontWeight: 400 }}
            >Normal</button>
            <button
              className={'fl-color-tab' + (settings.titleBold ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ titleBold: true })}
              style={{ flex: 1, fontWeight: 700 }}
            >Bold</button>
          </div>
        </div>

        {/* Font size */}
        <div className="fl-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Font size</label>
            <span className="fl-val-badge">{settings.titleFontSize}</span>
          </div>
          <input type="range" className="fl-slider" min={20} max={80} step={1}
            value={settings.titleFontSize}
            onChange={e => updateSettings({ titleFontSize: Number(e.target.value) })} />
          <div className="fl-slider-ends"><span>Small</span><span>Large</span></div>
        </div>

      </Section>

      {/* ════ Bars ════ */}
      <Section title="Bars" defaultOpen={false}>
        <div className="fl-field">
          <label className="fl-tiny-label">Max visible bars</label>
          <input type="number" className="form-input" min={3} max={20}
            value={settings.maxBars}
            onChange={e => updateSettings({ maxBars: Number(e.target.value) })} />
        </div>
        <div className="fl-field">
          <label className="fl-tiny-label">Unit</label>
          <input className="form-input" placeholder="e.g. B$, %" value={settings.unit}
            onChange={e => updateSettings({ unit: e.target.value })} />
        </div>
      </Section>

      {/* ════ Animation ════ */}
      <Section title="Animation" defaultOpen={false}>
        <div className="fl-field">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
            <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Duration per period</label>
            <span className="fl-val-badge">{settings.durationMs} ms</span>
          </div>
          <input type="range" className="fl-slider" min={300} max={3000} step={100}
            value={settings.durationMs}
            onChange={e => updateSettings({ durationMs: Number(e.target.value) })} />
          <div className="fl-slider-ends"><span>Fast</span><span>Slow</span></div>
        </div>
      </Section>

    </div>
  );
}
