import { useEffect, useState, useRef, useCallback } from 'react';
import { SettingsPanel } from './components/Sidebar/SettingsPanel';
import { ExportPanel } from './components/Sidebar/ExportPanel';
import { LineSettingsPanel } from './components/Sidebar/LineSettingsPanel';
import { LineExportPanel } from './components/Sidebar/LineExportPanel';
import { RaceChart } from './components/Chart/RaceChart';
import { PlaybackBar } from './components/Chart/PlaybackBar';
import { LineRaceChart } from './components/LineChart/LineRaceChart';
import { LinePlaybackBar } from './components/LineChart/LinePlaybackBar';
import { DataPanel } from './components/Data/DataPanel';
import { HomePage } from './components/Home/HomePage';
import { useCSVParser } from './hooks/useCSVParser';
import { sampleData, sampleMeta, sampleLineData, sampleLineMeta } from './utils/sampleData';
import { useChartStore } from './store/chartStore';
import { useLineChartStore } from './store/lineChartStore';
import type { LineDataRow } from './store/lineChartStore';

type Tab = 'preview' | 'data';
type AppView = 'home' | 'bar-editor' | 'line-editor';

// ---------- Line CSV parser helper ----------
function parseLineCSV(csv: string): { data: LineDataRow[]; periods: string[] } | null {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;

  // Try to detect format:
  // Format A (transposed — line.md style): date,SeriesA,SeriesB,...
  //   row = time period, columns = entity names
  // Format B (same as bar chart wide): Name,Cat,Img,Period1,Period2,...
  //   row = entity, columns = periods

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const firstHeader = headers[0].toLowerCase();

  // If first header looks like a date/time column → Format A
  // Format A optionally has an "image" row: image,url1,url2,...
  if (/date|year|time|period|month/i.test(firstHeader)) {
    const seriesNames = headers.slice(1);
    const data: LineDataRow[] = [];
    const periods: string[] = [];
    const imageUrlMap = new Map<string, string>(); // name → url

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const rowKey = cols[0].toLowerCase();
      // Special "image" row for Format A
      if (/^img|^image|^icon|^logo|^flag/.test(rowKey)) {
        for (let s = 0; s < seriesNames.length; s++) {
          if (cols[s + 1]) imageUrlMap.set(seriesNames[s], cols[s + 1]);
        }
        continue;
      }
      if (!cols[0]) continue;
      periods.push(cols[0]);
      for (let s = 0; s < seriesNames.length; s++) {
        const val = parseFloat(cols[s + 1]);
        data.push({
          name: seriesNames[s],
          value: isNaN(val) ? 0 : val,
          time: cols[0],
          imageUrl: imageUrlMap.get(seriesNames[s]),
        });
      }
    }
    return { data, periods };
  }

  // Format B: entity rows, period columns (same as bar chart)
  // headers: Name, [Category], [ImageUrl], Period1, Period2, ...
  let dataStart = 1;
  let imgColIdx = -1;
  if (headers.length > 1 && /cat/i.test(headers[1])) dataStart = 2;
  if (dataStart < headers.length && /img|url|image|icon|logo|flag/i.test(headers[dataStart])) {
    imgColIdx = dataStart;
    dataStart++;
  }

  const periodHeaders = headers.slice(dataStart);
  const data: LineDataRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const name = cols[0];
    if (!name) continue;
    const imageUrl = imgColIdx >= 0 ? (cols[imgColIdx] || undefined) : undefined;
    for (let p = 0; p < periodHeaders.length; p++) {
      const val = parseFloat(cols[dataStart + p]);
      data.push({ name, value: isNaN(val) ? 0 : val, time: periodHeaders[p], imageUrl });
    }
  }

  return { data, periods: periodHeaders };
}

