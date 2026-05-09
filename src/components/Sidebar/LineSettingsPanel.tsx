import { useState } from 'react';
import { useLineChartStore } from '../../store/lineChartStore';
import { ColorPicker } from './ColorPicker';
import { PresetPaletteSelector } from './PresetPaletteSelector';
import type { PaletteName } from '../../utils/colorPalettes';

// ── Collapsible section — identical pattern to bar chart ──
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

// ── Inline row: label left, control right ──
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <label className="fl-tiny-label" style={{ marginBottom: 0 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Reusable tab group ──
function Tabs<T extends string>({ options, value, onChange, style }: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div className="fl-tabs" style={{ margin: 0, ...style }}>
      {options.map(opt => (
        <button
          key={opt.value}
          className={'fl-color-tab' + (value === opt.value ? ' fl-color-tab-active' : '')}
          onClick={() => onChange(opt.value)}
        >{opt.label}</button>
      ))}
    </div>
  );
}

// ── Number input (matches bar chart "form-input spinner-visible" pattern) ──
function NumInput({ value, min, max, step = 1, onChange }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      className="form-input spinner-visible"
      min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: 64, textAlign: 'center', padding: '3px 4px' }}
    />
  );
}

// ── Main panel ──
export function LineSettingsPanel() {
  const { settings, updateSettings } = useLineChartStore();

  return (
    <div className="fl-panel">

      {/* Top title bar */}
      <div className="fl-title-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <span>Settings</span>
      </div>

      {/* ════ Color ════ */}
      <Section title="Color" defaultOpen>

        <div className="fl-sub-heading">
          <span>Background</span>
          <div className="fl-sub-line" />
          <ColorPicker
            value={settings.backgroundColor || '#171F2F'}
            onChange={v => updateSettings({ backgroundColor: v })}
          />
        </div>

        <div className="fl-sub-heading" style={{ marginTop: 16 }}>
          <span>Palette</span>
          <div className="fl-sub-line" />
        </div>
        <PresetPaletteSelector
          value={settings.palette as PaletteName}
          onChange={p => updateSettings({ palette: p })}
        />

      </Section>

      {/* ════ Title ════ */}
      <Section title="Title">

        <Row label="Visible">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.titleVisible)}
            onChange={v => updateSettings({ titleVisible: v === 'true' })}
          />
        </Row>

        {settings.titleVisible && (
          <>
            <div className="fl-field">
              <label className="fl-tiny-label">Title text</label>
              <input
                className="form-input"
                value={settings.title}
                onChange={e => updateSettings({ title: e.target.value })}
                placeholder="Line Chart Race"
                style={{ width: '100%' }}
              />
            </div>

            <Row label="Align">
              <Tabs
                options={[{ label: 'L', value: 'left' }, { label: 'C', value: 'center' }, { label: 'R', value: 'right' }]}
                value={settings.titleAlign}
                onChange={v => updateSettings({ titleAlign: v as 'left' | 'center' | 'right' })}
              />
            </Row>

            <Row label="Font size">
              <NumInput value={settings.titleFontSize} min={16} max={80} onChange={v => updateSettings({ titleFontSize: v })} />
            </Row>

            <Row label="Weight">
              <div className="fl-tabs" style={{ margin: 0 }}>
                <button className={'fl-color-tab' + (!settings.titleBold ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ titleBold: false })} style={{ fontWeight: 400 }}>Normal</button>
                <button className={'fl-color-tab' + (settings.titleBold ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ titleBold: true })} style={{ fontWeight: 700 }}>Bold</button>
              </div>
            </Row>

            <Row label="Color">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {settings.titleColor && (
                  <button className="fl-color-tab" onClick={() => updateSettings({ titleColor: '' })}
                    style={{ fontSize: 10, padding: '2px 6px' }}>Auto</button>
                )}
                <ColorPicker
                  value={settings.titleColor || '#ffffff'}
                  onChange={v => updateSettings({ titleColor: v })}
                />
              </div>
            </Row>
          </>
        )}

      </Section>

      {/* ════ Lines ════ */}
      <Section title="Lines" defaultOpen>

        <Row label="Line width">
          <NumInput value={settings.lineWidth} min={1} max={12} step={0.5} onChange={v => updateSettings({ lineWidth: v })} />
        </Row>

        <Row label="Active width">
          <NumInput value={settings.activeLineWidth} min={1} max={16} step={0.5} onChange={v => updateSettings({ activeLineWidth: v })} />
        </Row>

        <Row label="Smooth curve">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.smoothCurve)}
            onChange={v => updateSettings({ smoothCurve: v === 'true' })}
          />
        </Row>

        <div className="fl-sub-heading" style={{ marginTop: 16 }}>
          <span>Dots</span>
          <div className="fl-sub-line" />
        </div>

        <Row label="Show dots">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.showDots)}
            onChange={v => updateSettings({ showDots: v === 'true' })}
          />
        </Row>

        {settings.showDots && (
          <Row label="Dot size">
            <NumInput value={settings.dotSize} min={2} max={20} onChange={v => updateSettings({ dotSize: v })} />
          </Row>
        )}

        <div className="fl-sub-heading" style={{ marginTop: 16 }}>
          <span>Area fill</span>
          <div className="fl-sub-line" />
        </div>

        <Row label="Show area">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.showArea)}
            onChange={v => updateSettings({ showArea: v === 'true' })}
          />
        </Row>

        {settings.showArea && (
          <Row label="Area opacity">
            <NumInput value={Math.round(settings.areaOpacity * 100)} min={1} max={80} onChange={v => updateSettings({ areaOpacity: v / 100 })} />
          </Row>
        )}

      </Section>

      {/* ════ Image ════ */}
      <Section title="Image">

        <Row label="Show image">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.imageVisible)}
            onChange={v => updateSettings({ imageVisible: v === 'true' })}
          />
        </Row>

        {settings.imageVisible && (
          <>
            <Row label="Size">
              <NumInput value={settings.imageSize} min={12} max={80} onChange={v => updateSettings({ imageSize: v })} />
            </Row>

            <Row label="Shape">
              <div className="fl-tabs" style={{ margin: 0 }}>
                <button className={'fl-color-tab' + (settings.imageShape === 'circle' ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ imageShape: 'circle' })}>Circle</button>
                <button className={'fl-color-tab' + (settings.imageShape === 'rectangle' ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ imageShape: 'rectangle' })}>Rect</button>
              </div>
            </Row>
          </>
        )}

      </Section>

      {/* ════ Labels & Values ════ */}
      <Section title="Labels & Values">

        <div className="fl-sub-heading">
          <span>Label</span>
          <div className="fl-sub-line" />
        </div>

        <Row label="Visible">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.showLabels)}
            onChange={v => updateSettings({ showLabels: v === 'true' })}
          />
        </Row>

        {settings.showLabels && (
          <Row label="Font size">
            <NumInput value={settings.labelFontSize} min={8} max={30} onChange={v => updateSettings({ labelFontSize: v })} />
          </Row>
        )}

        <div className="fl-sub-heading" style={{ marginTop: 16 }}>
          <span>Value</span>
          <div className="fl-sub-line" />
        </div>

        <Row label="Visible">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.showValues)}
            onChange={v => updateSettings({ showValues: v === 'true' })}
          />
        </Row>

        {settings.showValues && (
          <Row label="Font size">
            <NumInput value={settings.valueFontSize} min={8} max={24} onChange={v => updateSettings({ valueFontSize: v })} />
          </Row>
        )}

      </Section>

      {/* ════ Grid & Axes ════ */}
      <Section title="Grid & Axes">

        <Row label="Show grid">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.showGrid)}
            onChange={v => updateSettings({ showGrid: v === 'true' })}
          />
        </Row>

        {settings.showGrid && (
          <>
            <Row label="Grid lines">
              <NumInput value={settings.gridLines} min={2} max={10} onChange={v => updateSettings({ gridLines: v })} />
            </Row>

            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Opacity ({Math.round(settings.gridOpacity * 100)}%)</label>
              <input type="range" min="0" max="0.6" step="0.01"
                value={settings.gridOpacity}
                onChange={e => updateSettings({ gridOpacity: parseFloat(e.target.value) })}
                style={{ width: 100 }}
              />
            </div>

            <Row label="Color">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {settings.gridColor && (
                  <button className="fl-color-tab" onClick={() => updateSettings({ gridColor: '' })}
                    style={{ fontSize: 10, padding: '2px 6px' }}>Auto</button>
                )}
                <ColorPicker
                  value={settings.gridColor || '#ffffff'}
                  onChange={v => updateSettings({ gridColor: v })}
                />
              </div>
            </Row>
          </>
        )}

        <Row label="Y-axis labels">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.showYLabels)}
            onChange={v => updateSettings({ showYLabels: v === 'true' })}
          />
        </Row>

        <Row label="X-axis labels">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.showXLabels)}
            onChange={v => updateSettings({ showXLabels: v === 'true' })}
          />
        </Row>

        <Row label="Axis font size">
          <NumInput value={settings.axisFontSize} min={6} max={20} onChange={v => updateSettings({ axisFontSize: v })} />
        </Row>

      </Section>

      {/* ════ Animation ════ */}
      <Section title="Animation">

        <Row label="Play Mode">
          <Tabs
            options={[
              { label: 'All',    value: 'all' },
              { label: 'Zoomed', value: 'zoomed' },
              { label: 'Reveal', value: 'reveal' },
            ]}
            value={settings.playMode ?? 'reveal'}
            onChange={v => updateSettings({ playMode: v as 'all' | 'zoomed' | 'reveal' })}
          />
        </Row>

        {(settings.playMode ?? 'reveal') === 'zoomed' && (
          <Row label="Window (periods)">
            <NumInput value={settings.zoomedWindow ?? 5} min={2} max={20} step={1} onChange={v => updateSettings({ zoomedWindow: v })} />
          </Row>
        )}

        <Row label="Duration (ms)">
          <NumInput value={settings.durationMs} min={300} max={5000} step={100} onChange={v => updateSettings({ durationMs: v })} />
        </Row>

        <Row label="Easing">
          <Tabs
            options={[
              { label: 'Linear',   value: 'linear' },
              { label: 'Ease out', value: 'ease-out' },
              { label: 'In-out',   value: 'ease-in-out' },
            ]}
            value={settings.easing}
            onChange={v => updateSettings({ easing: v as 'linear' | 'ease-out' | 'ease-in-out' })}
          />
        </Row>

        <Row label="Y-axis">
          <Tabs
            options={[{ label: 'Dynamic', value: 'true' }, { label: 'Static', value: 'false' }]}
            value={String(settings.dynamicYAxis)}
            onChange={v => updateSettings({ dynamicYAxis: v === 'true' })}
          />
        </Row>

        <div className="fl-sub-heading">
          <span>Spring Physics</span>
          <div className="fl-sub-line" />
        </div>

        <Row label="Spring mode">
          <Tabs
            options={[{ label: 'Off', value: 'false' }, { label: 'On', value: 'true' }]}
            value={String(settings.springEnabled)}
            onChange={v => updateSettings({ springEnabled: v === 'true' })}
          />
        </Row>

        {settings.springEnabled && (
          <Row label="Preset">
            <Tabs
              options={[
                { label: 'Smooth',    value: 'smooth' },
                { label: 'Cinematic', value: 'cinematic' },
                { label: 'Energetic', value: 'energetic' },
              ]}
              value={settings.springPreset}
              onChange={v => updateSettings({ springPreset: v as 'smooth' | 'cinematic' | 'energetic' })}
            />
          </Row>
        )}

      </Section>

      {/* ════ Highlight ════ */}
      <Section title="Highlight">

        <Row label="Mode">
          <Tabs
            options={[
              { label: 'None',   value: 'none' },
              { label: 'Leader', value: 'leader' },
              { label: 'Top 3',  value: 'top3' },
            ]}
            value={settings.highlightMode}
            onChange={v => updateSettings({ highlightMode: v as 'none' | 'leader' | 'top3' })}
          />
        </Row>

        {settings.highlightMode !== 'none' && (
          <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Muted opacity ({Math.round(settings.mutedOpacity * 100)}%)</label>
            <input type="range" min="0" max="0.9" step="0.05"
              value={settings.mutedOpacity}
              onChange={e => updateSettings({ mutedOpacity: parseFloat(e.target.value) })}
              style={{ width: 100 }}
            />
          </div>
        )}

        <Row label="Max series">
          <NumInput value={settings.maxVisibleSeries} min={1} max={20} onChange={v => updateSettings({ maxVisibleSeries: v })} />
        </Row>

      </Section>

      {/* ════ Time display ════ */}
      <Section title="Time display">

        <Row label="Visible">
          <Tabs
            options={[{ label: 'On', value: 'true' }, { label: 'Off', value: 'false' }]}
            value={String(settings.timeVisible)}
            onChange={v => updateSettings({ timeVisible: v === 'true' })}
          />
        </Row>

        {settings.timeVisible && (
          <>
            <Row label="Font size">
              <NumInput value={settings.timeFontSize} min={4} max={24} onChange={v => updateSettings({ timeFontSize: v })} />
            </Row>

            <Row label="Weight">
              <div className="fl-tabs" style={{ margin: 0 }}>
                <button className={'fl-color-tab' + (!settings.timeBold ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ timeBold: false })} style={{ fontWeight: 400 }}>Normal</button>
                <button className={'fl-color-tab' + (settings.timeBold ? ' fl-color-tab-active' : '')}
                  onClick={() => updateSettings({ timeBold: true })} style={{ fontWeight: 700 }}>Bold</button>
              </div>
            </Row>

            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Opacity ({Math.round(settings.timeOpacity * 100)}%)</label>
              <input type="range" min="0.1" max="1" step="0.05"
                value={settings.timeOpacity}
                onChange={e => updateSettings({ timeOpacity: parseFloat(e.target.value) })}
                style={{ width: 100 }}
              />
            </div>
          </>
        )}

      </Section>

      {/* ════ Chart margins ════ */}
      <Section title="Chart margins">

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {([
            ['Top',    'marginTop'],
            ['Right',  'marginRight'],
            ['Bottom', 'marginBottom'],
            ['Left',   'marginLeft'],
          ] as [string, keyof typeof settings][]).map(([lbl, key]) => (
            <div key={key} className="fl-field" style={{ marginBottom: 0 }}>
              <label className="fl-tiny-label">{lbl}</label>
              <input type="number" className="form-input spinner-visible" min={0} max={400} step={1}
                value={settings[key] as number}
                onChange={e => updateSettings({ [key]: Number(e.target.value) })}
                style={{ width: '100%', textAlign: 'center', padding: '3px 4px' }}
              />
            </div>
          ))}
        </div>

      </Section>

      {/* ════ Watermark ════ */}
      <Section title="Watermark">

        <div className="fl-field">
          <label className="fl-tiny-label">Text</label>
          <input
            className="form-input"
            value={settings.watermarkText}
            onChange={e => updateSettings({ watermarkText: e.target.value })}
            placeholder="e.g. Source: World Bank"
            style={{ width: '100%' }}
          />
        </div>

        {settings.watermarkText && (
          <>
            <Row label="Position">
              <Tabs
                options={[
                  { label: 'TL', value: 'top-left' },
                  { label: 'TR', value: 'top-right' },
                  { label: 'BL', value: 'bottom-left' },
                  { label: 'BR', value: 'bottom-right' },
                ]}
                value={settings.watermarkPosition}
                onChange={v => updateSettings({ watermarkPosition: v as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' })}
              />
            </Row>

            <Row label="Font size">
              <NumInput value={settings.watermarkFontSize} min={8} max={40} onChange={v => updateSettings({ watermarkFontSize: v })} />
            </Row>

            <div className="fl-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="fl-tiny-label" style={{ marginBottom: 0 }}>Opacity ({Math.round(settings.watermarkOpacity * 100)}%)</label>
              <input type="range" min="0.1" max="1" step="0.05"
                value={settings.watermarkOpacity}
                onChange={e => updateSettings({ watermarkOpacity: parseFloat(e.target.value) })}
                style={{ width: 100 }}
              />
            </div>
          </>
        )}

      </Section>

    </div>
  );
}
