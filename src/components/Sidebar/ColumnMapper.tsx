import { useState, useEffect } from 'react';
import { useChartStore } from '../../store/chartStore';
import { useCSVParser, type ColumnMapping } from '../../hooks/useCSVParser';

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
    columns[2] ||
    columns[1] ||
    columns[0];
  return { name: nameCol, value: valCol, time: timeCol };
}

export function ColumnMapper() {
  const { pendingCSV, setPendingCSV, setData } = useChartStore();
  const { parseCSV } = useCSVParser();

  const [mapping, setMapping] = useState<ColumnMapping>({ name: '', value: '', time: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (pendingCSV) {
      setMapping(guessMapping(pendingCSV.columns));
      setError('');
    }
  }, [pendingCSV]);

  if (!pendingCSV) return null;

  const { columns, file } = pendingCSV;

  const handleApply = async () => {
    if (!mapping.name || !mapping.value || !mapping.time) {
      setError('Please select all three columns.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, periods } = await parseCSV(file, mapping);
      if (data.length === 0) {
        setError('No valid rows found with these columns. Check your selection.');
        setLoading(false);
        return;
      }
      setData(data, periods);
      setPendingCSV(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => setPendingCSV(null);

  const sel = (field: keyof ColumnMapping) => (
    <select
      className="form-select"
      value={mapping[field]}
      onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
    >
      <option value="">— select —</option>
      {columns.map(col => (
        <option key={col} value={col}>{col}</option>
      ))}
    </select>
  );

  return (
    <div className="panel column-mapper">
      <h2>Map Columns</h2>
      <p className="column-mapper-hint">
        {columns.length} columns detected. Tell us which is which:
      </p>

      <div className="form-group">
        <label className="form-label">Name / Category</label>
        {sel('name')}
      </div>

      <div className="form-group">
        <label className="form-label">Value (numeric)</label>
        {sel('value')}
      </div>

      <div className="form-group">
        <label className="form-label">Time / Period</label>
        {sel('time')}
      </div>

      {error && <p className="column-mapper-error">{error}</p>}

      <div className="column-mapper-actions">
        <button
          className="btn btn-gradient"
          onClick={handleApply}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
        <button className="btn btn-ghost" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
