import { useRef, useEffect, useState } from 'react';
import { useChartStore } from '../../store/chartStore';
import { useChartRenderer } from '../../hooks/useChartRenderer';
import { createBarSpringBundle, stepBarSprings, motionPresets } from '../../engine/motion/spring';
import type { SpringConfig } from '../../engine/motion/spring';
import type { BarSpringBundle } from '../../engine/motion/spring';

function getCanvasSize(container: HTMLDivElement, ratio: '16:9' | '9:16' | '1:1') {
  const rect = container.getBoundingClientRect();
  const [rw, rh] = ratio === '16:9' ? [16, 9] : ratio === '9:16' ? [9, 16] : [1, 1];
  let w = rect.width;
  let h = w * (rh / rw);
  if (h > rect.height) { h = rect.height; w = h * (rw / rh); }
  return { w, h };
}

function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
}

export function RaceChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);
  const sizeRef = useRef({ w: 0, h: 0 });
  const springRef = useRef<BarSpringBundle>(createBarSpringBundle());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isPlaying = useChartStore((s) => s.playback.isPlaying);
  const currentPeriodIndex = useChartStore((s) => s.playback.currentPeriodIndex);
  const currentTimeInPeriod = useChartStore((s) => s.playback.currentTimeInPeriod);
  const isExporting = useChartStore((s) => s.isExporting);
  const periodsLen = useChartStore((s) => s.periods.length);
  const settings = useChartStore((s) => s.settings);
  const canvasRatio = useChartStore((s) => s.exportSettings.canvasRatio);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const { w, h } = getCanvasSize(container, canvasRatio);
    sizeRef.current = { w, h };
    setupCanvas(canvas, w, h);
    const { periods, playback } = useChartStore.getState();
    if (periods.length > 0) {
      const ctx = canvas.getContext('2d')!;
      drawFrameRef.current(ctx, w, h, playback.currentPeriodIndex, playback.currentTimeInPeriod);
    }
  }, [canvasRatio]);

  const { drawFrame, imgVersion } = useChartRenderer();
  const drawFrameRef = useRef(drawFrame);
  drawFrameRef.current = drawFrame;

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const observer = new ResizeObserver(() => {
      const ratio = useChartStore.getState().exportSettings.canvasRatio;
      const { w, h } = getCanvasSize(container, ratio);
      sizeRef.current = { w, h };
      setupCanvas(canvas, w, h);
      const { periods, playback } = useChartStore.getState();
      if (periods.length > 0) {
        const ctx = canvas.getContext('2d')!;
        drawFrameRef.current(ctx, w, h, playback.currentPeriodIndex, playback.currentTimeInPeriod);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;
    const ctx = canvas.getContext('2d')!;
    const { periods } = useChartStore.getState();
    if (periods.length > 0) {
      drawFrameRef.current(ctx, w, h, currentPeriodIndex, currentTimeInPeriod);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.font = '500 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Upload data to see chart preview', w / 2, h / 2);
    }
  }, [isPlaying, currentPeriodIndex, currentTimeInPeriod, imgVersion, periodsLen, settings]);

  useEffect(() => {
    if (!isPlaying) return;
    lastTimeRef.current = undefined;

    const loop = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { data, periods, settings, playback, updatePlayback } = useChartStore.getState();
      if (!playback.isPlaying) return;

      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = Math.min(time - lastTimeRef.current, 100);
      lastTimeRef.current = time;

      const msPerPeriod = settings.durationMs / playback.speed;
      let t = playback.currentTimeInPeriod + delta / msPerPeriod;
      let idx = playback.currentPeriodIndex;

      while (t >= 1 && idx < periods.length - 1) { t -= 1; idx += 1; }

      if (idx >= periods.length - 1 && t >= 1) {
        idx = 0; t = 0;
        if (settings.springEnabled) {
          springRef.current.val.forEach((s) => { s.vel = 0; });
          springRef.current.rank.forEach((s) => { s.vel = 0; });
        }
      }

      const { w, h } = sizeRef.current;
      if (w && h) {
        const ctx = canvas.getContext('2d')!;
        let activeSpring: BarSpringBundle | undefined;
        if (settings.springEnabled) {
          const currentPeriod = periods[idx];
          const targetValues = new Map(
            data.filter(d => d.time === currentPeriod).map(d => [d.name, d.value])
          );
          const preset = (settings.springPreset as keyof typeof motionPresets) in motionPresets
            ? (settings.springPreset as keyof typeof motionPresets)
            : 'cinematic';
          const baseCfg = motionPresets[preset];
          // Ultra-soft value springs (bar width) for very gentle transitions
          const valueCfg = { ...baseCfg, stiffness: baseCfg.stiffness * 0.05, damping: baseCfg.damping * 3.0 };
          // Ultra-soft rank springs (vertical order) to delay rank changes further
          const rankCfg: SpringConfig = { stiffness: baseCfg.stiffness * 0.002, damping: baseCfg.damping * 5.0, mass: baseCfg.mass };
          stepBarSprings(springRef.current, targetValues, delta / 1000, valueCfg, rankCfg);
          activeSpring = springRef.current;
          activeSpring = springRef.current;
        }
        drawFrameRef.current(ctx, w, h, idx, t, delta, activeSpring);
      }

      updatePlayback({ currentPeriodIndex: idx, currentTimeInPeriod: t });
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', backgroundColor: isFullscreen ? (settings.backgroundColor || '#ffffff') : '#f0f2f5' }}>
      <canvas ref={canvasRef} style={{ boxShadow: isFullscreen ? 'none' : '0 8px 24px rgba(0,0,0,0.08)', maxWidth: '100%', maxHeight: '100%' }} />
      {isExporting && (
        <div className="rec-indicator">
          <div className="rec-dot" />
          <span>REC</span>
        </div>
      )}
      <button
        onClick={toggleFullscreen}
        style={{ position: 'absolute', bottom: 16, right: 16, background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', borderRadius: 6, padding: '8px', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        )}
      </button>
    </div>
  );
}
