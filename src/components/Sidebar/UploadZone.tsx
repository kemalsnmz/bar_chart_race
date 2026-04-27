import { useRef, useState } from 'react';
import { useCSVParser } from '../../hooks/useCSVParser';
import { useChartStore } from '../../store/chartStore';
import { sampleData } from '../../utils/sampleData';

export function UploadZone() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { parseCSV, parseHeaders } = useCSVParser();
  const { setData, setPendingCSV } = useChartStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      alert('Please upload a CSV file.');
      return;
    }
    try {
      const columns = await parseHeaders(file);
      setPendingCSV({ file, columns });
    } catch (err) {
      alert('Error reading CSV: ' + err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const loadSampleData = async () => {
    try {
      const { data, periods } = await parseCSV(sampleData);
      setData(data, periods);
    } catch (err) {
      alert('Error loading sample data: ' + err);
    }
  };

  return (
    <div className="panel">
      <h2>Data Source</h2>
      <div
        className={'upload-dropzone' + (isDragging ? ' drag-over' : '')}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p>{isDragging ? 'Drop your CSV here' : 'Click or drag CSV file to upload'}</p>
        <p className="sub">Files are processed locally</p>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <div className="divider"><span>or</span></div>
      <button onClick={loadSampleData} className="btn btn-primary">
        Load Sample Data
      </button>
    </div>
  );
}
