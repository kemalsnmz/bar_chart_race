import { useEffect, useRef, useCallback, useState } from 'react';
import { useLineChartStore } from '../../store/lineChartStore';
import { useLineChartRenderer } from '../../hooks/useLineChartRenderer';
import { createLineSpringBundle, stepLineSprings, motionPresets } from '../../engine/motion/spring';
import type { LineSpringBundle } from '../../engine/motion/spring';

export function LineRaceChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lineSpringRef = useRef<LineSpringBundle>(createLineSpringBundle(0));
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { periods, playback, exportSettings, updatePlayback, settings } = useLineChartStore();
  const { drawFrame, imgVersion } = useLineChartRenderer();

  const ratio = exportSettings.canvasRatio;
  const getAspect = () => {
    if (ratio === '9:16') return 9 / 16;
    if (ratio === '1:1')  return 1;
    return 16 / 9;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { playback: pb } = useLineChartStore.getState();
    drawFrame(ctx, canvas.width, canvas.height, pb.currentPeriodIndex, pb.currentTimeInPeriod);
  }, [drawFrame]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const aspect = getAspect();
      let cw = w;
      let ch = w / aspect;
      if (ch > h) { ch = h; cw = h * aspect; }
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width  = `${Math.round(cw)}px`;
      canvas.style.height = `${Math.round(ch)}px`;
      render();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [ratio, render]);

  // Animation loop
  useEffect(() => {
    if (!playback.isPlaying || periods.length === 0) {
      cancelAnimationFrame(animFrameRef.current);
      render();
      return;
    }

    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) * playback.speed;
      lastTimeRef.current = timestamp;

      const { data: dt, playback: pb, periods: ps, settings: s, updatePlayback: up } = useLineChartStore.getState();
      if (!pb.isPlaying) return;

      const dtSec = delta / 1000;
      let t = pb.currentTimeInPeriod + delta / s.durationMs;
      let idx = pb.currentPeriodIndex;

      while (t >= 1 && idx < ps.length - 1) {
        t -= 1;
        idx++;
      }

      // Loop back to start when animation ends
      if (idx >= ps.length - 1 && t >= 1) {
        idx = 0;
        t = 0;
        if (s.springEnabled) {
          for (const st of lineSpringRef.current.val.values()) st.vel = 0;
          lineSpringRef.current.yMax.vel = 0;
        }
      }

      up({ currentPeriodIndex: idx, currentTimeInPeriod: t });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let activeSpring: LineSpringBundle | undefined;
      if (s.springEnabled) {
        // Build target values interpolated at current t
        const currentPeriod = ps[idx];
        const nextPeriod = ps[Math.min(idx + 1, ps.length - 1)];
        const targetValues = new Map<string, number>();
        const allNames = [...new Set(dt.map(d => d.name))];
        for (const name of allNames) {
          const cur = dt.find(d => d.name === name && d.time === currentPeriod)?.value ?? 0;
          const nxt = dt.find(d => d.name === name && d.time === nextPeriod)?.value ?? cur;
          targetValues.set(name, cur + (nxt - cur) * t);
        }
        const rawMax = Math.max(...[...targetValues.values()], 1) * 1.1;
        const cfg = motionPresets[s.springPreset ?? 'smooth'];
        stepLineSprings(lineSpringRef.current, targetValues, rawMax, dtSec, cfg);
        activeSpring = lineSpringRef.current;
      }

      drawFrame(ctx, canvas.width, canvas.height, idx, t, activeSpring);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playback.isPlaying, playback.speed, periods, drawFrame, render]);

  // Re-render when paused and settings change
  useEffect(() => {
    if (!playback.isPlaying) render();
  }, [settings, playback.currentPeriodIndex, playback.currentTimeInPeriod, imgVersion, render]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <button
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          background: 'rgba(0,0,0,0.3)',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          padding: '8px',
          cursor: 'pointer',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          transition: 'background 0.2s',
        }}
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
