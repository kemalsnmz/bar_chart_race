import { useState, useRef, useMemo, useCallback } from 'react';
import { useChartStore } from '../../store/chartStore';
import { useCSVParser } from '../../hooks/useCSVParser';
import { ColumnMapper } from '../Sidebar/ColumnMapper';
import { ContextMenu } from './ContextMenu';
import { sampleData, sampleImages } from '../../utils/sampleData';
import { getCountryFlagUrl } from '../../utils/countryFlags';

const EXTRA_ROWS = 30;
const EXTRA_COLS = 8;

function colLetter(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  return String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26));
}

/* ── Generic inline editable text ── */
function EditableText({
  value, onCommit, align = 'right', placeholder = '',
}: { value: string; onCommit: (v: string) => void; align?: 'left' | 'right'; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const start = () => { setDraft(value); setEditing(true); setTimeout(() => ref.current?.select(), 0); };
  const commit = () => { const t = draft.trim(); if (t !== value) onCommit(t || value); setEditing(false); };

  if (editing) return (
    <input ref={ref} className={`spr-input ${align === 'left' ? 'spr-input-left' : ''}`}
      value={draft} autoFocus placeholder={placeholder}
      onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }} />
  );
  return (
    <span className={`spr-header-val ${align === 'left' ? 'spr-val-left' : 'spr-val'}`}
      onClick={start} title="Click to edit">
      {value || <span style={{ color: '#bbb' }}>{placeholder}</span>}
    </span>
  );
}

/* ── Editable value cell ── */
function ValueCell({ value, name, time }: { value: number | null; name: string; time: string }) {
  const { updateValue } = useChartStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const start = () => { setDraft(value !== null ? String(value) : ''); setEditing(true); setTimeout(() => ref.current?.select(), 0); };
  const commit = () => { const n = parseFloat(draft); if (!isNaN(n)) updateValue(name, time, n); setEditing(false); };

  if (editing) return (
    <input ref={ref} className="spr-input" value={draft} autoFocus
      onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }} />
  );
  if (value === null) return <span className="spr-empty" onClick={start} />;
  return <span className="spr-val" onClick={start} title="Click to edit">{value.toLocaleString()}</span>;
}


/* ── Editable name cell ── */
function NameCell({ name }: { name: string }) {
  const { renameEntity } = useChartStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const start = () => { setDraft(name); setEditing(true); setTimeout(() => ref.current?.select(), 0); };
  const commit = () => { const t = draft.trim(); if (t && t !== name) renameEntity(name, t); setEditing(false); };

  if (editing) return (
    <input ref={ref} className="spr-input spr-input-left" value={draft} autoFocus
      onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }} />
  );
  return <span className="spr-val-left" onClick={start} title="Click to edit">{name}</span>;
}

const COL_DEFS = [
  { letter: 'A', type: 'abc' as const, label: 'Label',      colName: 'Name',     colKey: 'label'    },
  { letter: 'B', type: 'abc' as const, label: 'Categories', colName: 'Category', colKey: 'category' },
  { letter: 'C', type: 'img' as const, label: 'Image',      colName: 'Image URL',colKey: 'image'    },
];

interface CtxState {
  x: number; y: number;
  colId: string | null;     // period name or colKey
  rowName: string | null;
  isPeriod: boolean;
}

