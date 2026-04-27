import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface Props {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '').padEnd(6, '0');
  return {
    r: parseInt(clean.slice(0, 2), 16) || 0,
    g: parseInt(clean.slice(2, 4), 16) || 0,
    b: parseInt(clean.slice(4, 6), 16) || 0,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function isValidHex(s: string) {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export function ColorPicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value.toUpperCase());
  const [rgb, setRgb] = useState(hexToRgb(value));
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync when external value changes
  useEffect(() => {
    setHexInput(value.toUpperCase());
    setRgb(hexToRgb(value));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handlePickerChange = (hex: string) => {
    onChange(hex);
    setHexInput(hex.toUpperCase());
    setRgb(hexToRgb(hex));
  };

  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setHexInput(v.toUpperCase());
    const full = v.startsWith('#') ? v : '#' + v;
    if (isValidHex(full)) {
      onChange(full);
      setRgb(hexToRgb(full));
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: string) => {
    const num = Math.max(0, Math.min(255, parseInt(val) || 0));
    const next = { ...rgb, [channel]: num };
    setRgb(next);
    const hex = rgbToHex(next.r, next.g, next.b);
    onChange(hex);
    setHexInput(hex.toUpperCase());
  };

  return (
    <div className="cp-wrap">
      {label && <span className="fl-tiny-label">{label}</span>}

      <button
        ref={triggerRef}
        className="cp-trigger"
        onClick={() => setOpen(o => !o)}
      >
        <span className="cp-preview" style={{ background: value }} />
        <span className="cp-hex-label">{value.toUpperCase()}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          style={{ marginLeft: 'auto', color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div ref={popoverRef} className="cp-popover">
          {/* Gradient + hue picker */}
          <div className="cp-picker-wrap">
            <HexColorPicker color={value} onChange={handlePickerChange} />
          </div>

          {/* Inputs row */}
          <div className="cp-inputs">
            {/* Hex */}
            <div className="cp-input-group cp-input-hex">
              <input
                className="cp-input"
                value={hexInput}
                onChange={handleHexInput}
                maxLength={7}
                spellCheck={false}
              />
              <span className="cp-input-label">HEX</span>
            </div>

            {/* R */}
            <div className="cp-input-group">
              <input
                className="cp-input"
                type="number" min={0} max={255}
                value={rgb.r}
                onChange={e => handleRgbChange('r', e.target.value)}
              />
              <span className="cp-input-label">R</span>
            </div>

            {/* G */}
            <div className="cp-input-group">
              <input
                className="cp-input"
                type="number" min={0} max={255}
                value={rgb.g}
                onChange={e => handleRgbChange('g', e.target.value)}
              />
              <span className="cp-input-label">G</span>
            </div>

            {/* B */}
            <div className="cp-input-group">
              <input
                className="cp-input"
                type="number" min={0} max={255}
                value={rgb.b}
                onChange={e => handleRgbChange('b', e.target.value)}
              />
              <span className="cp-input-label">B</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
