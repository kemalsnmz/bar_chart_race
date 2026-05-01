import { useEffect, useState } from 'react';
import { SettingsPanel } from './components/Sidebar/SettingsPanel';
import { ExportPanel } from './components/Sidebar/ExportPanel';
import { RaceChart } from './components/Chart/RaceChart';
import { PlaybackBar } from './components/Chart/PlaybackBar';
import { DataPanel } from './components/Data/DataPanel';
import { useCSVParser } from './hooks/useCSVParser';
import { sampleData, sampleMeta } from './utils/sampleData';
import { useChartStore } from './store/chartStore';

const RATIOS = ['16:9', '9:16', '1:1'] as const;

type Tab = 'preview' | 'data';

function App() {
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

  return (
    <div className="app-layout">
      {/* Top bar */}
      <header className="top-bar">
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

        <div className="top-bar-space" />

        {/* Canvas ratio buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>Format</span>
          <div className="tab-group">
            {RATIOS.map(r => (
              <button
                key={r}
                onClick={() => updateExportSettings({ canvasRatio: r })}
                className={'tab-btn' + (exportSettings.canvasRatio === r ? ' active' : '')}
                style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600 }}
              >{r}</button>
            ))}
          </div>
        </div>

        <div className="top-bar-space" />

        <span className="version-badge">v1.0</span>
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
          <SettingsPanel />
          <ExportPanel />
        </aside>
      </div>
    </div>
  );
}

export default App;
