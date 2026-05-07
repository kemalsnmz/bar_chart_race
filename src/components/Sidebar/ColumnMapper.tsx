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

export function ColumnMapper() {
  const { pendingCSV, setPendingCSV, setData } = useChartStore();
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
      setStep(2);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    if (!preview) return;
    setData(preview.rows, preview.periods);
    setPendingCSV(null);
  };

  const sel = (field: keyof ColumnMapping, label: string, optional = false) => (
    <div className="cm-field">
      <label className="cm-field-label">
        {label}
        {optional && <span className="cm-optional">optional</span>}
      </label>
      <select
        className="cm-select"
        value={mapping[field]}
        onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
      >
        <option value="">— select —</option>
        {columns.map(col => (
          <option key={col} value={col}>{col}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="cm-wizard">
      {/* Steps indicator */}
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
              {sel('name', 'Name / Label')}
              {sel('value', 'Value (numeric)')}
              {sel('time', 'Time / Period')}
              {sel('image', 'Image URL', true)}
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

      {/* Step 2 — Preview */}
      {step === 2 && preview && (
        <>
          <div className="cm-preview-stats">
            <span className="cm-stat"><strong>{preview.entities.length}</strong> entities</span>
            <span className="cm-stat-dot">·</span>
            <span className="cm-stat"><strong>{preview.periods.length}</strong> periods</span>
            <span className="cm-stat-dot">·</span>
            <span className="cm-stat"><strong>{preview.rows.length}</strong> values</span>
          </div>

          <div className="cm-preview-table-wrap">
            <table className="cm-preview-table">
              <thead>
                <tr>
                  <th>Name</th>
                  {preview.periods.slice(0, 4).map(p => <th key={p}>{p}</th>)}
                  {preview.periods.length > 4 && <th>…</th>}
                </tr>
              </thead>
              <tbody>
                {preview.entities.slice(0, 6).map(entity => (
                  <tr key={entity}>
                    <td className="cm-preview-name">{entity}</td>
                    {preview.periods.slice(0, 4).map(p => {
                      const val = preview.rows.find(r => r.name === entity && r.time === p)?.value;
                      return (
                        <td key={p} className="cm-preview-val">
                          {val !== undefined ? Number(val).toLocaleString() : <span className="cm-no-val">—</span>}
                        </td>
                      );
                    })}
                    {preview.periods.length > 4 && <td className="cm-no-val">…</td>}
                  </tr>
                ))}
                {preview.entities.length > 6 && (
                  <tr>
                    <td colSpan={6} className="cm-preview-more">
                      +{preview.entities.length - 6} more entities…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="cm-actions">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-gradient" onClick={handleLoad}>Load ✓</button>
          </div>
        </>
      )}
    </div>
  );
}
