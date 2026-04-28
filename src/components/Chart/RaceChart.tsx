import { useRef, useEffect } from 'react';
import { useChartStore } from '../../store/chartStore';
import { useChartRenderer } from '../../hooks/useChartRenderer';

function getCanvasSize(container: HTMLDivElement) {
  const rect = container.getBoundingClientRect();
  let w = rect.width;
  let h = w * (9 / 16);
  if (h > rect.height) { h = rect.height; w = h * (16 / 9); }
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

  const isPlaying = useChartStore((s) => s.playback.isPlaying);
  const currentPeriodIndex = useChartStore((s) => s.playback.currentPeriodIndex);
  const currentTimeInPeriod = useChartStore((s) => s.playback.currentTimeInPeriod);
  const isExporting = useChartStore((s) => s.isExporting);
  const periodsLen = useChartStore((s) => s.periods.length);
  const { drawFrame, imgVersion } = useChartRenderer();
  const drawFrameRef = useRef(drawFrame);
  drawFrameRef.current = drawFrame;

  // Resize observer — keeps canvas dimensions correct
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const { w, h } = getCanvasSize(container);
      sizeRef.current = { w, h };
      setupCanvas(canvas, w, h);
      // Redraw current frame after resize
      const { periods, playback } = useChartStore.getState();
      if (periods.length > 0) {
        const ctx = canvas.getContext('2d')!;
        drawFrameRef.current(ctx, w, h, playback.currentPeriodIndex, playback.currentTimeInPeriod);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Static draw — when paused/seeking, redraws on state changes
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
  }, [isPlaying, currentPeriodIndex, currentTimeInPeriod, imgVersion, periodsLen]);

  // Animation loop — canvas drawn directly in rAF, no React render on each frame
  useEffect(() => {
    if (!isPlaying) return;

    lastTimeRef.current = undefined;

    const loop = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { periods, settings, playback, updatePlayback } = useChartStore.getState();
      if (!playback.isPlaying) return;

      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = Math.min(time - lastTimeRef.current, 100); // cap delta to avoid jump on tab switch
      lastTimeRef.current = time;

      const msPerPeriod = settings.durationMs / playback.speed;
      let t = playback.currentTimeInPeriod + delta / msPerPeriod;
      let idx = playback.currentPeriodIndex;

      while (t >= 1 && idx < periods.length - 1) {
        t -= 1;
        idx += 1;
      }

      const { w, h } = sizeRef.current;
      if (w && h) {
        const ctx = canvas.getContext('2d')!;

        if (idx >= periods.length - 1 && t >= 1) {
          idx = 0;
          t = 0;
        }

        drawFrameRef.current(ctx, w, h, idx, t);
      }

      updatePlayback({ currentPeriodIndex: idx, currentTimeInPeriod: t });
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas ref={canvasRef} />
      {isExporting && (
        <div className="rec-indicator">
          <div className="rec-dot" />
          <span>REC</span>
        </div>
      )}
    </div>
  );
}
