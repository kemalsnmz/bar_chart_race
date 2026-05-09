import { useCallback, useReducer } from 'react';
import { useLineChartStore } from '../store/lineChartStore';
import { palettes } from '../utils/colorPalettes';
import type { LineSpringBundle } from '../engine/motion/spring';

// ── Image cache (same pattern as bar chart) ──────────────────
const imageCache = new Map<string, HTMLImageElement | null>();

function loadImage(url: string, onLoad?: () => void) {
  if (!url || imageCache.has(url)) return;
  imageCache.set(url, null);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { imageCache.set(url, img); onLoad?.(); };
  img.onerror = () => { /* keep null — prevents retry loops */ };
  img.src = url;
}

function drawImageInBox(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  shape: 'circle' | 'rectangle'
) {
  ctx.save();
  ctx.beginPath();
  if (shape === 'circle') {
    const r = Math.min(w, h) / 2;
    ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
  } else {
    const r = Math.min(w, h) * 0.15;
    ctx.roundRect(x, y, w, h, r);
  }
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const sw = img.width * scale, sh = img.height * scale;
  ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
  ctx.restore();
}

// ── Easing ───────────────────────────────────────────────────
function applyEasing(t: number, mode: string): number {
  if (mode === 'ease-out')    return 1 - Math.pow(1 - t, 3);
  if (mode === 'ease-in-out') return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  return t;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1e12) return (v / 1e12).toFixed(1) + 'T';
  if (Math.abs(v) >= 1e9)  return (v / 1e9).toFixed(1) + 'B';
  if (Math.abs(v) >= 1e6)  return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3)  return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

