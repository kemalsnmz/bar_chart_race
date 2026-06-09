import { useRef } from 'react';
import { useChartStore } from '../../store/chartStore';
import type { AudioEntry } from '../../store/chartStore';

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fl-row">
      <span className="fl-label">{label}</span>
      <div className="fl-control">{children}</div>
    </div>
  );
}

export function AudioPanel() {
  const { audioEntries, setAudioEntries, periods } = useChartStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addEntry = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const entry: AudioEntry = {
      id: genId(),
      fileName: file.name,
      objectUrl,
      from: periods[0] ?? '',
      to: periods[periods.length - 1] ?? '',
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    };
    setAudioEntries([...audioEntries, entry]);
  };

  const update = (id: string, patch: Partial<AudioEntry>) => {
    setAudioEntries(audioEntries.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const remove = (id: string) => {
    const entry = audioEntries.find(e => e.id === id);
    if (entry) URL.revokeObjectURL(entry.objectUrl);
    setAudioEntries(audioEntries.filter(e => e.id !== id));
  };

  return (
    <div>
      {/* Upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) addEntry(f); e.target.value = ''; }}
      />
      <button
        className="fl-export-btn"
        style={{ width: '100%', marginBottom: 16 }}
        onClick={() => fileInputRef.current?.click()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Ses Dosyası Yükle
      </button>

      {audioEntries.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '32px 0' }}>
          Henüz ses eklenmedi.<br />MP3, WAV veya OGG yükleyebilirsin.
        </div>
      )}

      {audioEntries.map((entry) => (
        <div key={entry.id} style={{
          background: 'var(--panel-bg, #1a2236)',
          border: '1px solid var(--border, #2a3550)',
          borderRadius: 8,
          padding: '12px',
          marginBottom: 12,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #6c63ff)" strokeWidth={2}>
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.fileName}
              </span>
            </div>
            <button
              onClick={() => remove(entry.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
              title="Sil"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>

          {/* Period range */}
          <Row label="Başlangıç">
            <select
              className="fl-select"
              value={entry.from}
              onChange={e => update(entry.id, { from: e.target.value })}
            >
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Row>
          <Row label="Bitiş">
            <select
              className="fl-select"
              value={entry.to}
              onChange={e => update(entry.id, { to: e.target.value })}
            >
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Row>

          {/* Volume */}
          <Row label="Ses seviyesi">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range" min={0} max={1} step={0.01}
                value={entry.volume}
                onChange={e => update(entry.id, { volume: parseFloat(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
                {Math.round(entry.volume * 100)}%
              </span>
            </div>
          </Row>

          {/* Fade in */}
          <Row label="Fade in (sn)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range" min={0} max={10} step={0.5}
                value={entry.fadeIn}
                onChange={e => update(entry.id, { fadeIn: parseFloat(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
                {entry.fadeIn}s
              </span>
            </div>
          </Row>

          {/* Fade out */}
          <Row label="Fade out (sn)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range" min={0} max={10} step={0.5}
                value={entry.fadeOut}
                onChange={e => update(entry.id, { fadeOut: parseFloat(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28, textAlign: 'right' }}>
                {entry.fadeOut}s
              </span>
            </div>
          </Row>

          {/* Preview player */}
          <div style={{ marginTop: 8 }}>
            <audio
              src={entry.objectUrl}
              controls
              style={{ width: '100%', height: 32, accentColor: 'var(--accent, #6c63ff)' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
