import { useState } from 'react';
import { useChartStore } from '../../store/chartStore';
import type { ColorMode, TextAlign, ImageSizing, ImageShape, BarEndShape, TickerEntry, VideoEntry } from '../../store/chartStore';
import { palettes } from '../../utils/colorPalettes';
import type { PaletteName } from '../../utils/colorPalettes';
import { ColorPicker } from './ColorPicker';
import { PresetPaletteSelector } from './PresetPaletteSelector';

// ── Collapsible section ────────────────────────────────
function Section({ title, children, defaultOpen = false }: {
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
  const { settings, updateSettings, data, periods } = useChartStore();

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
        <div className="fl-sub-heading">
          <span>Bars</span>
          <div className="fl-sub-line" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span className="fl-tiny-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Opacity</span>
            <input type="number" className="form-input spinner-visible" min={0.1} max={1.0} step={0.1}
              value={settings.barOpacity}
              onChange={e => updateSettings({ barOpacity: Number(e.target.value) })}
              style={{ width: 52, textAlign: 'center', padding: '3px 4px' }} />
          </div>
        </div>

        {/* — Chart Style — */}
        <div className="fl-sub-heading" style={{ marginTop: 12 }}>
          <span>Chart Style</span>
          <div className="fl-sub-line" />
          <div className="fl-tabs" style={{ margin: 0, flexShrink: 0 }}>
            <button className={'fl-color-tab' + (settings.layout !== 'vertical' ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ layout: 'horizontal' })}>Horizontal</button>
            <button className={'fl-color-tab' + (settings.layout === 'vertical' ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ layout: 'vertical' })}>Vertical</button>
          </div>
        </div>

        <div className="fl-sub-heading" style={{ marginTop: 16 }}>
          <span>Color Mode</span>
          <div className="fl-sub-line" />
        </div>
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

        {/* — Title color — */}
        <div className="fl-sub-heading">
          <span>Title</span>
          <div className="fl-sub-line" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {settings.titleColor && (
              <button className="fl-color-tab" onClick={() => updateSettings({ titleColor: '' })}
                style={{ fontSize: 10, padding: '2px 6px' }}>Auto</button>
            )}
            <ColorPicker
              value={settings.titleColor || '#000000'}
              onChange={color => updateSettings({ titleColor: color })}
            />
          </div>
        </div>

        {/* — Label color — */}
        <div className="fl-sub-heading">
          <span>Label</span>
          <div className="fl-sub-line" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {settings.labelColor && (
              <button className="fl-color-tab" onClick={() => updateSettings({ labelColor: '' })}
                style={{ fontSize: 10, padding: '2px 6px' }}>Auto</button>
            )}
            <ColorPicker
              value={settings.labelColor || '#000000'}
              onChange={color => updateSettings({ labelColor: color })}
            />
          </div>
        </div>
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

      {/* ════ Background ════ */}
      <Section title="Background Image">
        <div className="fl-field">
          <div style={{ display: 'flex', gap: '8px', marginBottom: 6 }}>
            <label className="fl-tiny-label" style={{ marginBottom: 0, alignSelf: 'center' }}>Image</label>
            <input
              className="form-input"
              placeholder="https://..."
              value={settings.backgroundImageUrl || ''}
              onChange={e => updateSettings({ backgroundImageUrl: e.target.value, backgroundVideoUrl: '' })}
              style={{ flex: 1 }}
            />
            <label className="fl-color-tab" style={{ cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
              Upload
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) updateSettings({ backgroundImageUrl: URL.createObjectURL(file), backgroundVideoUrl: '' });
                }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: 6 }}>
            <label className="fl-tiny-label" style={{ marginBottom: 0, alignSelf: 'center' }}>Video</label>
            <label className="fl-color-tab" style={{ cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
              Upload video
              <input
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) updateSettings({ backgroundVideoUrl: URL.createObjectURL(file), backgroundImageUrl: '' });
                }}
              />
            </label>
            {settings.backgroundVideoUrl && (
              <span className="fl-tiny-label" style={{ marginBottom: 0, alignSelf: 'center', opacity: 0.6 }}>loaded</span>
            )}
          </div>

          {(settings.backgroundImageUrl || settings.backgroundVideoUrl) && (
            <button
              className="fl-color-tab"
              style={{ width: '100%', marginTop: 2 }}
              onClick={() => updateSettings({
                backgroundImageUrl: '',
                backgroundVideoUrl: '',
                backgroundOpacity: 1,
                backgroundTint: 0,
                backgroundMarginTop: 0,
                backgroundMarginRight: 0,
                backgroundMarginBottom: 0,
                backgroundMarginLeft: 0,
              })}
            >
              Clear
            </button>
          )}
        </div>

        {(settings.backgroundImageUrl || settings.backgroundVideoUrl) && (
          <>
            <div className="fl-field">
              <label className="fl-tiny-label">Opacity ({Math.round(settings.backgroundOpacity * 100)}%)</label>
              <input type="range" min="0" max="1" step="0.05"
                value={settings.backgroundOpacity}
                onChange={e => updateSettings({ backgroundOpacity: parseFloat(e.target.value) })}
              />
            </div>

            <div className="fl-field">
              <label className="fl-tiny-label">Dark Overlay Tint ({Math.round(settings.backgroundTint * 100)}%)</label>
              <input type="range" min="0" max="1" step="0.05"
                value={settings.backgroundTint}
                onChange={e => updateSettings({ backgroundTint: parseFloat(e.target.value) })}
              />
            </div>

            <div className="fl-sub-heading" style={{ marginTop: 16 }}>
              <span>Margins</span>
              <div className="fl-sub-line" />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="fl-field" style={{ marginBottom: 0 }}>
                <label className="fl-tiny-label">Top</label>
                <input className="form-input" type="number" 
                  value={settings.backgroundMarginTop}
                  onChange={e => updateSettings({ backgroundMarginTop: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="fl-field" style={{ marginBottom: 0 }}>
                <label className="fl-tiny-label">Bottom</label>
                <input className="form-input" type="number" 
                  value={settings.backgroundMarginBottom}
                  onChange={e => updateSettings({ backgroundMarginBottom: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="fl-field" style={{ marginBottom: 0 }}>
                <label className="fl-tiny-label">Left</label>
                <input className="form-input" type="number" 
                  value={settings.backgroundMarginLeft}
                  onChange={e => updateSettings({ backgroundMarginLeft: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="fl-field" style={{ marginBottom: 0 }}>
                <label className="fl-tiny-label">Right</label>
                <input className="form-input" type="number" 
                  value={settings.backgroundMarginRight}
                  onChange={e => updateSettings({ backgroundMarginRight: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </>
        )}
      </Section>

      {/* ════ Text ════ */}
      <Section title="Header">

        <div className="fl-sub-heading" style={{ marginBottom: 4 }}>
          <span>Title</span>
          <div className="fl-sub-line" />
          <div className="fl-tabs" style={{ margin: 0, flexShrink: 0 }}>
            <button className={'fl-color-tab' + (settings.titleVisible ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ titleVisible: true })}>On</button>
            <button className={'fl-color-tab' + (!settings.titleVisible ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ titleVisible: false })}>Off</button>
          </div>
        </div>

        {/* Title input */}
            <div className="fl-field" style={{ marginBottom: 4 }}>
              <input className="form-input" value={settings.title}
                onChange={e => updateSettings({ title: e.target.value })}
                placeholder="Chart title…" />
            </div>

            {/* Alignment */}
            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Alignment</label>
              <div className="fl-tabs" style={{ margin: 0 }}>
                {(['left', 'center', 'right'] as TextAlign[]).map(align => (
                  <button
                    key={align}
                    className={'fl-color-tab' + (settings.titleAlign === align ? ' fl-color-tab-active' : '')}
                    onClick={() => updateSettings({ titleAlign: align })}
                    title={align.charAt(0).toUpperCase() + align.slice(1)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Weight</label>
              <div className="fl-tabs" style={{ margin: 0 }}>
                <button
                  className={'fl-color-tab' + (!settings.titleBold ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ titleBold: false })}
                  style={{ fontWeight: 400 }}
                >Normal</button>
                <button
                  className={'fl-color-tab' + (settings.titleBold ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ titleBold: true })}
                  style={{ fontWeight: 700 }}
                >Bold</button>
              </div>
            </div>

            {/* Font size */}
            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Font size</label>
              <input
                type="number"
                className="form-input spinner-visible"
                min={20} max={80} step={1}
                value={settings.titleFontSize}
                onChange={e => updateSettings({ titleFontSize: Number(e.target.value) })}
                style={{ width: 64, textAlign: 'center', padding: '3px 4px' }}
              />
            </div>


      </Section>

      {/* ════ Image ════ */}
      <Section title="Image" defaultOpen={false}>

        {/* Height / Width / Margin right */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
          <div className="fl-field" style={{ flex: 1 }}>
            <label className="fl-tiny-label" style={{ fontSize: 9 }}>Height</label>
            <input type="number" className="form-input spinner-visible" min={8} max={200} step={1}
              value={settings.imageHeight}
              onChange={e => updateSettings({ imageHeight: Number(e.target.value) })}
              style={{ textAlign: 'center', padding: '3px 2px' }} />
          </div>
          <div className="fl-field" style={{ flex: 1 }}>
            <label className="fl-tiny-label" style={{ fontSize: 9 }}>Width</label>
            <input type="number" className="form-input spinner-visible" min={8} max={200} step={1}
              value={settings.imageWidth}
              onChange={e => updateSettings({ imageWidth: Number(e.target.value) })}
              style={{ textAlign: 'center', padding: '3px 2px' }} />
          </div>
          <div className="fl-field" style={{ flex: 1 }}>
            <label className="fl-tiny-label" style={{ fontSize: 9 }}>Margin right</label>
            <input type="number" className="form-input spinner-visible" min={-100} max={100} step={1}
              value={settings.imageMarginRight}
              onChange={e => updateSettings({ imageMarginRight: Number(e.target.value) })}
              style={{ textAlign: 'center', padding: '3px 2px' }} />
          </div>
        </div>

        {/* Position */}
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Position</label>
          <div className="fl-tabs" style={{ margin: 0 }}>
            <button
              className={'fl-color-tab' + (settings.imagePosition === 'left' ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ imagePosition: 'left' })}>
              Left
            </button>
            <button
              className={'fl-color-tab' + (settings.imagePosition === 'inside' ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ imagePosition: 'inside' })}>
              Inside
            </button>
            <button
              className={'fl-color-tab' + (settings.imagePosition === 'right' ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ imagePosition: 'right' })}>
              Right
            </button>
          </div>
        </div>

        {/* Image sizing */}
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Size</label>
          <div className="fl-tabs" style={{ margin: 0 }}>
            {(['fill', 'fit', 'stretch'] as ImageSizing[]).map(s => (
              <button key={s}
                className={'fl-color-tab' + (settings.imageSizing === s ? ' fl-color-tab-active' : '')}
                onClick={() => updateSettings({ imageSizing: s })}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Shape */}
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Shape</label>
          <div className="fl-tabs" style={{ margin: 0 }}>
            {(['rectangle', 'circle'] as ImageShape[]).map(s => (
              <button key={s}
                className={'fl-color-tab' + (settings.imageShape === s ? ' fl-color-tab-active' : '')}
                onClick={() => updateSettings({ imageShape: s })}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

      </Section>

      {/* ════ Label ════ */}
      <Section title="Label" defaultOpen={false}>

        <div className="fl-sub-heading">
          <span>Label</span>
          <div className="fl-sub-line" />
        </div>

        {/* Font size */}
            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Font size</label>
              <input type="number" className="form-input spinner-visible" min={20} max={120} step={1}
                value={settings.labelFontSize}
                onChange={e => updateSettings({ labelFontSize: Number(e.target.value) })}
                style={{ width: 64, textAlign: 'center', padding: '3px 4px' }} />
            </div>

            {/* Weight */}
            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Weight</label>
              <div className="fl-tabs" style={{ margin: 0 }}>
                <button className={'fl-color-tab' + (!settings.labelBold ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ labelBold: false })}
                  style={{ fontWeight: 400 }}>Normal</button>
                <button className={'fl-color-tab' + (settings.labelBold ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ labelBold: true })}
                  style={{ fontWeight: 700 }}>Bold</button>
              </div>
            </div>

        {/* Label Position */}
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Position</label>
          <div className="fl-tabs" style={{ margin: 0 }}>
            <button
              className={'fl-color-tab' + (settings.labelPosition === 'left' ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ labelPosition: 'left' })}>
              Left
            </button>
            <button
              className={'fl-color-tab' + (settings.labelPosition === 'inside' ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ labelPosition: 'inside' })}>
              Inside
            </button>
            <button
              className={'fl-color-tab' + (settings.labelPosition === 'right' ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ labelPosition: 'right' })}>
              Right
            </button>
          </div>
        </div>

        {/* Label Margin */}
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Margin</label>
          <input type="number" className="form-input spinner-visible" min={-100} max={200} step={1}
            value={settings.labelMargin ?? 15}
            onChange={e => updateSettings({ labelMargin: Number(e.target.value) })}
            style={{ width: 64, textAlign: 'center', padding: '3px 4px' }} />
        </div>

      </Section>

      {/* ════ Bars ════ */}
      <Section title="Bars" defaultOpen={false}>
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Max visible bars</label>
          <input type="number" className="form-input spinner-visible" min={3} max={20}
            value={settings.maxBars}
            onChange={e => updateSettings({ maxBars: Number(e.target.value) })}
            style={{ width: 64, textAlign: 'center', padding: '3px 4px' }} />
        </div>

        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Unit</label>
          <input className="form-input" placeholder="e.g. B$" value={settings.unit}
            onChange={e => updateSettings({ unit: e.target.value })}
            style={{ width: 64, textAlign: 'center', padding: '3px 4px' }} />
        </div>

        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>End Shape</label>
          <div className="fl-tabs" style={{ margin: 0 }}>
            {(['round', 'flat', 'arrow'] as BarEndShape[]).map(s => (
              <button key={s}
                className={'fl-color-tab' + (settings.barEndShape === s ? ' fl-color-tab-active' : '')}
                onClick={() => updateSettings({ barEndShape: s })}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Thickness</label>
          <input type="number" className="form-input spinner-visible" min={1} max={200}
            value={settings.barThickness}
            onChange={e => updateSettings({ barThickness: Number(e.target.value) })}
            style={{ width: 64, textAlign: 'center', padding: '3px 4px' }} />
        </div>

        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Gap</label>
          <input type="number" className="form-input spinner-visible" min={0} max={200}
            value={settings.barGap}
            onChange={e => updateSettings({ barGap: Number(e.target.value) })}
            style={{ width: 64, textAlign: 'center', padding: '3px 4px' }} />
        </div>
      </Section>

      {/* ════ Total Counter ════ */}
      <Section title="Total Counter" defaultOpen={false}>
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Show Counter</label>
          <div className="fl-tabs" style={{ margin: 0 }}>
            <button className={'fl-color-tab' + (settings.totalVisible !== false ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ totalVisible: true })}>On</button>
            <button className={'fl-color-tab' + (settings.totalVisible === false ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ totalVisible: false })}>Off</button>
          </div>
        </div>

        {settings.totalVisible !== false && (
          <>
            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Margin</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary, #666)' }}>X</span>
                <input type="number" className="form-input spinner-visible" step={5}
                  value={settings.totalMarginX ?? 0}
                  onChange={e => updateSettings({ totalMarginX: Number(e.target.value) })}
                  style={{ width: 46, textAlign: 'center', padding: '3px 2px' }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary, #666)' }}>Y</span>
                <input type="number" className="form-input spinner-visible" step={5}
                  value={settings.totalMarginY ?? 0}
                  onChange={e => updateSettings({ totalMarginY: Number(e.target.value) })}
                  style={{ width: 46, textAlign: 'center', padding: '3px 2px' }} />
              </div>
            </div>

            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Opacity</label>
              <input type="number" className="form-input spinner-visible" min={0.1} max={1.0} step={0.1}
                value={settings.totalOpacity ?? 0.5}
                onChange={e => updateSettings({ totalOpacity: Number(e.target.value) })}
                style={{ width: 52, textAlign: 'center', padding: '3px 4px' }} />
            </div>
          </>
        )}
      </Section>

      {/* ════ Time Counter ════ */}
      <Section title="Time Counter" defaultOpen={false}>
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Show Counter</label>
          <div className="fl-tabs" style={{ margin: 0 }}>
            <button className={'fl-color-tab' + (settings.timeVisible !== false ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ timeVisible: true })}>On</button>
            <button className={'fl-color-tab' + (settings.timeVisible === false ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ timeVisible: false })}>Off</button>
          </div>
        </div>

        {settings.timeVisible !== false && (
          <>
            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Show Months</label>
              <div className="fl-tabs" style={{ margin: 0 }}>
                <button className={'fl-color-tab' + (settings.timeMonthVisible ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ timeMonthVisible: true })}>On</button>
                <button className={'fl-color-tab' + (!settings.timeMonthVisible ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ timeMonthVisible: false })}>Off</button>
              </div>
            </div>

            {settings.timeMonthVisible && (
              <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Month Format</label>
                <div className="fl-tabs" style={{ margin: 0 }}>
                  <button className={'fl-color-tab' + (settings.timeMonthFormat === 'text' ? ' fl-color-tab-active' : '')}
                    onClick={() => updateSettings({ timeMonthFormat: 'text' })}>Text (Jan)</button>
                  <button className={'fl-color-tab' + (settings.timeMonthFormat === 'number' ? ' fl-color-tab-active' : '')}
                    onClick={() => updateSettings({ timeMonthFormat: 'number' })}>Number (01)</button>
                </div>
              </div>
            )}

            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Style</label>
              <div className="fl-tabs" style={{ margin: 0 }}>
                <button className={'fl-color-tab' + (settings.timeAnimation === 'normal' ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ timeAnimation: 'normal' })}>Normal</button>
                <button className={'fl-color-tab' + (settings.timeAnimation === 'slide' ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ timeAnimation: 'slide' })}>Slide</button>
              </div>
            </div>

            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Font</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary, #666)' }}>Size</span>
                <input type="number" className="form-input spinner-visible" step={1} min={10} max={100}
                  value={settings.timeFontSize ?? 12}
                  onChange={e => updateSettings({ timeFontSize: Number(e.target.value) })}
                  style={{ width: 42, textAlign: 'center', padding: '3px 2px' }} />
                <div className="fl-tabs" style={{ margin: 0 }}>
                  <button className={'fl-color-tab' + (!settings.timeBold ? ' fl-color-tab-active' : '')}
                    onClick={() => updateSettings({ timeBold: false })} style={{ fontWeight: 'normal', padding: '3px 6px' }}>Aa</button>
                  <button className={'fl-color-tab' + (settings.timeBold ? ' fl-color-tab-active' : '')}
                    onClick={() => updateSettings({ timeBold: true })} style={{ fontWeight: 'bold', padding: '3px 6px' }}>B</button>
                </div>
              </div>
            </div>

            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Margin</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary, #666)' }}>X</span>
                <input type="number" className="form-input spinner-visible" step={5}
                  value={settings.timeMarginX ?? 0}
                  onChange={e => updateSettings({ timeMarginX: Number(e.target.value) })}
                  style={{ width: 46, textAlign: 'center', padding: '3px 2px' }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary, #666)' }}>Y</span>
                <input type="number" className="form-input spinner-visible" step={5}
                  value={settings.timeMarginY ?? 0}
                  onChange={e => updateSettings({ timeMarginY: Number(e.target.value) })}
                  style={{ width: 46, textAlign: 'center', padding: '3px 2px' }} />
              </div>
            </div>

            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Opacity</label>
              <input type="number" className="form-input spinner-visible" min={0.1} max={1.0} step={0.1}
                value={settings.timeOpacity ?? 0.5}
                onChange={e => updateSettings({ timeOpacity: Number(e.target.value) })}
                style={{ width: 52, textAlign: 'center', padding: '3px 4px' }} />
            </div>
          </>
        )}
      </Section>

      {/* ════ Animation ════ */}
      <Section title="Animation" defaultOpen={false}>
        <div className="fl-field">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
            <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Duration per period</label>
            <span className="fl-val-badge">{settings.durationMs} ms</span>
          </div>
          <input type="range" className="fl-slider" min={500} max={6000} step={100}
            value={settings.durationMs}
            onChange={e => updateSettings({ durationMs: Number(e.target.value) })} />
          <div className="fl-slider-ends"><span>Fast</span><span>Slow</span></div>
        </div>

        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Easing</label>
          <div className="fl-tabs" style={{ margin: 0 }}>
            {([
              { value: 'linear',       label: 'Linear' },
              { value: 'ease-out',     label: 'Ease out' },
              { value: 'ease-in-out',  label: 'Ease in-out' },
              { value: 'spring',       label: 'Spring' },
            ] as { value: typeof settings.easing; label: string }[]).map(opt => (
              <button key={opt.value}
                className={'fl-color-tab' + (settings.easing === opt.value ? ' fl-color-tab-active' : '')}
                onClick={() => updateSettings({ easing: opt.value })}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ════ Watermark ════ */}
      <Section title="Watermark" defaultOpen={false}>

        {/* Text */}
        <div className="fl-field">
          <label className="fl-tiny-label">Channel name / text</label>
          <input className="form-input" placeholder="@kanalım"
            value={settings.watermarkText}
            onChange={e => updateSettings({ watermarkText: e.target.value })} />
        </div>

        {/* Position */}
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Position</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {([
              { value: 'top-left',     label: '↖' },
              { value: 'top-right',    label: '↗' },
              { value: 'bottom-left',  label: '↙' },
              { value: 'bottom-right', label: '↘' },
            ] as { value: typeof settings.watermarkPosition; label: string }[]).map(opt => (
              <button key={opt.value}
                className={'fl-color-tab' + (settings.watermarkPosition === opt.value ? ' fl-color-tab-active' : '')}
                onClick={() => updateSettings({ watermarkPosition: opt.value })}
                style={{ fontSize: 16 }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div className="fl-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Opacity</label>
            <span className="fl-val-badge">{Math.round(settings.watermarkOpacity * 100)}%</span>
          </div>
          <input type="range" className="fl-slider" min={0.1} max={1} step={0.05}
            value={settings.watermarkOpacity}
            onChange={e => updateSettings({ watermarkOpacity: parseFloat(e.target.value) })} />
        </div>

        {/* Font size */}
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Font size</label>
          <input type="number" className="form-input spinner-visible" min={10} max={80} step={1}
            value={settings.watermarkFontSize}
            onChange={e => updateSettings({ watermarkFontSize: Number(e.target.value) })}
            style={{ width: 64, textAlign: 'center', padding: '3px 4px' }} />
        </div>

      </Section>

      {/* ════ Video Clips ════ */}
      <Section title="Video Clips" defaultOpen={false}>

        <div className="fl-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(settings.videoEntries ?? []).map((entry: VideoEntry, i: number) => (
            <div key={i} style={{ background: 'var(--bg-secondary, #f5f5f5)', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>

              {/* Upload row */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <label className="fl-color-tab" style={{ cursor: 'pointer', padding: '3px 8px', flexShrink: 0 }}>
                  {entry.fileName ? '↺ Replace' : '▶ Upload'}
                  <input type="file" accept="video/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const updated = [...(settings.videoEntries ?? [])];
                      if (updated[i].objectUrl) URL.revokeObjectURL(updated[i].objectUrl);
                      updated[i] = { ...updated[i], objectUrl: URL.createObjectURL(file), fileName: file.name };
                      updateSettings({ videoEntries: updated });
                    }}
                  />
                </label>
                <span style={{ flex: 1, fontSize: 10, color: 'var(--text-secondary, #888)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.fileName || 'no file'}
                </span>
                <button
                  onClick={() => {
                    const updated = (settings.videoEntries ?? []).filter((_: VideoEntry, j: number) => j !== i);
                    updateSettings({ videoEntries: updated });
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #aaa)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                  title="Remove"
                >×</button>
              </div>

              {/* From / To row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>FROM</span>
                <select className="form-input" value={entry.from}
                  onChange={e => {
                    const updated = [...(settings.videoEntries ?? [])];
                    updated[i] = { ...updated[i], from: e.target.value };
                    updateSettings({ videoEntries: updated });
                  }}
                  style={{ flex: 1, padding: '3px 4px', fontSize: 11 }}>
                  <option value="">—</option>
                  {periods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>TO</span>
                <select className="form-input" value={entry.to}
                  onChange={e => {
                    const updated = [...(settings.videoEntries ?? [])];
                    updated[i] = { ...updated[i], to: e.target.value };
                    updateSettings({ videoEntries: updated });
                  }}
                  style={{ flex: 1, padding: '3px 4px', fontSize: 11 }}>
                  <option value="">—</option>
                  {periods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Position row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>Pos</span>
                <div className="fl-tabs" style={{ margin: 0, flex: 1 }}>
                  {([
                    { value: 'top-left',     label: '↖' },
                    { value: 'top-right',    label: '↗' },
                    { value: 'center',       label: '⊡' },
                    { value: 'bottom-left',  label: '↙' },
                    { value: 'bottom-right', label: '↘' },
                  ] as { value: VideoEntry['position']; label: string }[]).map(opt => (
                    <button key={opt.value}
                      className={'fl-color-tab' + (entry.position === opt.value ? ' fl-color-tab-active' : '')}
                      onClick={() => {
                        const updated = [...(settings.videoEntries ?? [])];
                        updated[i] = { ...updated[i], position: opt.value };
                        updateSettings({ videoEntries: updated });
                      }}
                      style={{ fontSize: 14, flex: 1 }}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Width + Opacity row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>W%</span>
                <input type="number" className="form-input spinner-visible" min={5} max={80} step={5}
                  value={entry.width}
                  onChange={e => {
                    const updated = [...(settings.videoEntries ?? [])];
                    updated[i] = { ...updated[i], width: Number(e.target.value) };
                    updateSettings({ videoEntries: updated });
                  }}
                  style={{ width: 46, textAlign: 'center', padding: '3px 2px' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>Op</span>
                <input type="number" className="form-input spinner-visible" min={0.1} max={1} step={0.05}
                  value={entry.opacity}
                  onChange={e => {
                    const updated = [...(settings.videoEntries ?? [])];
                    updated[i] = { ...updated[i], opacity: parseFloat(e.target.value) };
                    updateSettings({ videoEntries: updated });
                  }}
                  style={{ width: 46, textAlign: 'center', padding: '3px 2px' }} />
              </div>

              {/* Offset row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>Offset X</span>
                <input type="number" className="form-input spinner-visible" step={5}
                  value={entry.offsetX ?? 0}
                  onChange={e => {
                    const updated = [...(settings.videoEntries ?? [])];
                    updated[i] = { ...updated[i], offsetX: Number(e.target.value) };
                    updateSettings({ videoEntries: updated });
                  }}
                  style={{ width: 52, textAlign: 'center', padding: '3px 2px' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>Y</span>
                <input type="number" className="form-input spinner-visible" step={5}
                  value={entry.offsetY ?? 0}
                  onChange={e => {
                    const updated = [...(settings.videoEntries ?? [])];
                    updated[i] = { ...updated[i], offsetY: Number(e.target.value) };
                    updateSettings({ videoEntries: updated });
                  }}
                  style={{ width: 52, textAlign: 'center', padding: '3px 2px' }} />
              </div>

            </div>
          ))}

          {/* Add button */}
          <button
            className="fl-color-tab"
            style={{ width: '100%', padding: '6px', fontSize: 18, fontWeight: 400 }}
            onClick={() => {
              const newEntry: VideoEntry = { objectUrl: '', fileName: '', from: '', to: '', position: 'bottom-right', width: 30, opacity: 1, offsetX: 0, offsetY: 0 };
              updateSettings({ videoEntries: [...(settings.videoEntries ?? []), newEntry] });
            }}
          >+</button>
        </div>

      </Section>

      {/* ════ News Ticker ════ */}
      <Section title="News Ticker" defaultOpen={false}>

        {/* On/Off */}
        <div className="fl-sub-heading">
          <span>Visible</span>
          <div className="fl-sub-line" />
          <div className="fl-tabs" style={{ margin: 0, flexShrink: 0 }}>
            <button className={'fl-color-tab' + (settings.tickerVisible ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ tickerVisible: true })}>On</button>
            <button className={'fl-color-tab' + (!settings.tickerVisible ? ' fl-color-tab-active' : '')}
              onClick={() => updateSettings({ tickerVisible: false })}>Off</button>
          </div>
        </div>

        {/* Margins — always visible */}
        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Margin</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary, #666)' }}>Bottom</span>
            <input type="number" className="form-input spinner-visible" step={2}
              value={settings.tickerMarginBottom}
              onChange={e => updateSettings({ tickerMarginBottom: Number(e.target.value) })}
              style={{ width: 46, textAlign: 'center', padding: '3px 2px' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary, #666)' }}>X</span>
            <input type="number" className="form-input spinner-visible" step={2}
              value={settings.tickerMarginX}
              onChange={e => updateSettings({ tickerMarginX: Number(e.target.value) })}
              style={{ width: 46, textAlign: 'center', padding: '3px 2px' }} />
          </div>
        </div>

        {/* Ticker entries */}
        <div className="fl-field" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(settings.tickerEntries ?? []).map((entry: TickerEntry, i: number) => (
            <div key={i} style={{ background: 'var(--bg-secondary, #f5f5f5)', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Text row */}
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  className="form-input"
                  placeholder="ticker text…"
                  value={entry.text}
                  onChange={e => {
                    const updated = [...(settings.tickerEntries ?? [])];
                    updated[i] = { ...updated[i], text: e.target.value };
                    updateSettings({ tickerEntries: updated });
                  }}
                  style={{ flex: 1, padding: '3px 6px', fontSize: 12 }}
                />
                <button
                  onClick={() => {
                    const updated = (settings.tickerEntries ?? []).filter((_: TickerEntry, j: number) => j !== i);
                    updateSettings({ tickerEntries: updated });
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #aaa)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                  title="Remove"
                >×</button>
              </div>
              {/* From / To row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>FROM</span>
                <select className="form-input" value={entry.from}
                  onChange={e => {
                    const updated = [...(settings.tickerEntries ?? [])];
                    updated[i] = { ...updated[i], from: e.target.value };
                    updateSettings({ tickerEntries: updated });
                  }}
                  style={{ flex: 1, padding: '3px 4px', fontSize: 11 }}>
                  <option value="">—</option>
                  {periods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary, #888)', flexShrink: 0 }}>TO</span>
                <select className="form-input" value={entry.to}
                  onChange={e => {
                    const updated = [...(settings.tickerEntries ?? [])];
                    updated[i] = { ...updated[i], to: e.target.value };
                    updateSettings({ tickerEntries: updated });
                  }}
                  style={{ flex: 1, padding: '3px 4px', fontSize: 11 }}>
                  <option value="">—</option>
                  {periods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          ))}

          {/* Add button */}
          <button
            className="fl-color-tab"
            style={{ width: '100%', padding: '6px', fontSize: 18, fontWeight: 400 }}
            onClick={() => {
              updateSettings({ tickerEntries: [...(settings.tickerEntries ?? []), { text: '', from: '', to: '' }] });
            }}
          >+</button>
        </div>

        {/* Style settings */}
        <SubHeading label="Style" />

        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Font size</label>
          <input type="number" className="form-input spinner-visible" min={8} max={60} step={1}
            value={settings.tickerFontSize}
            onChange={e => updateSettings({ tickerFontSize: Number(e.target.value) })}
            style={{ width: 64, textAlign: 'center', padding: '3px 4px' }} />
        </div>

        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Height</label>
          <input type="number" className="form-input spinner-visible" min={16} max={120} step={2}
            value={settings.tickerHeight}
            onChange={e => updateSettings({ tickerHeight: Number(e.target.value) })}
            style={{ width: 64, textAlign: 'center', padding: '3px 4px' }} />
        </div>

        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Background</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ColorPicker value={settings.tickerBgColor} onChange={c => updateSettings({ tickerBgColor: c })} />
            <input type="number" className="form-input spinner-visible" min={0} max={1} step={0.05}
              value={settings.tickerBgOpacity}
              onChange={e => updateSettings({ tickerBgOpacity: parseFloat(e.target.value) })}
              style={{ width: 52, textAlign: 'center', padding: '3px 4px' }} />
          </div>
        </div>

        <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Text color</label>
          <ColorPicker value={settings.tickerTextColor} onChange={c => updateSettings({ tickerTextColor: c })} />
        </div>

      </Section>

    </div>
  );
}
