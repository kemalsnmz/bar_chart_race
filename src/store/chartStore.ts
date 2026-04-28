import { create } from 'zustand';
import type { PaletteName } from '../utils/colorPalettes';

export interface DataRow {
  name: string;
  value: number;
  time: string;
  category?: string;
  imageUrl?: string;
}

export type ColorMode = 'category' | 'bar' | 'single';
export type TextAlign = 'left' | 'center' | 'right';

export interface ChartSettings {
  title: string;
  maxBars: number;
  durationMs: number;
  unit: string;
  palette: PaletteName;
  backgroundColor: string;
  colorMode: ColorMode;
  singleColorText: string;
  titleAlign: TextAlign;
  titleBold: boolean;
  titleFontSize: number;
}

export interface PlaybackState {
  currentPeriodIndex: number;
  isPlaying: boolean;
  speed: number;
  currentTimeInPeriod: number; // 0 to 1
}

export interface ExportSettings {
  resolution: '1080p' | '4k';
  fps: number;
}

interface ChartStore {
  data: DataRow[];
  periods: string[];
  entityColors: Map<string, string>;
  
  settings: ChartSettings;
  playback: PlaybackState;
  exportSettings: ExportSettings;

  isExporting: boolean;
  exportProgress: number;

  pendingCSV: { file: File | string; columns: string[] } | null;
  setPendingCSV: (p: { file: File | string; columns: string[] } | null) => void;

  setData: (data: DataRow[], periods: string[]) => void;
  updateSettings: (settings: Partial<ChartSettings>) => void;
  updatePlayback: (playback: Partial<PlaybackState>) => void;
  updateExportSettings: (settings: Partial<ExportSettings>) => void;
  setExporting: (isExporting: boolean, progress?: number) => void;
  updateValue: (name: string, time: string, value: number) => void;
  renameEntity: (oldName: string, newName: string) => void;
  renamePeriod: (oldTime: string, newTime: string) => void;
  updateCategory: (name: string, category: string) => void;
  updateImageUrl: (name: string, imageUrl: string) => void;
  addPeriod: (newTime: string, insertAfter?: string, insertBefore?: string) => void;
  removePeriod: (time: string) => void;
  addEntity: (name: string) => void;
  removeEntity: (name: string) => void;
}

export const useChartStore = create<ChartStore>((set) => ({
  data: [],
  periods: [],
  entityColors: new Map(),

  settings: {
    title: 'Bar Chart Race',
    maxBars: 10,
    durationMs: 1000,
    unit: '',
    palette: 'vivid',
    backgroundColor: '#0a0a0f',
    colorMode: 'bar',
    singleColorText: 'Apple: #6c63ff\nAmazon: #f7971e\nGoogle: #43e97b',
    titleAlign: 'left',
    titleBold: true,
    titleFontSize: 45,
  },

  playback: {
    currentPeriodIndex: 0,
    isPlaying: false,
    speed: 1,
    currentTimeInPeriod: 0,
  },

  exportSettings: {
    resolution: '1080p',
    fps: 30,
  },

  isExporting: false,
  exportProgress: 0,

  pendingCSV: null,
  setPendingCSV: (p) => set(() => ({ pendingCSV: p })),

  setData: (data, periods) => set((state) => ({
    data, 
    periods, 
    entityColors: new Map() // Reset colors on new data
  })),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  })),

  updatePlayback: (newPlayback) => set((state) => ({
    playback: { ...state.playback, ...newPlayback }
  })),

  updateExportSettings: (newSettings) => set((state) => ({
    exportSettings: { ...state.exportSettings, ...newSettings }
  })),

  setExporting: (isExporting, progress = 0) => set(() => ({
    isExporting,
    exportProgress: progress
  })),

  updateValue: (name, time, value) => set((state) => ({
    data: state.data.map(row =>
      row.name === name && row.time === time ? { ...row, value } : row
    )
  })),

  renameEntity: (oldName, newName) => set((state) => ({
    data: state.data.map(row =>
      row.name === oldName ? { ...row, name: newName } : row
    )
  })),

  renamePeriod: (oldTime, newTime) => set((state) => ({
    periods: state.periods.map(p => p === oldTime ? newTime : p),
    data: state.data.map(row => row.time === oldTime ? { ...row, time: newTime } : row),
  })),

  updateCategory: (name, category) => set((state) => ({
    data: state.data.map(row => row.name === name ? { ...row, category } : row),
  })),

  updateImageUrl: (name, imageUrl) => set((state) => ({
    data: state.data.map(row => row.name === name ? { ...row, imageUrl } : row),
  })),

  addPeriod: (newTime, insertAfter, insertBefore) => set((state) => {
    if (state.periods.includes(newTime)) return state;
    const periods = [...state.periods];
    if (insertAfter) {
      const idx = periods.indexOf(insertAfter);
      periods.splice(idx + 1, 0, newTime);
    } else if (insertBefore) {
      const idx = periods.indexOf(insertBefore);
      periods.splice(Math.max(0, idx), 0, newTime);
    } else {
      periods.push(newTime);
    }
    return { periods };
  }),

  removePeriod: (time) => set((state) => ({
    periods: state.periods.filter(p => p !== time),
    data: state.data.filter(row => row.time !== time),
  })),

  addEntity: (name) => set((state) => {
    if (state.data.find(d => d.name === name)) return state;
    const newRows = state.periods.map(time => ({ name, value: 0, time }));
    return { data: [...state.data, ...newRows] };
  }),

  removeEntity: (name) => set((state) => ({
    data: state.data.filter(d => d.name !== name),
  })),
}));
