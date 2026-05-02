import { useState } from 'react';
import { useChartStore } from '../../store/chartStore';
import { useVideoExporter } from '../../hooks/useVideoExporter';

export function ExportPanel() {
  const [open, setOpen] = useState(false);
  const { exportSettings, updateExportSettings, isExporting, exportProgress } = useChartStore();
  const { exportVideo } = useVideoExporter();

  return (
    <div className="fl-panel">
      <button className="fl-section-hdr fl-export-hdr" onClick={() => setOpen(o => !o)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .18s ease', flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.2px' }}>Export Video</span>
      </button>

      {open && (
        <div className="fl-section-body" style={{ paddingTop: 10 }}>
          <div className="toggle-group" style={{ marginBottom: 12 }}>
            <button
              className={'toggle-btn' + (exportSettings.resolution === '1080p' ? ' active' : '')}
              onClick={() => updateExportSettings({ resolution: '1080p' })}
            >1080p</button>
            <button
              className={'toggle-btn' + (exportSettings.resolution === '4k' ? ' active' : '')}
              onClick={() => updateExportSettings({ resolution: '4k' })}
            >4K</button>
          </div>

          {exportSettings.resolution === '4k' && (
            <div className="warning-box">
              <strong>⚠ High RAM Usage</strong>
              8GB+ RAM is recommended for 4K rendering.
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Framerate</label>
            <div className="fps-group">
              {[24, 30, 60].map(fps => (
                <button
                  key={fps}
                  className={'fps-btn' + (exportSettings.fps === fps ? ' active' : '')}
                  onClick={() => updateExportSettings({ fps })}
                >{fps}</button>
              ))}
            </div>
          </div>

          <button
            onClick={exportVideo}
            disabled={isExporting}
            className="btn btn-gradient"
            style={{ marginTop: 8 }}
          >
            {isExporting ? 'Exporting...' : 'Export MP4'}
          </button>

          {isExporting && (
            <div className="progress-bar-container">
              <div className="progress-label">
                <span>Progress</span>
                <span>{Math.round(exportProgress * 100)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: exportProgress * 100 + '%' }} />
              </div>
              <p className="progress-status">
                {exportProgress < 0.5 ? 'Recording frames...' : 'Converting to MP4... (First time ~30MB download)'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
