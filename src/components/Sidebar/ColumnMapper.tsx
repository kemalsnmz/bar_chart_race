import { useState, useEffect } from 'react';
import { useChartStore } from '../../store/chartStore';
import { useCSVParser, type ColumnMapping } from '../../hooks/useCSVParser';
import type { DataRow } from '../../store/chartStore';

function guessMapping(columns: string[]): ColumnMapping {
  const nameCol =
    columns.find(c => /name|country|entity|label/i.test(c)) || columns[0];
  const valCol =
    columns.find(c => /value|gdp|amount|total|count|score/i.test(c)) ||
    columns.find(c => c !== nameCol) ||
    columns[1] ||
    columns[0];
  const timeCol =
    columns.find(c => /year|date|time|period|month/i.test(c)) ||
    columns.find(c => c !== nameCol && c !== valCol) ||
    columns[2] || columns[1] || columns[0];
  const imageCol =
    columns.find(c => /image|img|pic|icon|url/i.test(c)) || '';
  return { name: nameCol, value: valCol, time: timeCol, image: imageCol };
}

function isWideFormat(columns: string[]): boolean {
  const hasExplicitValueOrTime = columns.some(c =>
    /value|gdp|amount|total|count|score|year|date|time|period/i.test(c)
  );
  return columns.length >= 4 && !hasExplicitValueOrTime;
}

interface PreviewData {
  entities: string[];
  periods: string[];
  rows: DataRow[];
}

const FIELD_META = {
  name:  { icon: '🏷', color: '#6366f1', label: 'Name / Label',   desc: 'The entity being tracked (e.g. Country, Company)' },
  value: { icon: '📊', color: '#10b981', label: 'Value',          desc: 'The numeric value for each period' },
  time:  { icon: '📅', color: '#f59e0b', label: 'Time / Period',  desc: 'Year, month or date column' },
  image: { icon: '🖼', color: '#8b5cf6', label: 'Image URL',      desc: 'Optional: flag or logo URL' },
} as const;

export function ColumnMapper() {
  const { pendingCSV, setPendingCSV, setData, setCsvPreviewReady } = useChartStore();
  const { parseCSV } = useCSVParser();

  const [mapping, setMapping] = useState<ColumnMapping>({ name: '', value: '', time: '', image: '' });
  const [step, setStep] = useState<1 | 2>(1);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const wide = pendingCSV ? isWideFormat(pendingCSV.columns) : false;

  useEffect(() => {
    if (pendingCSV) {
      setMapping(guessMapping(pendingCSV.columns));
      setStep(1);
      setPreview(null);
      setError('');
    }
  }, [pendingCSV]);

  if (!pendingCSV) return null;
  const { columns, file } = pendingCSV;

  const handlePreview = async () => {
    if (!wide && (!mapping.name || !mapping.value || !mapping.time)) {
      setError('Please select the Label, Value, and Time columns.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, periods } = await parseCSV(file, wide ? undefined : mapping);
      if (data.length === 0) {
        setError('No valid rows found with the selected columns.');
        setLoading(false);
        return;
      }
      const entities = [...new Set(data.map(d => d.name))];
      setPreview({ entities, periods, rows: data });
      // Load data into store and signal parent to switch to preview tab
      setData(data, periods);
      setCsvPreviewReady(true);
      setStep(2);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    setCsvPreviewReady(false);
    setPendingCSV(null);
  };

  const handleBack = () => {
    setStep(1);
    setCsvPreviewReady(false);
  };

  return (
    <div className="cm-wizard">
      {/* Steps */}
      <div className="cm-steps">
        <div className={`cm-step ${step === 1 ? 'cm-step-active' : 'cm-step-done'}`}>
          <span className="cm-step-num">{step > 1 ? '✓' : '1'}</span>
          <span>Column mapping</span>
        </div>
        <div className="cm-step-line" />
        <div className={`cm-step ${step === 2 ? 'cm-step-active' : ''}`}>
          <span className="cm-step-num">2</span>
          <span>Preview</span>
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <>
          <div className="cm-format-badge">
            {wide
              ? <><span className="cm-badge cm-badge-wide">Wide format</span> A=Name · B=Category · C=Image · D+=Periods</>
              : <><span className="cm-badge cm-badge-long">Long format</span> Each row is a single value</>
            }
          </div>

          {wide ? (
            <div className="cm-wide-info">
              <div className="cm-wide-row">
                {columns.slice(0, 4).map((col, i) => (
                  <div key={col} className="cm-wide-col">
                    <span className="cm-wide-letter">{String.fromCharCode(65 + i)}</span>
                    <span className="cm-wide-name">{col}</span>
                    <span className="cm-wide-role">
                      {['Name', 'Category', 'Image', 'Period...'][i]}
                    </span>
                  </div>
                ))}
                {columns.length > 4 && (
                  <div className="cm-wide-col cm-wide-more">
                    +{columns.length - 4} more periods
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="cm-fields">
              {(['name', 'value', 'time', 'image'] as const).map((field, i) => {
                const meta = FIELD_META[field];
                const optional = field === 'image';
                return (
                  <div key={field} className="cm-field-row">
                    <div className="cm-field-left">
                      <span className="cm-field-icon" style={{ background: meta.color + '1a', color: meta.color }}>
                        {meta.icon}
                      </span>
                      <div className="cm-field-text">
                        <span className="cm-field-name">
                          {meta.label}
                          {optional && <span className="cm-optional">optional</span>}
                        </span>
                        <span className="cm-field-desc">{meta.desc}</span>
                      </div>
                    </div>
                    <select
                      className="cm-select-inline"
                      value={mapping[field]}
                      onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                      style={{ borderBottomColor: mapping[field] ? meta.color : undefined }}
                    >
                      <option value="">— select —</option>
                      {columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          {error && <p className="cm-error">{error}</p>}

          <div className="cm-actions">
            <button className="btn btn-ghost" onClick={() => setPendingCSV(null)}>Cancel</button>
            <button className="btn btn-gradient" onClick={handlePreview} disabled={loading}>
              {loading ? 'Loading…' : 'Preview →'}
            </button>
          </div>
        </>
      )}

      {/* Step 2 — Chart is now visible in Preview tab; just show confirm row */}
      {step === 2 && preview && (
        <>
          <div className="cm-preview-stats">
            <span className="cm-stat"><strong>{preview.entities.length}</strong> entities</span>
            <span className="cm-stat-dot">·</span>
            <span className="cm-stat"><strong>{preview.periods.length}</strong> periods</span>
            <span className="cm-stat-dot">·</span>
            <span className="cm-stat"><strong>{preview.rows.length}</strong> values</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 10px' }}>
            Switch to the <strong>Preview</strong> tab to see the chart. Come back here to confirm or revise.
          </p>
          <div className="cm-actions">
            <button className="btn btn-ghost" onClick={handleBack}>← Revise</button>
            <button className="btn btn-gradient" onClick={handleLoad}>✓ Use this data</button>
          </div>
        </>
      )}
    </div>
  );
}