// Catmull-Rom spline
function catmullRomPath(pts: {x:number,y:number}[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// ─────────────────────────────────────────────────────────────
export function useLineChartRenderer() {
  const store = useLineChartStore;
  const [imgVersion, bumpImgVersion] = useReducer((n: number) => n + 1, 0);

  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    periodIndex: number,
    t: number,
    lineSpring?: LineSpringBundle,
  ) => {
    const { data, periods, settings } = store.getState();
    if (periods.length === 0 || data.length === 0) return;

    const et = applyEasing(Math.max(0, Math.min(1, t)), settings.easing);

    const ml = settings.marginLeft;
    const mr = settings.marginRight;
    const mt = settings.marginTop;
    const mb = settings.marginBottom;
    const chartW = width - ml - mr;
    const chartH = height - mt - mb;

    // Background
    ctx.fillStyle = settings.backgroundColor || '#171F2F';
    ctx.fillRect(0, 0, width, height);

    // All entity names + per-entity image map
    const allNames = [...new Set(data.map(d => d.name))];
    const imageMap = new Map<string, string>();
    for (const name of allNames) {
      const row = data.find(d => d.name === name && d.imageUrl);
      if (row?.imageUrl) imageMap.set(name, row.imageUrl);
    }

    // Pre-load images
    if (settings.imageVisible) {
      for (const [, url] of imageMap) {
        loadImage(url, bumpImgVersion);
      }
    }

    // Series values aligned to periods
    const seriesMap = new Map<string, number[]>();
    for (const name of allNames) {
      seriesMap.set(name, periods.map(p => {
        const row = data.find(d => d.name === name && d.time === p);
        return row ? row.value : 0;
      }));
    }

    // Color map
    const palette = palettes[settings.palette] || palettes['vivid'];
    const colorMap = new Map<string, string>(
      allNames.map((name, i) => [name, palette[i % palette.length]])
    );

    // Current time index
    const currentTimeIdx = Math.min(periodIndex + et, periods.length - 1);
    const playMode = settings.playMode ?? 'reveal';

    // X window: zoomed mode shows a sliding window of periods
    const zoomedWindow = Math.max(2, settings.zoomedWindow ?? 5);
    const xStart = playMode === 'zoomed'
      ? Math.max(0, currentTimeIdx - zoomedWindow)
      : 0;
    const xEnd = playMode === 'reveal' || playMode === 'zoomed'
      ? currentTimeIdx
      : periods.length - 1;

    // Current values
    const currentValues = new Map<string, number>();
    for (const [name, values] of seriesMap) {
      const fi = Math.min(Math.floor(currentTimeIdx), values.length - 1);
      const ci = Math.min(fi + 1, values.length - 1);
      currentValues.set(name, lerp(values[fi], values[ci], currentTimeIdx - fi));
    }

    // Sort by current value → ranking
    const sorted = allNames
      .map(name => ({ name, value: currentValues.get(name) ?? 0 }))
      .sort((a, b) => b.value - a.value);

    const visible = sorted.slice(0, settings.maxVisibleSeries).map(s => s.name);

    // Y domain — use spring yMax when spring mode active
    let yMax: number;
    if (lineSpring) {
      yMax = lineSpring.yMax.pos;
    } else if (settings.dynamicYAxis || playMode === 'zoomed') {
      // For zoomed + all dynamic modes: only look at the visible x window
      const iStart = Math.floor(xStart);
      const iEnd   = Math.ceil(xEnd);
      yMax = Math.max(...visible.map(name => {
        const vals = seriesMap.get(name) ?? [];
        let m = -Infinity;
        for (let i = iStart; i <= iEnd && i < vals.length; i++) {
          if (vals[i] > m) m = vals[i];
        }
        return m;
      }));
      if (!isFinite(yMax) || yMax === 0) yMax = 1;
      yMax *= 1.1;
    } else {
      yMax = Math.max(...allNames.flatMap(name => seriesMap.get(name) ?? []));
      if (!isFinite(yMax) || yMax === 0) yMax = 1;
      yMax *= 1.1;
    }
    if (!isFinite(yMax) || yMax <= 0) yMax = 1;
    const yMin = 0;

    // X scale maps a period index into canvas X, relative to the visible window.
    // In reveal/zoomed modes the active endpoint stops at 80% of chartW,
    // leaving right space for endpoint labels. In 'all' mode full width is used.
    const xSpan = xEnd - xStart || 1;
    const xDrawFrac = playMode === 'all' ? 1.0 : 0.80;
    const xScale = (idx: number) => ml + ((idx - xStart) / xSpan) * chartW * xDrawFrac;
    const yScale = (v: number) => mt + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

    // ── Grid ─────────────────────────────────
    if (settings.showGrid) {
      const gridColor = settings.gridColor || '#ffffff';
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = settings.gridOpacity;
      ctx.lineWidth = 1;
      for (let i = 0; i <= settings.gridLines; i++) {
        const v = yMin + (yMax - yMin) * (i / settings.gridLines);
        const y = yScale(v);
        ctx.beginPath();
        ctx.moveTo(ml, y);
        ctx.lineTo(ml + chartW, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ── Y-axis labels ─────────────────────────
    if (settings.showYLabels) {
      ctx.fillStyle = settings.gridColor || '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.font = `${settings.axisFontSize * (width / 1920)}px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= settings.gridLines; i++) {
        const v = yMin + (yMax - yMin) * (i / settings.gridLines);
        ctx.fillText(formatValue(v), ml - 8, yScale(v));
      }
      ctx.globalAlpha = 1;
    }

    // ── X-axis labels ─────────────────────────
    if (settings.showXLabels && periods.length > 0) {
      ctx.fillStyle = settings.gridColor || '#ffffff';
      ctx.globalAlpha = 0.5;
      ctx.font = `${settings.axisFontSize * (width / 1920)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const visibleFrom = Math.floor(xStart);
      const visibleTo   = Math.ceil(xEnd);
      const windowSize  = visibleTo - visibleFrom + 1;
      const maxLabels   = Math.min(windowSize, 10);
      const step = Math.max(1, Math.floor((windowSize - 1) / (maxLabels - 1)));
      for (let i = visibleFrom; i <= visibleTo; i += step) {
        ctx.fillText(periods[i], xScale(i), mt + chartH + 8);
      }
      ctx.globalAlpha = 1;
    }

    // Highlight sets
    const leaderName = visible[0] ?? '';
    const top3Names  = new Set(visible.slice(0, 3));

    // ── Draw lines ───────────────────────────
    for (const name of visible) {
      const values = seriesMap.get(name) ?? [];
      const color  = colorMap.get(name) ?? '#fff';

      // Determine index range to draw
      const drawFrom = playMode === 'zoomed' ? Math.floor(xStart) : 0;
      const drawTo   = playMode === 'all'
        ? values.length - 1
        : Math.min(Math.floor(currentTimeIdx), values.length - 1);

      const pts: {x:number,y:number}[] = [];
      for (let i = drawFrom; i <= drawTo; i++) {
        pts.push({ x: xScale(i), y: yScale(values[i]) });
      }

      // Interpolated fractional endpoint (reveal + zoomed)
      if (playMode !== 'all' && currentTimeIdx > drawTo && drawTo < values.length - 1) {
        const frac = currentTimeIdx - drawTo;
        const lerpVal = lerp(values[drawTo], values[drawTo + 1], frac);
        const endY = lineSpring
          ? yScale(lineSpring.val.get(name)?.pos ?? lerpVal)
          : yScale(lerpVal);
        pts.push({ x: xScale(currentTimeIdx), y: endY });
      } else if (lineSpring && playMode !== 'all' && pts.length > 0) {
        const springVal = lineSpring.val.get(name)?.pos;
        if (springVal !== undefined) {
          pts[pts.length - 1] = { x: pts[pts.length - 1].x, y: yScale(springVal) };
        }
      }

      if (pts.length < 2) continue;

      const lineOpacity = 1;
      const lineW = settings.lineWidth * (width / 1920);

      ctx.globalAlpha = lineOpacity;

      // Area
      if (settings.showArea && pts.length >= 2) {
        const baseY = Math.min(yScale(0), mt + chartH);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, baseY);
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[pts.length - 1].x, baseY);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = lineOpacity * settings.areaOpacity;
        ctx.fill();
        ctx.globalAlpha = lineOpacity;
      }

      // Line
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';
      if (settings.smoothCurve && pts.length >= 3) {
        ctx.stroke(new Path2D(catmullRomPath(pts)));
      } else {
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }

      // ── Endpoint: image OR dot ──────────────
      // In 'all' mode the endpoint is always the last drawn point (full line), no moving tip
      const lastPt = pts[pts.length - 1];
      if (playMode === 'all') {
        // dim non-current series endpoints slightly to reduce clutter
      }
      const imgUrl  = imageMap.get(name);
      const cachedImg = imgUrl ? imageCache.get(imgUrl) : null;
      const imgSz = settings.imageSize * (width / 1920);

      if (settings.imageVisible && cachedImg) {
        // Draw image circle/rect at line end
        drawImageInBox(
          ctx, cachedImg,
          lastPt.x - imgSz / 2, lastPt.y - imgSz / 2, imgSz, imgSz,
          settings.imageShape
        );
        // Color ring border
        ctx.beginPath();
        if (settings.imageShape === 'circle') {
          ctx.arc(lastPt.x, lastPt.y, imgSz / 2 + 1.5, 0, Math.PI * 2);
        } else {
          const r = imgSz * 0.15;
          ctx.roundRect(lastPt.x - imgSz / 2 - 1.5, lastPt.y - imgSz / 2 - 1.5, imgSz + 3, imgSz + 3, r);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * (width / 1920);
        ctx.globalAlpha = lineOpacity;
        ctx.stroke();
      } else if (settings.showDots) {
        // Fallback dot when no image or image loading
        const dotR = settings.dotSize * (width / 1920);
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, dotR * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = lineOpacity * 0.8;
        ctx.fill();
        ctx.globalAlpha = lineOpacity;
      }
    }

    ctx.globalAlpha = 1;

    // ── Labels at end of lines ───────────────
    if (settings.showLabels) {
      const imgSz = settings.imageSize * (width / 1920);

      // Build label positions
      const labelData: { name: string; x: number; y: number; value: number; color: string; hasImg: boolean }[] = [];
      for (const name of visible) {
        const values = seriesMap.get(name) ?? [];
        const color  = colorMap.get(name) ?? '#fff';
        const fi = Math.min(Math.floor(currentTimeIdx), values.length - 1);
        const ci = Math.min(fi + 1, values.length - 1);
        const currentVal = lerp(values[fi], values[ci], currentTimeIdx - fi);
        const labelXIdx = playMode === 'all' ? periods.length - 1 : currentTimeIdx;
        const xEnd = xScale(labelXIdx);
        const yEnd = yScale(currentVal);
        const hasImg = settings.imageVisible && !!imageCache.get(imageMap.get(name) ?? '');
        labelData.push({ name, x: xEnd, y: yEnd, value: currentVal, color, hasImg });
      }

      // Sort by Y and deduplicate
      labelData.sort((a, b) => a.y - b.y);
      const fs = settings.labelFontSize * (width / 1920);
      const lineH = fs + (settings.showValues ? settings.valueFontSize * (width / 1920) + 4 : 0) + 6;
      for (let i = 1; i < labelData.length; i++) {
        if (labelData[i].y - labelData[i - 1].y < lineH) {
          labelData[i].y = labelData[i - 1].y + lineH;
        }
      }

      for (const ld of labelData) {
        const isLeader = settings.highlightMode === 'leader' && ld.name === leaderName;
        const inTop3   = settings.highlightMode === 'top3'   && top3Names.has(ld.name);
        const isMuted  = (settings.highlightMode === 'leader' && !isLeader) ||
                         (settings.highlightMode === 'top3'   && !inTop3);

        ctx.globalAlpha = isMuted ? settings.mutedOpacity : 1;

        // Offset from endpoint: account for image or dot radius
        const offsetX = ld.hasImg ? imgSz / 2 + 8 : settings.dotSize * (width / 1920) + 6;

        // Label text
        ctx.fillStyle = ld.color;
        ctx.font = `${isLeader ? 'bold ' : ''}${fs}px Inter, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(ld.name, ld.x + offsetX, ld.y);

        // Value text
        if (settings.showValues) {
          const vfs = settings.valueFontSize * (width / 1920);
          ctx.font = `${vfs}px Inter, sans-serif`;
          ctx.globalAlpha = (isMuted ? settings.mutedOpacity : 1) * 0.75;
          ctx.fillText(formatValue(ld.value), ld.x + offsetX, ld.y + fs + 2);
        }
      }

      ctx.globalAlpha = 1;
    }

    // ── Title ────────────────────────────────
    if (settings.titleVisible && settings.title) {
      const fs = settings.titleFontSize * (width / 1920);
      ctx.font = `${settings.titleBold ? 'bold ' : ''}${fs}px Inter, sans-serif`;
      ctx.fillStyle = settings.titleColor || '#ffffff';
      ctx.textBaseline = 'top';
      const pad = ml;
      if (settings.titleAlign === 'left') {
        ctx.textAlign = 'left';
        ctx.fillText(settings.title, pad, 24 * (height / 1080));
      } else if (settings.titleAlign === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(settings.title, width / 2, 24 * (height / 1080));
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(settings.title, width - pad, 24 * (height / 1080));
      }
    }

    // ── Time watermark ───────────────────────
    if (settings.timeVisible) {
      const periodLabel = periods[Math.min(periodIndex, periods.length - 1)] ?? '';
      const fs = settings.timeFontSize * (height / 1080) * 8;
      ctx.font = `${settings.timeBold ? 'bold ' : ''}${fs}px Inter, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = settings.timeOpacity;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(periodLabel, ml + chartW + settings.timeMarginX, mt + chartH + settings.timeMarginY);
      ctx.globalAlpha = 1;
    }

    // ── Watermark text ───────────────────────
    if (settings.watermarkText) {
      const fs = settings.watermarkFontSize * (width / 1920);
      ctx.font = `${fs}px Inter, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = settings.watermarkOpacity;
      const pad = 16 * (width / 1920);
      const [vPos, hPos] = settings.watermarkPosition.split('-');
      ctx.textBaseline = vPos === 'top' ? 'top' : 'bottom';
      ctx.textAlign    = hPos === 'left' ? 'left' : 'right';
      ctx.fillText(settings.watermarkText, hPos === 'left' ? pad : width - pad, vPos === 'top' ? pad : height - pad);
      ctx.globalAlpha = 1;
    }
  }, [store, bumpImgVersion]);

  return { drawFrame, imgVersion };
}
