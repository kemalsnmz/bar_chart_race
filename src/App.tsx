import { useEffect, useState } from 'react';
import { SettingsPanel } from './components/Sidebar/SettingsPanel';
import { ExportPanel } from './components/Sidebar/ExportPanel';
import { RaceChart } from './components/Chart/RaceChart';
import { PlaybackBar } from './components/Chart/PlaybackBar';
import { DataPanel } from './components/Data/DataPanel';
import { HomePage } from './components/Home/HomePage';
import { useCSVParser } from './hooks/useCSVParser';
import { sampleData, sampleMeta } from './utils/sampleData';
import { useChartStore } from './store/chartStore';

type Tab = 'preview' | 'data';

function App() {
  const [view, setView] = useState<'home' | 'editor'>('home');
  const [activeTab, setActiveTab] = useState<Tab>('preview');
  const { parseCSV } = useCSVParser();
  const { setData, data, updateSettings, exportSettings, updateExportSettings } = useChartStore();

  useEffect(() => {
    if (data.length === 0) {
      parseCSV(sampleData).then(({ data, periods }) => {
        setData(data, periods);
        updateSettings({ title: sampleMeta.title, unit: sampleMeta.unit });
      }).catch(console.error);
    }
  }, []);

  if (view === 'home') {
    return <HomePage onSelect={() => setView('editor')} />;
  }

  return (
    <div className="app-layout">
      {/* Top bar */}
      <header className="top-bar">

        {/* Left: brand + tabs — shifted right with left margin */}
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
            <button
              className={'tab-btn' + (activeTab === 'preview' ? ' active' : '')}
              onClick={() => setActiveTab('preview')}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              Preview
            </button>
            <button
              className={'tab-btn' + (activeTab === 'data' ? ' active' : '')}
              onClick={() => setActiveTab('data')}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" />
              </svg>
              Data
            </button>
          </nav>
        </div>

        <div className="top-bar-space" />

        {/* Center: canvas ratio buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Format</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => updateExportSettings({ canvasRatio: '16:9' })}
              className={'ratio-btn' + (exportSettings.canvasRatio === '16:9' ? ' ratio-btn-active' : '')}
              title="" data-tooltip="16:9 — Landscape"
            >
              <svg viewBox="0 0 48 32" width="34" height="23" fill="none">
                <rect x="1" y="1" width="46" height="27" rx="3" stroke="currentColor" strokeWidth="2"/>
                <rect x="17" y="28" width="14" height="2.5" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="12" y="30.5" width="24" height="1.5" rx="0.75" fill="currentColor" opacity="0.4"/>
                <text x="24" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="Inter,sans-serif">16:9</text>
              </svg>
            </button>
            <button
              onClick={() => updateExportSettings({ canvasRatio: '9:16' })}
              className={'ratio-btn' + (exportSettings.canvasRatio === '9:16' ? ' ratio-btn-active' : '')}
              title="" data-tooltip="9:16 — Portrait"
            >
              <svg viewBox="0 0 28 46" width="17" height="28" fill="none">
                <rect x="1" y="1" width="26" height="44" rx="4" stroke="currentColor" strokeWidth="2"/>
                <circle cx="14" cy="41" r="2" fill="currentColor" opacity="0.4"/>
                <rect x="10" y="3.5" width="8" height="1.5" rx="0.75" fill="currentColor" opacity="0.4"/>
                <text x="14" y="24" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="Inter,sans-serif">9:16</text>
              </svg>
            </button>
            <button
              onClick={() => updateExportSettings({ canvasRatio: '1:1' })}
              className={'ratio-btn' + (exportSettings.canvasRatio === '1:1' ? ' ratio-btn-active' : '')}
              title="" data-tooltip="1:1 — Square"
            >
              <svg viewBox="0 0 36 36" width="24" height="24" fill="none">
                <rect x="1" y="1" width="34" height="34" rx="3" stroke="currentColor" strokeWidth="2"/>
                <text x="18" y="22" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" fontFamily="Inter,sans-serif">1:1</text>
              </svg>
            </button>
          </div>
        </div>

        <div className="top-bar-space" />

        {/* Right: studio logo → goes to home */}
        <button className="studio-home-btn" onClick={() => setView('home')} title="Ana Sayfaya Dön">
          <div className="studio-home-icon">
            {/* Lego-style stacked blocks icon */}
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
            <span className="studio-home-sub">Ana Sayfa</span>
          </div>
        </button>

      </header>

      {/* Content */}
      <div className="content-area">
        {/* Main panel */}
        <div className="main-panel">
          {activeTab === 'preview' ? (
            <>
              <div className="chart-area">
                <RaceChart />
              </div>
              <PlaybackBar />
            </>
          ) : (
            <DataPanel />
          )}
        </div>

        {/* Right sidebar — always visible */}
        <aside className="right-sidebar">
          <div className="settings-scroll-area">
            <SettingsPanel />
          </div>
          <div className="export-sticky-panel">
            <ExportPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
