import { create } from 'zustand';
import type { PaletteName } from '../utils/colorPalettes';

export interface LineDataRow {
  name: string;
  value: number;
  time: string;
  imageUrl?: string;
}

export interface LineChartSettings {
  title: string;
  titleVisible: boolean;
  titleColor: string;
  titleFontSize: number;
  titleBold: boolean;
  titleAlign: 'left' | 'center' | 'right';

  backgroundColor: string;
  palette: PaletteName;

  lineWidth: number;
  activeLineWidth: number;
  showDots: boolean;
  dotSize: number;
  showLabels: boolean;
  labelFontSize: number;
  showValues: boolean;
  valueFontSize: number;

  dynamicYAxis: boolean;
  showGrid: boolean;
  gridColor: string;
  gridOpacity: number;
  gridLines: number;
  showXLabels: boolean;
  showYLabels: boolean;
  axisFontSize: number;

  highlightMode: 'none' | 'leader' | 'top3';
  mutedOpacity: number;
  maxVisibleSeries: number;

  easing: 'linear' | 'ease-out' | 'ease-in-out';
  durationMs: number;
  springEnabled: boolean;
  springPreset: 'smooth' | 'cinematic' | 'energetic';
  playMode: 'all' | 'zoomed' | 'reveal';
  zoomedWindow: number; // zoomed modda gösterilen dönem sayısı

  timeVisible: boolean;
  timeFontSize: number;
  timeBold: boolean;
  timeOpacity: number;
  timeMarginX: number;
  timeMarginY: number;

  watermarkText: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number;
  watermarkFontSize: number;

  smoothCurve: boolean;
  showArea: boolean;
  areaOpacity: number;

  imageVisible: boolean;
  imageSize: number;
  imageShape: 'circle' | 'rectangle';

  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
}

export interface LinePlaybackState {
  currentPeriodIndex: number;
  isPlaying: boolean;
  speed: number;
  currentTimeInPeriod: number;
}

export interface LineExportSettings {
  resolution: '1080p' | '4k';
  fps: number;
  canvasRatio: '16:9' | '9:16' | '1:1';
}

interface LineChartStore {
  data: LineDataRow[];
  periods: string[];

  settings: LineChartSettings;
  playback: LinePlaybackState;
  exportSettings: LineExportSettings;

  isExporting: boolean;
  exportProgress: number;

  setData: (data: LineDataRow[], periods: string[]) => void;
  updateSettings: (s: Partial<LineChartSettings>) => void;
  updatePlayback: (p: Partial<LinePlaybackState>) => void;
  updateExportSettings: (s: Partial<LineExportSettings>) => void;
  setExporting: (isExporting: boolean, progress?: number) => void;
}

export const useLineChartStore = create<LineChartStore>((set) => ({
  data: [],
  periods: [],

  settings: {
    title: 'Line Chart Race',
    titleVisible: true,
    titleColor: '',
    titleFontSize: 40,
    titleBold: true,
    titleAlign: 'left',

    backgroundColor: '#171F2F',
    palette: 'vivid',

    lineWidth: 3,
    activeLineWidth: 4,
    showDots: true,
    dotSize: 7,
    showLabels: true,
    labelFontSize: 13,
    showValues: true,
    valueFontSize: 11,

    dynamicYAxis: true,
    showGrid: true,
    gridColor: '',
    gridOpacity: 0.15,
    gridLines: 5,
    showXLabels: true,
    showYLabels: true,
    axisFontSize: 11,

    highlightMode: 'leader',
    mutedOpacity: 0.3,
    maxVisibleSeries: 10,

    easing: 'linear',
    durationMs: 1500,
    springEnabled: false,
    springPreset: 'smooth',
    playMode: 'reveal',
    zoomedWindow: 5,

    timeVisible: true,
    timeFontSize: 12,
    timeBold: true,
    timeOpacity: 0.5,
    timeMarginX: 0,
    timeMarginY: 0,

    watermarkText: '',
    watermarkPosition: 'bottom-right',
    watermarkOpacity: 0.7,
    watermarkFontSize: 20,

    smoothCurve: true,
    showArea: false,
    areaOpacity: 0.15,

    imageVisible: true,
    imageSize: 28,
    imageShape: 'circle',

    marginTop: 80,
    marginRight: 120,
    marginBottom: 60,
    marginLeft: 70,
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

  setData: (data, periods) => set(() => ({ data, periods })),

  updateSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),

  updatePlayback: (p) => set((state) => ({ playback: { ...state.playback, ...p } })),

  updateExportSettings: (s) => set((state) => ({ exportSettings: { ...state.exportSettings, ...s } })),

  setExporting: (isExporting, progress = 0) => set(() => ({ isExporting, exportProgress: progress })),
}));