// ─── Bar Chart Editor ──────────────────────
function BarChartEditor({ onHome }: { onHome: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const { exportSettings, updateExportSettings } = useChartStore();

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="brand">
            <div className="brand-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <rect x="2" y="14" width="4" height="8" rx="1"/>
                <rect x="8" y="9" width="4" height="13" rx="1"/>
                <rect x="14" y="4" width="4" height="18" rx="1"/>
                <rect x="20" y="1" width="4" height="21" rx="1"/>
              </svg>
            </div>
            <div>
              <h1>Bar Chart Race</h1>
              <span>Creator Studio</span>
            </div>
          </div>
          <nav className="tab-group">
            <button className={'tab-btn' + (activeTab === 'preview' ? ' active' : '')} onClick={() => setActiveTab('preview')}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
              Preview
            </button>
            <button className={'tab-btn' + (activeTab === 'data' ? ' active' : '')} onClick={() => setActiveTab('data')}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/>
              </svg>
              Data
            </button>
          </nav>
        </div>

        <div className="top-bar-space" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Format</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => updateExportSettings({ canvasRatio: '16:9' })} className={'ratio-btn' + (exportSettings.canvasRatio === '16:9' ? ' ratio-btn-active' : '')} data-tooltip="16:9 — Landscape">
              <svg viewBox="0 0 48 32" width="34" height="23" fill="none"><rect x="1" y="1" width="46" height="27" rx="3" stroke="currentColor" strokeWidth="2"/><text x="24" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="Inter,sans-serif">16:9</text></svg>
            </button>
            <button onClick={() => updateExportSettings({ canvasRatio: '9:16' })} className={'ratio-btn' + (exportSettings.canvasRatio === '9:16' ? ' ratio-btn-active' : '')} data-tooltip="9:16 — Portrait">
              <svg viewBox="0 0 28 46" width="17" height="28" fill="none"><rect x="1" y="1" width="26" height="44" rx="4" stroke="currentColor" strokeWidth="2"/><text x="14" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="Inter,sans-serif">9:16</text></svg>
            </button>
            <button onClick={() => updateExportSettings({ canvasRatio: '1:1' })} className={'ratio-btn' + (exportSettings.canvasRatio === '1:1' ? ' ratio-btn-active' : '')} data-tooltip="1:1 — Square">
              <svg viewBox="0 0 36 36" width="24" height="24" fill="none"><rect x="1" y="1" width="34" height="34" rx="3" stroke="currentColor" strokeWidth="2"/><text x="18" y="22" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="Inter,sans-serif">1:1</text></svg>
            </button>
          </div>
        </div>

        <div className="top-bar-space" />

        <button className="studio-home-btn" onClick={onHome} title="Go to Home">
          <div className="studio-home-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.9"/>
              <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.6"/>
              <rect x="7" y="2" width="10" height="9" rx="2" fill="currentColor"/>
              <circle cx="12" cy="6.5" r="1.5" fill="white" opacity="0.5"/>
              <circle cx="6.5" cy="17.5" r="1.5" fill="white" opacity="0.5"/>
              <circle cx="17.5" cy="17.5" r="1.5" fill="white" opacity="0.5"/>
            </svg>
          </div>
          <div className="studio-home-text">
            <span className="studio-home-name">Chart Race Studio</span>
            <span className="studio-home-sub">Home</span>
          </div>
        </button>
      </header>

      <div className="content-area">
        <div className="main-panel">
          {activeTab === 'preview' ? (
            <>
              <div className="chart-area"><RaceChart /></div>
              <PlaybackBar />
            </>
          ) : (
            <DataPanel />
          )}
        </div>
        <aside className="right-sidebar">
          <div className="settings-scroll-area"><SettingsPanel /></div>
          <div className="export-sticky-panel"><ExportPanel /></div>
        </aside>
      </div>
    </div>
  );
}

