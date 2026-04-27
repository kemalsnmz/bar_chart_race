import { useEffect, useRef, useState } from 'react';
import { useChartStore } from '../../store/chartStore';

export type ColMenuType = 'label' | 'category' | 'image' | 'period';

export interface ColMenuState {
  x: number;
  y: number;
  colType: ColMenuType;
  colId: string;
}

interface Props extends ColMenuState {
  onClose: () => void;
  onSort: (col: string, dir: 'asc' | 'desc') => void;
  onRemoveRow: (name: string) => void;
}

const ICONS: Record<string, string> = {
  'insert-left':  '←',
  'insert-right': '→',
  'remove-col':   '✕',
  'sort-asc':     '↑',
  'sort-desc':    '↓',
  'remove-row':   '✕',
};

export function ColumnMenu({ x, y, colType, colId, onClose, onSort }: Props) {
  const { addPeriod, removePeriod } = useChartStore();
  const ref = useRef<HTMLDivElement>(null);
  const [inserting, setInserting] = useState<'left' | 'right' | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', down), 0);
    return () => document.removeEventListener('mousedown', down);
  }, [onClose]);

  useEffect(() => {
    if (inserting) setTimeout(() => inputRef.current?.focus(), 0);
  }, [inserting]);

  const handleInsert = () => {
    const name = draft.trim();
    if (!name) return;
    if (inserting === 'right') addPeriod(name, colId);
    else addPeriod(name, undefined, colId);
    onClose();
  };

  // Keep menu inside viewport
  const left = Math.min(x, window.innerWidth - 230);
  const top  = Math.min(y, window.innerHeight - 320);

  const isPeriod = colType === 'period';

  return (
    <div ref={ref} className="col-menu" style={{ left, top }}>
      {inserting ? (
        /* ── Insert sub-panel ── */
        <div className="col-menu-insert">
          <p className="col-menu-insert-label">
            Insert column {inserting === 'left' ? 'before' : 'after'} <strong>{colId}</strong>
          </p>
          <input
            ref={inputRef}
            className="col-menu-input"
            placeholder="e.g. 2025"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleInsert();
              if (e.key === 'Escape') setInserting(null);
            }}
          />
          <div className="col-menu-insert-row">
            <button className="col-menu-confirm" onClick={handleInsert}>Add</button>
            <button className="col-menu-cancel"  onClick={() => setInserting(null)}>Cancel</button>
          </div>
        </div>
      ) : (
        /* ── Main menu ── */
        <>
          {isPeriod && (
            <>
              <button className="col-menu-item" onClick={() => { setDraft(''); setInserting('left'); }}>
                <span className="col-menu-icon">←</span> Insert column left
              </button>
              <button className="col-menu-item" onClick={() => { setDraft(''); setInserting('right'); }}>
                <span className="col-menu-icon">→</span> Insert column right
              </button>
              <div className="col-menu-sep" />
            </>
          )}

          <button className="col-menu-item" onClick={() => { onSort(colId, 'asc'); onClose(); }}>
            <span className="col-menu-icon">↑</span> Sort A → Z
          </button>
          <button className="col-menu-item" onClick={() => { onSort(colId, 'desc'); onClose(); }}>
            <span className="col-menu-icon">↓</span> Sort Z → A
          </button>

          {isPeriod && (
            <>
              <div className="col-menu-sep" />
              <button
                className="col-menu-item col-menu-danger"
                onClick={() => { removePeriod(colId); onClose(); }}
              >
                <span className="col-menu-icon">✕</span> Remove column
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