export function DataPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    data, periods, pendingCSV, setPendingCSV, setData,
    renamePeriod, addPeriod, removePeriod,
    addEntity, removeEntity,
    updateCategory, updateImageUrl,
  } = useChartStore();
  const { parseHeaders, parseCSV } = useCSVParser();

  const totalFixed = COL_DEFS.length;

  /* ── Sort ── */
  const [sortState, setSortState] = useState<{ col: string; dir: 'asc' | 'desc' } | null>(null);

  /* ── Row order (for insert above/below) ── */
  const [rowOrder, setRowOrder] = useState<string[] | null>(null);

  /* ── Multi-col selection ── */
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const lastSelCol = useRef<string | null>(null);

  /* ── New entity editing ── */
  const [editingExtraRow, setEditingExtraRow] = useState<number | null>(null);
  const [extraDraft, setExtraDraft] = useState('');
  const extraInputRef = useRef<HTMLInputElement>(null);

  /* ── New period editing ── */
  const [editingExtraCol, setEditingExtraCol] = useState<number | null>(null);
  const [extraColDraft, setExtraColDraft] = useState('');
  const extraColInputRef = useRef<HTMLInputElement>(null);

  const commitExtraCol = () => {
    const t = extraColDraft.trim();
    if (t) addPeriod(t);
    setEditingExtraCol(null);
    setExtraColDraft('');
  };

  /* ── Google Sheets import ── */
  const [showSheets, setShowSheets] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState('');

  const handleSheetsLoad = async () => {
    const url = sheetsUrl.trim();
    if (!url) return;
    const match = url.match(/\/spreadsheets\/d\/([^/]+)/);
    if (!match) { setSheetsError('Please enter a valid Google Sheets URL.'); return; }
    const id = match[1];
    const gidMatch = url.match(/[#&?]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    setSheetsLoading(true);
    setSheetsError('');
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} — Make sure the sheet is publicly accessible.`);
      const text = await res.text();
      const columns = await parseHeaders(text);
      setPendingCSV({ file: text as unknown as File, columns });
      setShowSheets(false);
      setSheetsUrl('');
    } catch (err) {
      setSheetsError(String(err));
    } finally {
      setSheetsLoading(false);
    }
  };

  const commitExtraRow = () => {
    const t = extraDraft.trim();
    if (t) {
      addEntity(t);
      setRowOrder(prev => {
        const base = prev ?? [...entities];
        return [...base, t];
      });
    }
    setEditingExtraRow(null);
    setExtraDraft('');
  };

  /* ── Context menu ── */
  const [ctx, setCtx] = useState<CtxState | null>(null);

  /* ── Local header labels ── */
  const [colLabels, setColLabels] = useState<Record<string, string>>({
    A: 'Name', B: 'Category', C: 'Image URL',
  });
  const setLabel = (letter: string, val: string) =>
    setColLabels(prev => ({ ...prev, [letter]: val }));

  /* ── Derived entity list ── */
  const entities = useMemo(() => {
    const all = [...new Set(data.map(d => d.name))];
    if (rowOrder) {
      const ordered = rowOrder.filter(n => all.includes(n));
      const rest = all.filter(n => !rowOrder.includes(n));
      return [...ordered, ...rest];
    }
    if (!sortState) return all.sort();
    if (sortState.col === 'label')
      return all.sort((a, b) => sortState.dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a));
    if (sortState.col === 'category') {
      return all.sort((a, b) => {
        const ca = data.find(d => d.name === a)?.category ?? '';
        const cb = data.find(d => d.name === b)?.category ?? '';
        return sortState.dir === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
      });
    }
    return all.sort((a, b) => {
      const va = data.find(d => d.name === a && d.time === sortState.col)?.value ?? 0;
      const vb = data.find(d => d.name === b && d.time === sortState.col)?.value ?? 0;
      return sortState.dir === 'asc' ? va - vb : vb - va;
    });
  }, [data, sortState, rowOrder]);

  /* ── Column header click (select / multi-select) ── */
  const handleColHeaderClick = useCallback((e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (e.ctrlKey || e.metaKey) {
        if (next.has(colId)) next.delete(colId); else next.add(colId);
      } else if (e.shiftKey && lastSelCol.current) {
        const allCols = [...COL_DEFS.map(c => c.colKey), ...periods];
        const a = allCols.indexOf(lastSelCol.current);
        const b = allCols.indexOf(colId);
        const [lo, hi] = a < b ? [a, b] : [b, a];
        allCols.slice(lo, hi + 1).forEach(c => next.add(c));
      } else {
        next.clear();
        next.add(colId);
      }
      lastSelCol.current = colId;
      return next;
    });
  }, [periods]);

  /* ── Right-click handler ── */
  const handleRightClick = useCallback((
    e: React.MouseEvent,
    colId: string | null,
    rowName: string | null,
    isPeriod: boolean,
  ) => {
    e.preventDefault();
    // Select the column if not already selected
    if (colId && !selectedCols.has(colId)) {
      setSelectedCols(new Set([colId]));
      lastSelCol.current = colId;
    }
    setCtx({ x: e.clientX, y: e.clientY, colId, rowName, isPeriod });
  }, [selectedCols]);

  /* ── Context menu actions ── */
  const ctxColIds = ctx?.isPeriod
    ? (selectedCols.size > 0 ? [...selectedCols].filter(c => periods.includes(c)) : ctx.colId ? [ctx.colId] : [])
    : [];
  const primaryCol = ctx?.colId ?? ctxColIds[0] ?? null;

  const ctxInsertRowAbove = () => {
    const name = window.prompt('New row name:')?.trim();
    if (!name) return;
    addEntity(name);
    if (ctx?.rowName) {
      setRowOrder(prev => {
        const base = prev ?? [...entities];
        const idx = base.indexOf(ctx.rowName!);
        const next = [...base]; next.splice(idx, 0, name); return next;
      });
    }
  };
  const ctxInsertRowBelow = () => {
    const name = window.prompt('New row name:')?.trim();
    if (!name) return;
    addEntity(name);
    if (ctx?.rowName) {
      setRowOrder(prev => {
        const base = prev ?? [...entities];
        const idx = base.indexOf(ctx.rowName!);
        const next = [...base]; next.splice(idx + 1, 0, name); return next;
      });
    }
  };
  const ctxRemoveRow = () => {
    if (!ctx?.rowName) return;
    removeEntity(ctx.rowName);
    setRowOrder(prev => prev ? prev.filter(n => n !== ctx.rowName) : null);
  };
  const ctxInsertColLeft = () => {
    const name = window.prompt('New column name (e.g. 2025):')?.trim();
    if (!name || !primaryCol) return;
    addPeriod(name, undefined, primaryCol);
  };
  const ctxInsertColRight = () => {
    const name = window.prompt('New column name (e.g. 2025):')?.trim();
    if (!name || !primaryCol) return;
    addPeriod(name, primaryCol);
  };
  const ctxRemoveCol = () => {
    ctxColIds.forEach(c => removePeriod(c));
    setSelectedCols(new Set());
  };
  const ctxSortAsc  = () => setSortState({ col: primaryCol ?? 'label', dir: 'asc'  });
  const ctxSortDesc = () => setSortState({ col: primaryCol ?? 'label', dir: 'desc' });

  /* ── Auto-fill image URLs ── */
  const handleAutoFillImages = useCallback(() => {
    const template = window.prompt(
      'URL template — use {name} as placeholder:\n\nExamples:\n• https://cdn.simpleicons.org/{name}  (brands/tech)\n• https://flagcdn.com/w80/{name}.png  (countries, 2-letter code)',
      'https://cdn.simpleicons.org/{name}'
    );
    if (!template) return;
    entities.forEach(name => {
      const existing = data.find(d => d.name === name)?.imageUrl ?? '';
      if (!existing) {
        const slug = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9.-]/g, '');
        const url = template.replace(/\{name\}/g, slug);
        updateImageUrl(name, url);
      }
    });
  }, [entities, data, updateImageUrl]);

  /* ── Auto-fill flag URLs ── */
  const handleAutoFillFlags = useCallback(() => {
    let filled = 0;
    entities.forEach(name => {
      const existing = data.find(d => d.name === name)?.imageUrl ?? '';
      if (!existing) {
        const url = getCountryFlagUrl(name);
        if (url) { updateImageUrl(name, url); filled++; }
      }
    });
    if (filled === 0) alert('No recognized country names found. Make sure entity names are spelled correctly.');
    else alert(`Flag images added for ${filled} entities.`);
  }, [entities, data, updateImageUrl]);

  /* ── File upload ── */
  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') { alert('Please upload a CSV file.'); return; }
    try { const columns = await parseHeaders(file); setPendingCSV({ file, columns }); }
    catch (err) { alert('Error reading CSV: ' + err); }
  };
  const loadSample = async () => {
    const { data, periods } = await parseCSV(sampleData);
    const dataWithImages = data.map(row => ({
      ...row,
      imageUrl: sampleImages[row.name] ?? row.imageUrl,
    }));
    setData(dataWithImages, periods); setPendingCSV(null);
  };

  /* ── Helpers ── */
  const isSel = (colId: string) => selectedCols.has(colId);

  return (
    <div className="data-panel" onClick={() => setSelectedCols(new Set())}>

      {/* Upload bar */}
      <div className="data-upload-bar" onClick={e => e.stopPropagation()}>
        <div className="data-drop-area"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          onClick={() => fileInputRef.current?.click()}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>Upload or drag a CSV file</span>
          <input type="file" accept=".csv" ref={fileInputRef} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </div>

        <div className="data-upload-actions">
          <button
            className={'data-action-btn' + (showSheets ? ' data-action-btn-active' : '')}
            onClick={e => { e.stopPropagation(); setShowSheets(s => !s); setSheetsError(''); }}
            title="Import from Google Sheets"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M3 15h18M9 3v18"/>
            </svg>
            <span>Sheets</span>
          </button>
          <button className="data-action-btn data-action-btn-primary" onClick={loadSample}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>Sample Data</span>
          </button>
        </div>
      </div>

      {showSheets && (
        <div className="sheets-import-bar" onClick={e => e.stopPropagation()}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34a853" strokeWidth={2} style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M3 15h18M9 3v18"/>
          </svg>
          <input
            className="sheets-url-input"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetsUrl}
            onChange={e => setSheetsUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSheetsLoad(); if (e.key === 'Escape') setShowSheets(false); }}
            autoFocus
          />
          <button className="sheets-load-btn" onClick={handleSheetsLoad} disabled={sheetsLoading}>
            {sheetsLoading ? '…' : 'Load'}
          </button>
          {sheetsError && <span className="sheets-error">{sheetsError}</span>}
        </div>
      )}

      {pendingCSV && <ColumnMapper />}

      {/* Context menu */}
      {ctx && (
        <ContextMenu
          x={ctx.x} y={ctx.y}
          hasRow={!!ctx.rowName}
          hasPeriodCol={ctx.isPeriod}
          selColCount={ctxColIds.length}
          onClose={() => setCtx(null)}
          onInsertRowAbove={ctxInsertRowAbove}
          onInsertRowBelow={ctxInsertRowBelow}
          onRemoveRow={ctxRemoveRow}
          onInsertColLeft={ctxInsertColLeft}
          onInsertColRight={ctxInsertColRight}
          onRemoveCol={ctxRemoveCol}
          onSortAsc={ctxSortAsc}
          onSortDesc={ctxSortDesc}
        />
      )}

      {/* Spreadsheet */}
      {!pendingCSV && (
        <div className="spr-outer" onClick={e => e.stopPropagation()}>
          <table className="spr-table">
            <thead>
              {/* Row 1 — column letters */}
              <tr className="spr-letters-row">
                <th className="spr-corner" />
                {COL_DEFS.map(col => (
                  <th key={col.letter}
                    className={`col-color-${col.letter.toLowerCase()} spr-col-clickable ${isSel(col.colKey) ? 'col-selected-hdr' : ''}`}
                    onClick={e => { e.stopPropagation(); handleColHeaderClick(e, col.colKey); }}
                    onContextMenu={e => { e.stopPropagation(); handleRightClick(e, col.colKey, null, false); }}
                  >{col.letter}</th>
                ))}
                {periods.map((p, i) => (
                  <th key={p}
                    className={`col-color-val spr-col-clickable ${isSel(p) ? 'col-selected-hdr' : ''}`}
                    onClick={e => { e.stopPropagation(); handleColHeaderClick(e, p); }}
                    onContextMenu={e => { e.stopPropagation(); handleRightClick(e, p, null, true); }}
                  >{colLetter(totalFixed + i)}</th>
                ))}
                {Array.from({ length: EXTRA_COLS }, (_, i) => (
                  <th key={`xc${i}`} className="spr-extra-header">{colLetter(totalFixed + periods.length + i)}</th>
                ))}
              </tr>

              {/* Row 2 — column type descriptions */}
              <tr className="spr-desc-row">
                <td className="spr-corner" />
                {COL_DEFS.map(col => (
                  <td key={col.letter}
                    className={`col-color-${col.letter.toLowerCase()} ${isSel(col.colKey) ? 'col-selected-hdr' : ''}`}
                    onContextMenu={e => { e.stopPropagation(); handleRightClick(e, col.colKey, null, false); }}
                  >
                    <div className="cdesc">
                      <span className={`type-badge ${col.type}`}>{col.type === 'img' ? '🖼' : 'ABC'}</span>
                      <div className="cdesc-label">{col.label}</div>
                      {col.type === 'img' && (
                        <>
                          <button
                            className="img-autofill-btn"
                            onClick={e => { e.stopPropagation(); handleAutoFillImages(); }}
                            title="Auto-fill image URLs from a URL template"
                          >Auto</button>
                          <button
                            className="img-autofill-btn img-flags-btn"
                            onClick={e => { e.stopPropagation(); handleAutoFillFlags(); }}
                            title="Auto-fill flag images from country names"
                          >🏳 Flags</button>
                        </>
                      )}
                    </div>
                  </td>
                ))}
                {periods.length > 0 ? (
                  <td colSpan={periods.length}
                    className={`col-color-val col-values-desc`}
                    onContextMenu={e => { e.stopPropagation(); handleRightClick(e, periods[0], null, true); }}
                  >
                    <div className="cdesc">
                      <span className="type-badge num">123</span>
                      <div className="cdesc-label">Values</div>
                    </div>
                  </td>
                ) : null}
                {Array.from({ length: EXTRA_COLS }, (_, i) => (
                  <td key={`xd${i}`} className="spr-extra-header" />
                ))}
              </tr>

              {/* Row 3 — column names (row 1 of data) */}
              <tr className="spr-names-row">
                <td className="spr-corner spr-rownum-label">1</td>
                {COL_DEFS.map(col => (
                  <td key={col.letter} className={`spr-colname col-color-${col.letter.toLowerCase()}-soft ${isSel(col.colKey) ? 'col-selected-cell' : ''}`}>
                    <EditableText value={colLabels[col.letter] ?? col.colName} onCommit={v => setLabel(col.letter, v)} align="left" />
                  </td>
                ))}
                {periods.map(p => (
                  <td key={p} className={`spr-colname col-color-val-soft ${isSel(p) ? 'col-selected-cell' : ''}`}>
                    <EditableText value={p} onCommit={newVal => renamePeriod(p, newVal)} />
                  </td>
                ))}
                {Array.from({ length: EXTRA_COLS }, (_, i) => (
                  <td key={`xn${i}`} className="spr-colname spr-extra-header spr-period-new"
                    onClick={e => { e.stopPropagation(); if (editingExtraCol !== i) { setExtraColDraft(''); setEditingExtraCol(i); setTimeout(() => extraColInputRef.current?.focus(), 0); } }}
                  >
                    {editingExtraCol === i ? (
                      <input
                        ref={extraColInputRef}
                        className="spr-input"
                        value={extraColDraft}
                        placeholder="Period..."
                        autoFocus
                        onChange={e => setExtraColDraft(e.target.value)}
                        onBlur={commitExtraCol}
                        onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') commitExtraCol(); if (e.key === 'Escape') { setEditingExtraCol(null); setExtraColDraft(''); } }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : <span className="spr-period-new-hint">+</span>}
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {entities.map((entity, rowIdx) => (
                <tr key={entity} className="spr-data-row"
                  onContextMenu={e => { e.stopPropagation(); handleRightClick(e, null, entity, false); }}
                >
                  <td className="spr-rownum"
                    onContextMenu={e => { e.stopPropagation(); handleRightClick(e, null, entity, false); }}
                  >{rowIdx + 2}</td>

                  <td className={`spr-name-cell ${isSel('label') ? 'col-selected-cell' : ''}`}
                    onContextMenu={e => { e.stopPropagation(); handleRightClick(e, 'label', entity, false); }}
                  >
                    <NameCell name={entity} />
                  </td>

                  <td className={`spr-cell spr-val-cell ${isSel('category') ? 'col-selected-cell' : ''}`}
                    onContextMenu={e => { e.stopPropagation(); handleRightClick(e, 'category', entity, false); }}
                  >
                    <EditableText
                      value={data.find(d => d.name === entity)?.category ?? ''}
                      onCommit={v => updateCategory(entity, v)}
                      align="left" placeholder="—"
                    />
                  </td>

                  <td className={`spr-cell spr-val-cell ${isSel('image') ? 'col-selected-cell' : ''}`}
                    onContextMenu={e => { e.stopPropagation(); handleRightClick(e, 'image', entity, false); }}
                  >
                    <EditableText
                      value={data.find(d => d.name === entity)?.imageUrl ?? ''}
                      onCommit={v => updateImageUrl(entity, v)}
                      align="left" placeholder="—"
                    />
                  </td>

                  {periods.map(period => {
                    const row = data.find(d => d.name === entity && d.time === period);
                    return (
                      <td key={period}
                        className={`spr-cell spr-val-cell ${isSel(period) ? 'col-selected-cell' : ''}`}
                        onContextMenu={e => { e.stopPropagation(); handleRightClick(e, period, entity, true); }}
                      >
                        <ValueCell value={row?.value ?? null} name={entity} time={period} />
                      </td>
                    );
                  })}

                  {Array.from({ length: EXTRA_COLS }, (_, i) => (
                    <td key={`xv${i}`} className="spr-cell spr-cell-extra" />
                  ))}
                </tr>
              ))}

              {Array.from({ length: EXTRA_ROWS }, (_, i) => (
                <tr key={`xr${i}`} className="spr-data-row spr-row-extra"
                  onContextMenu={e => { e.stopPropagation(); handleRightClick(e, null, null, false); }}
                >
                  <td className="spr-rownum spr-rownum-extra">{entities.length + i + 2}</td>
                  <td
                    className="spr-name-cell spr-cell-extra spr-name-cell-new"
                    onClick={e => { e.stopPropagation(); if (editingExtraRow !== i) { setExtraDraft(''); setEditingExtraRow(i); setTimeout(() => extraInputRef.current?.focus(), 0); } }}
                  >
                    {editingExtraRow === i ? (
                      <input
                        ref={extraInputRef}
                        className="spr-input spr-input-left"
                        value={extraDraft}
                        placeholder="New name..."
                        autoFocus
                        onChange={e => setExtraDraft(e.target.value)}
                        onBlur={commitExtraRow}
                        onKeyDown={e => {
                          e.stopPropagation();
                          if (e.key === 'Enter') commitExtraRow();
                          if (e.key === 'Escape') { setEditingExtraRow(null); setExtraDraft(''); }
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : null}
                  </td>
                  <td className="spr-cell col-opt spr-cell-extra" />
                  <td className="spr-cell col-opt spr-cell-extra" />
                  {periods.map((_, pi) => <td key={pi} className="spr-cell spr-cell-extra" />)}
                  {Array.from({ length: EXTRA_COLS }, (_, ci) => (
                    <td key={`xe${ci}`} className="spr-cell spr-cell-extra" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.length === 0 && !pendingCSV && (
        <div className="data-empty">
          <p>No data loaded. Upload a CSV or click Sample Data.</p>
        </div>
      )}
    </div>
  );
}
