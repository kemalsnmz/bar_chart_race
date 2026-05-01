import { create } from 'zustand';
import type { PaletteName } from '../utils/colorPalettes';

const IMAGE_CACHE_KEY = 'chart_image_cache';

function saveImageToCache(name: string, url: string) {
  try {
    const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    if (url) cache[name] = url;
    else delete cache[name];
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) { /* ignore */ }
}

function getImageFromCache(name: string): string | null {
  try {
    const cache = JSON.parse(localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    return cache[name] || null;
  } catch (e) {
    return null;
  }
}

export interface DataRow {
  name: string;
  value: number;
  time: string;
  category?: string;
  imageUrl?: string;
}

export type ColorMode = 'category' | 'bar' | 'single';
export type TextAlign = 'left' | 'center' | 'right';
export type ImageSizing = 'fill' | 'fit' | 'stretch';
export type ImageShape = 'rectangle' | 'circle';
export type BarEndShape = 'round' | 'flat' | 'arrow';
export type ImagePosition = 'left' | 'inside' | 'right';
export type LabelPosition = 'left' | 'inside' | 'right';
export type ChartLayout = 'horizontal' | 'vertical';

export interface TickerEntry {
  text: string;
  from: string;
  to: string;
}

export interface ChartSettings {
  title: string;
  titleVisible: boolean;
  titleColor: string;
  maxBars: number;
  durationMs: number;
  easing: 'linear' | 'ease-out' | 'ease-in-out' | 'spring';
  unit: string;
  palette: PaletteName;
  backgroundColor: string;
  colorMode: ColorMode;
  singleColorText: string;
  titleAlign: TextAlign;
  titleBold: boolean;
  titleFontSize: number;
  barOpacity: number;
  imageHeight: number;
  imageWidth: number;
  imageMarginRight: number;
  imageSizing: ImageSizing;
  imageShape: ImageShape;
  labelVisible: boolean;
  labelFontSize: number;
  labelBold: boolean;
  labelColor: string;
  labelPosition: LabelPosition;
  labelMargin: number;
  barEndShape: BarEndShape;
  imagePosition: ImagePosition;
  barThickness: number;
  barGap: number;
  totalVisible: boolean;
  totalOpacity: number;
  totalMarginX: number;
  totalMarginY: number;
  timeVisible: boolean;
  timeMonthVisible: boolean;
  timeMonthFormat: 'text' | 'number';
  timeAnimation: 'normal' | 'slide';
  timeMarginX: number;
  timeMarginY: number;
  timeFontSize: number;
  timeBold: boolean;
  timeOpacity: number;
  layout: ChartLayout;
  backgroundImageUrl: string;
  backgroundVideoUrl: string;
  backgroundOpacity: number;
  backgroundTint: number;
  backgroundMarginTop: number;
  backgroundMarginRight: number;
  backgroundMarginBottom: number;
  backgroundMarginLeft: number;
  watermarkText: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number;
  watermarkFontSize: number;
  tickerVisible: boolean;
  tickerEntries: TickerEntry[];
  tickerSpeed: number;
  tickerFontSize: number;
  tickerBgColor: string;
  tickerBgOpacity: number;
  tickerTextColor: string;
  tickerHeight: number;
  tickerMarginBottom: number;
  tickerMarginX: number;
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
  canvasRatio: '16:9' | '9:16' | '1:1';
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
    titleVisible: true,
    titleColor: '',
    maxBars: 10,
    durationMs: 2000,
    easing: 'linear',
    unit: '',
    palette: 'vivid',
    backgroundColor: '#ffffff',
    colorMode: 'bar',
    singleColorText: 'Apple: #6c63ff\nAmazon: #f7971e\nGoogle: #43e97b',
    titleAlign: 'left',
    titleBold: true,
    titleFontSize: 45,
    barOpacity: 1.0,
    imageHeight: 40,
    imageWidth: 40,
    imageMarginRight: 4,
    imageSizing: 'fill',
    imageShape: 'circle',
    labelVisible: true,
    labelFontSize: 60,
    labelBold: true,
    labelColor: '',
    labelPosition: 'left',
    labelMargin: 5,
    barEndShape: 'round',
    imagePosition: 'inside',
    barThickness: 80,
    barGap: 5,
    totalVisible: true,
    totalOpacity: 0.5,
    totalMarginX: 0,
    totalMarginY: 30,
    timeVisible: true,
    timeMonthVisible: false,
    timeMonthFormat: 'text',
    timeAnimation: 'normal',
    timeMarginX: 0,
    timeMarginY: 0,
    timeFontSize: 12,
    timeBold: true,
    timeOpacity: 0.5,
    layout: 'horizontal',
    backgroundImageUrl: '',
    backgroundVideoUrl: '',
    backgroundOpacity: 1,
    backgroundTint: 0,
    backgroundMarginTop: 0,
    backgroundMarginRight: 0,
    backgroundMarginBottom: 0,
    backgroundMarginLeft: 0,
    watermarkText: '',
    watermarkPosition: 'bottom-right',
    watermarkOpacity: 0.7,
    watermarkFontSize: 20,
    tickerVisible: false,
    tickerEntries: [{ text: '', from: '', to: '' }],
    tickerSpeed: 80,
    tickerFontSize: 14,
    tickerBgColor: '#ffffff',
    tickerBgOpacity: 1,
    tickerTextColor: '#000000',
    tickerHeight: 36,
    tickerMarginBottom: 0,
    tickerMarginX: 0,
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
    canvasRatio: '16:9',
  },

  isExporting: false,
  exportProgress: 0,

  pendingCSV: null,
  setPendingCSV: (p) => set(() => ({ pendingCSV: p })),

  setData: (data, periods) => set(() => {
    const enrichedData = data.map(row => ({
      ...row,
      imageUrl: row.imageUrl || getImageFromCache(row.name) || undefined
    }));
    return {
      data: enrichedData, 
      periods, 
      entityColors: new Map() // Reset colors on new data
    };
  }),

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

  updateImageUrl: (name, imageUrl) => set((state) => {
    saveImageToCache(name, imageUrl);
    return {
      data: state.data.map(row => row.name === name ? { ...row, imageUrl } : row),
    };
  }),

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
