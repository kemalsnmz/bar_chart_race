import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

const PALETTE = [
  '#000000','#FFFFFF','#F5F5F5','#E0E0E0','#9E9E9E','#616161',
  '#EF5350','#E53935','#B71C1C','#FF7043','#F4511E','#BF360C',
  '#FFCA28','#FFB300','#FF6F00','#66BB6A','#43A047','#1B5E20',
  '#26C6DA','#00ACC1','#006064','#29B6F6','#039BE5','#01579B',
  '#5C6BC0','#3949AB','#1A237E','#AB47BC','#8E24AA','#4A148C',
  '#EC407A','#D81B60','#880E4F','#FF8A65','#A1887F','#6D4C41',
  '#4F46E5','#7C3AED','#DB2777','#059669','#D97706','#DC2626',
];

function hexToRgb(hex: string) {
  const c = hex.replace('#', '').padEnd(6, '0');
  return { r: parseInt(c.slice(0,2),16)||0, g: parseInt(c.slice(2,4),16)||0, b: parseInt(c.slice(4,6),16)||0 };
}
function rgbToHex(r:number,g:number,b:number) {
  return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');
}
function isValidHex(s:string){ return /^#[0-9a-fA-F]{6}$/.test(s); }

interface Props { value: string; onChange: (hex: string) => void; label?: string; }

export function ColorPicker({ value, onChange, label }: Props) {
  const [open, setOpen]       = useState(false);
  const [hexInput, setHexInput] = useState(value.toUpperCase());
  const [rgb, setRgb]         = useState(hexToRgb(value));
  const popRef   = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  useEffect(() => { setHexInput(value.toUpperCase()); setRgb(hexToRgb(value)); }, [value]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const pick = (hex: string) => { onChange(hex); setHexInput(hex.toUpperCase()); setRgb(hexToRgb(hex)); };
  const handleHex = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase();
    setHexInput(v);
    const full = v.startsWith('#') ? v : '#'+v;
    if (isValidHex(full)) { onChange(full); setRgb(hexToRgb(full)); }
  };
  const handleRgb = (ch: 'r'|'g'|'b', val: string) => {
    const n = { ...rgb, [ch]: Math.max(0, Math.min(255, parseInt(val)||0)) };
    setRgb(n);
    const hex = rgbToHex(n.r, n.g, n.b);
    onChange(hex); setHexInput(hex.toUpperCase());
  };

  return (
    <div className="cp-wrap">
      {label && <span className="fl-tiny-label">{label}</span>}

      {/* Trigger — just a color swatch */}
      <button ref={btnRef} className="cp-swatch-btn" onClick={() => setOpen(o => !o)}
        style={{ background: value }} title={value.toUpperCase()} />

      {open && (
        <div ref={popRef} className="cp-popover">
          {/* Gradient + hue */}
          <div className="cp-picker-wrap">
            <HexColorPicker color={value} onChange={pick} />
          </div>

          {/* Hex + RGB inputs */}
          <div className="cp-inputs">
            <div className="cp-input-group cp-input-hex">
              <input className="cp-input" value={hexInput} onChange={handleHex} maxLength={7} spellCheck={false} />
              <span className="cp-input-label">HEX</span>
            </div>
            {(['r','g','b'] as const).map(ch => (
              <div key={ch} className="cp-input-group">
                <input className="cp-input" type="number" min={0} max={255}
                  value={rgb[ch]} onChange={e => handleRgb(ch, e.target.value)} />
                <span className="cp-input-label">{ch.toUpperCase()}</span>
              </div>
            ))}
          </div>

          {/* Preset palette */}
          <div className="cp-palette">
            {PALETTE.map(c => (
              <button key={c} className={'cp-swatch' + (value.toLowerCase() === c.toLowerCase() ? ' cp-swatch-selected' : '')}
                style={{ background: c }} onClick={() => pick(c)} title={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