// ─── Line Chart Editor ─────────────────────
function LineChartEditor({ onHome }: { onHome: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { exportSettings, updateExportSettings, setData, periods, updateSettings } = useLineChartStore();

  // Auto-load sample data on first open
  useEffect(() => {
    if (useLineChartStore.getState().periods.length === 0) {
      const result = parseLineCSV(sampleLineData);
      if (result) {
        setData(result.data, result.periods);
        updateSettings({ title: sampleLineMeta.title });
      }
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const result = parseLineCSV(csv);
      if (result && result.data.length > 0) {
        setData(result.data, result.periods);
      } else {
        alert('CSV yüklenemedi veya format desteklenmiyor. İlk kolon tarih/dönem adı, diğerleri seri değerleri olmalı.');
      }
    };
    reader.readAsText(file);
  }, [setData]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="brand">
            <div className="brand-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <polyline points="3,17 8,12 13,15 21,7" strokeWidth="2.5" stroke="white" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1>Line Chart Race</h1>
              <span>Creator Studio</span>
            </div>
          </div>
          <nav className="tab-group">
            <button className={'tab-btn' + (activeTab === 'preview' ? ' active' : '')} onClick={() => setActiveTab('preview')}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
              Preview
            </button>
            <button className={'tab-btn' + (activeTab === 'data' ? ' active' : '')} onClick={() => setActiveTab('data')}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h7"/>
              </svg>
              Data
            </button>
          </nav>
        </div>

        <div className="top-bar-space" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Format</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => updateExportSettings({ canvasRatio: '16:9' })} className={'ratio-btn' + (exportSettings.canvasRatio === '16:9' ? ' ratio-btn-active' : '')} data-tooltip="16:9 — Landscape">
              <svg viewBox="0 0 48 32" width="34" height="23" fill="none"><rect x="1" y="1" width="46" height="27" rx="3" stroke="currentColor" strokeWidth="2"/><text x="24" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="Inter,sans-serif">16:9</text></svg>
            </button>
            <button onClick={() => updateExportSettings({ canvasRatio: '9:16' })} className={'ratio-btn' + (exportSettings.canvasRatio === '9:16' ? ' ratio-btn-active' : '')} data-tooltip="9:16 — Portrait">
              <svg viewBox="0 0 28 46" width="17" height="28" fill="none"><rect x="1" y="1" width="26" height="44" rx="4" stroke="currentColor" strokeWidth="2"/><text x="14" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="Inter,sans-serif">9:16</text></svg>
            </button>
            <button onClick={() => updateExportSettings({ canvasRatio: '1:1' })} className={'ratio-btn' + (exportSettings.canvasRatio === '1:1' ? ' ratio-btn-active' : '')} data-tooltip="1:1 — Square">
              <svg viewBox="0 0 36 36" width="24" height="24" fill="none"><rect x="1" y="1" width="34" height="34" rx="3" stroke="currentColor" strokeWidth="2"/><text x="18" y="22" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="Inter,sans-serif">1:1</text></svg>
            </button>
          </div>
        </div>

        <div className="top-bar-space" />

        <button className="studio-home-btn" onClick={onHome} title="Go to Home">
          <div className="studio-home-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.9"/>
              <rect x="13" y="13" width="9" height="9" rx="2" fill="currentColor" opacity="0.6"/>
              <rect x="7" y="2" width="10" height="9" rx="2" fill="currentColor"/>
            </svg>
          </div>
          <div className="studio-home-text">
            <span className="studio-home-name">Chart Race Studio</span>
            <span className="studio-home-sub">Home</span>
          </div>
        </button>
      </header>

      <div className="content-area">
        <div className="main-panel">
          {activeTab === 'preview' ? (
            periods.length === 0 ? (
              /* Upload zone when no data */
              <div
                className={'line-upload-zone' + (dragOver ? ' drag-over' : '')}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileChange} />
                <div className="line-upload-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <h3 className="line-upload-title">Upload CSV for Line Chart Race</h3>
                <p className="line-upload-sub">
                  Drag & drop or click to select a CSV file.<br/>
                  <strong>Format A (transposed):</strong> date,SeriesA,SeriesB,…<br/>
                  <strong>Format B (wide):</strong> Name,[Category],[Image],Period1,Period2,…
                </p>
                <div className="line-upload-example">
                  <div className="line-upload-example-title">Example (Format A):</div>
                  <pre>{`date,USA,China,Japan\n1960,543,59,44\n1961,563,50,53`}</pre>
                </div>
              </div>
            ) : (
              <>
                <div className="chart-area"><LineRaceChart /></div>
                <LinePlaybackBar />
              </>
            )
          ) : (
            /* Data tab — CSV upload + data summary */
            <div className="line-data-panel">
              <div className="line-data-header">
                <div>
                  <h3>Dataset</h3>
                  {periods.length > 0 && (
                    <span className="line-data-meta">
                      {[...new Set(useLineChartStore.getState().data.map(d => d.name))].length} series &nbsp;·&nbsp; {periods.length} periods
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="line-data-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Upload CSV
                  </button>
                  <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileChange} />
                </div>
              </div>

              {periods.length > 0 ? (
                <LineDataTable />
              ) : (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No data loaded. Upload a CSV to get started.
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="right-sidebar">
          <div className="settings-scroll-area"><LineSettingsPanel /></div>
          <div className="export-sticky-panel">
            <LineExportPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}

// Simple read-only data table for line chart
function LineDataTable() {
  const { data, periods } = useLineChartStore();
  const names = [...new Set(data.map(d => d.name))];

  if (names.length === 0) return null;

  return (
    <div className="line-data-table-wrap">
      <table className="line-data-table">
        <thead>
          <tr>
            <th className="line-data-th">Series</th>
            {periods.map(p => <th key={p} className="line-data-th">{p}</th>)}
          </tr>
        </thead>
        <tbody>
          {names.map(name => (
            <tr key={name} className="line-data-row">
              <td className="line-data-td line-data-name">{name}</td>
              {periods.map(p => {
                const row = data.find(d => d.name === name && d.time === p);
                return <td key={p} className="line-data-td">{row ? row.value.toLocaleString() : '—'}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Root App ──────────────────────────────
function App() {
  const [view, setView] = useState<AppView>('home');
  const { parseCSV } = useCSVParser();
  const { setData: setBarData, data: barData, updateSettings } = useChartStore();

  useEffect(() => {
    if (barData.length === 0) {
      parseCSV(sampleData).then(({ data, periods }) => {
        setBarData(data, periods);
        updateSettings({ title: sampleMeta.title, unit: sampleMeta.unit });
      }).catch(console.error);
    }
  }, []);

  const handleHomeSelect = (templateId: string) => {
    if (templateId === 'line-chart-race') setView('line-editor');
    else setView('bar-editor');
  };

  if (view === 'home') return <HomePage onSelect={handleHomeSelect} />;
  if (view === 'line-editor') return <LineChartEditor onHome={() => setView('home')} />;
  return <BarChartEditor onHome={() => setView('home')} />;
}

export default App;
