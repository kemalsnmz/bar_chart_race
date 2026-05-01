import Papa from 'papaparse';
import type { DataRow } from '../store/chartStore';

export interface ColumnMapping {
  name: string;
  value: string;
  time: string;
  image?: string;
}

function runParse(file: File | string, config: Papa.ParseConfig) {
  if (typeof file === 'string') {
    Papa.parse(file, config);
  } else {
    Papa.parse(file as any, config);
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
  const imageCol =
    columns.find(c => /image|img|pic|icon|url/i.test(c));
  return { name: nameCol, value: valCol, time: timeCol, image: imageCol };
}

export function useCSVParser() {
  const parseHeaders = (file: File | string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      runParse(file, {
        header: true,
        preview: 1,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            return reject(new Error(results.errors[0].message));
          }
          if (!results.meta.fields) return reject(new Error('No headers found'));
          resolve(results.meta.fields);
        }
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

          const rawData = results.data as Record<string, unknown>[];
          const data: DataRow[] = [];
          const periodSet = new Set<string>();

          // Auto-detect wide format: if we have > 3 columns and no explicit "value" or "time" column headers
          const hasExplicitValueOrTime = columns.some(c => /value|gdp|amount|total|count|score|year|date|time|period/i.test(c));
          const isWideFormat = columns.length >= 4 && !hasExplicitValueOrTime;

          if (isWideFormat) {
            // Wide format: A=Name, B=Category, C=ImageUrl, D...=Periods
            const nameC = columns[0];
            const catC = columns[1];
            const imgC = columns[2];
            const timeCols = columns.slice(3); // from D column onwards

            for (const row of rawData) {
              if (row[nameC]) {
                for (const tCol of timeCols) {
                  if (row[tCol] !== undefined && row[tCol] !== null && row[tCol] !== '') {
                    const timeStr = String(tCol);
                    data.push({
                      name: String(row[nameC]),
                      value: Number(row[tCol]),
                      time: timeStr,
                      category: row[catC] ? String(row[catC]) : undefined,
                      imageUrl: row[imgC] ? String(row[imgC]) : undefined,
                    });
                    periodSet.add(timeStr);
                  }
                }
              }
            }
          } else {
            // Long format
            const { name: nameCol, value: valCol, time: timeCol, image: imageCol } = mapping || autoDetectMapping(columns);
            for (const row of rawData) {
              if (row[nameCol] && row[valCol] !== undefined && row[timeCol]) {
                const timeStr = String(row[timeCol]);
                data.push({
                  name: String(row[nameCol]),
                  value: Number(row[valCol]),
                  time: timeStr,
                  imageUrl: imageCol && row[imageCol] ? String(row[imageCol]) : undefined,
                });
                periodSet.add(timeStr);
              }
            }
          }

          const periods = Array.from(periodSet).sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
          });

          resolve({ data, periods, columns });
        }
      });
    });
  };

  return { parseCSV, parseHeaders };
}
