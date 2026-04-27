import { useEffect, useRef } from 'react';

interface Props {
  x: number;
  y: number;
  hasRow: boolean;      // right-clicked inside a data row
  hasPeriodCol: boolean; // right-clicked inside a period column (not A/B/C)
  selColCount: number;  // how many columns are currently selected
  onClose: () => void;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onRemoveRow: () => void;
  onInsertColLeft: () => void;
  onInsertColRight: () => void;
  onRemoveCol: () => void;
  onSortAsc: () => void;
  onSortDesc: () => void;
}

type Item =
  | { kind: 'action'; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }
  | { kind: 'sep' };

export function ContextMenu(props: Props) {
  const {
    x, y, hasRow, hasPeriodCol, selColCount,
    onClose,
    onInsertRowAbove, onInsertRowBelow, onRemoveRow,
    onInsertColLeft, onInsertColRight, onRemoveCol,
    onSortAsc, onSortDesc,
  } = props;

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const up = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => {
      document.addEventListener('mousedown', down);
      document.addEventListener('keydown', up);
    }, 0);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', up);
    };
  }, [onClose]);

  const act = (fn: () => void) => () => { fn(); onClose(); };

  const items: Item[] = [];

  if (hasRow) {
    items.push(
      { kind: 'action', label: 'Insert row above', onClick: act(onInsertRowAbove) },
      { kind: 'action', label: 'Insert row below', onClick: act(onInsertRowBelow) },
    );
  }

  if (hasPeriodCol) {
    items.push(
      { kind: 'action', label: 'Insert column left',  onClick: act(onInsertColLeft) },
      { kind: 'action', label: 'Insert column right', onClick: act(onInsertColRight) },
    );
  }

  if (hasRow || hasPeriodCol) {
    items.push({ kind: 'sep' });
  }

  if (hasRow) {
    items.push({ kind: 'action', label: 'Remove row',    onClick: act(onRemoveRow),  danger: true });
  }
  if (hasPeriodCol) {
    const label = selColCount > 1 ? `Remove ${selColCount} columns` : 'Remove column';
    items.push({ kind: 'action', label, onClick: act(onRemoveCol), danger: true });
  }

  if (hasRow || hasPeriodCol) items.push({ kind: 'sep' });

  items.push(
    { kind: 'action', label: 'Sort by column (A → Z)', onClick: act(onSortAsc) },
    { kind: 'action', label: 'Sort by column (Z → A)', onClick: act(onSortDesc) },
    { kind: 'sep' },
    { kind: 'action', label: 'Combine columns ("unpivot")', onClick: () => {}, disabled: true },
  );

  const left = Math.min(x, window.innerWidth  - 240);
  const top  = Math.min(y, window.innerHeight - 40 - items.length * 36);

  return (
    <div ref={ref} className="ctx-menu" style={{ left, top }}>
      {items.map((item, i) =>
        item.kind === 'sep'
          ? <div key={i} className="ctx-sep" />
          : (
            <button
              key={i}
              className={[
                'ctx-item',
                item.danger   ? 'ctx-danger'   : '',
                item.disabled ? 'ctx-disabled'  : '',
              ].join(' ')}
              onClick={item.disabled ? undefined : item.onClick}
            >
              {item.label}
            </button>
          )
      )}
    </div>
  );
}
