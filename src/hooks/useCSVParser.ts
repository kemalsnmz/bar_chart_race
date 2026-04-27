import Papa from 'papaparse';
import type { DataRow } from '../store/chartStore';

export interface ColumnMapping {
  name: string;
  value: string;
  time: string;
}

function runParse(file: File | string, config: Papa.ParseConfig) {
  if (typeof file === 'string') {
    Papa.parse(file, config);
  } else {
    Papa.parse(file, config);
  }
}

function autoDetectMapping(columns: string[]): ColumnMapping {
  const nameCol =
    columns.find(c => /name|country|entity|label/i.test(c)) || columns[0];
  const valCol =
    columns.find(c => /value|gdp|amount|total|count|score/i.test(c)) ||
    columns.find(c => c !== nameCol) ||
    columns[1];
  const timeCol =
    columns.find(c => /year|date|time|period|month/i.test(c)) ||
    columns.find(c => c !== nameCol && c !== valCol) ||
    columns[2] ||
    columns[1];
  return { name: nameCol, value: valCol, time: timeCol };
}

export function useCSVParser() {
  const parseHeaders = (file: File | string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      runParse(file, {
        header: true,
        preview: 1,
        complete: (results) => {
          if (!results.meta.fields) return reject('No headers found');
          resolve(results.meta.fields);
        },
        error: (err) => reject(err.message),
      });
    });
  };

  const parseCSV = (
    file: File | string,
    mapping?: ColumnMapping
  ): Promise<{ data: DataRow[]; periods: string[]; columns: string[] }> => {
    return new Promise((resolve, reject) => {
      runParse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (!results.meta.fields) return reject('No headers found');
          const columns = results.meta.fields;

          const { name: nameCol, value: valCol, time: timeCol } =
            mapping || autoDetectMapping(columns);

          const rawData = results.data as Record<string, unknown>[];
          const data: DataRow[] = [];
          const periodSet = new Set<string>();

          for (const row of rawData) {
            if (row[nameCol] && row[valCol] !== undefined && row[timeCol]) {
              const timeStr = String(row[timeCol]);
              data.push({
                name: String(row[nameCol]),
                value: Number(row[valCol]),
                time: timeStr,
              });
              periodSet.add(timeStr);
            }
          }

          const periods = Array.from(periodSet).sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
          });

          resolve({ data, periods, columns });
        },
        error: (err) => reject(err.message),
      });
    });
  };

  return { parseCSV, parseHeaders };
}
