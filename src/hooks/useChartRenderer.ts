import { useCallback, useReducer } from 'react';
import * as d3 from 'd3';
import { useChartStore } from '../store/chartStore';
import { interpolate } from '../utils/interpolate';
import { buildBarColors, buildCategoryColors, parseSingleColorText } from '../utils/colorPalettes';
import { formatValue } from '../utils/formatValue';
import type { ValueFormat } from '../utils/formatValue';
import type { VideoEntry } from '../store/chartStore';
import type { BarSpringBundle } from '../engine/motion/spring';

const imageCache = new Map<string, HTMLImageElement | null>();


let bgVideoEl: HTMLVideoElement | null = null;
let bgVideoSrc = '';

const clipVideoCache = new Map<string, HTMLVideoElement>();

function getClipVideo(url: string): HTMLVideoElement {
  if (!clipVideoCache.has(url)) {
    const v = document.createElement('video');
    v.src = url;
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {});
    clipVideoCache.set(url, v);
  }
  return clipVideoCache.get(url)!;
}

function formatGridTick(value: number): string {
  if (value >= 1e12) { const v = value / 1e12; return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'T'; }
  if (value >= 1e9)  { const v = value / 1e9;  return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'B'; }
  if (value >= 1e6)  { const v = value / 1e6;  return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'M'; }
  if (value >= 1e3)  { const v = value / 1e3;  return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + 'K'; }
  return String(Math.round(value));
}

function clipFadeAlpha(
  curIdx: number,
  fi: number,
  ti: number,
  t: number
): number {
  const [rs, re] = fi <= ti ? [fi, ti] : [ti, fi];
  if (rs === re) {
    if (t < 0.2) return t / 0.2;
    if (t > 0.8) return (1 - t) / 0.2;
    return 1;
  }
  if (curIdx === rs) return t < 0.2 ? t / 0.2 : 1;
  if (curIdx === re) return t > 0.8 ? (1 - t) / 0.2 : 1;
  return 1;
}

function getBgVideo(url: string): HTMLVideoElement {
  if (bgVideoSrc !== url) {
    bgVideoSrc = url;
    bgVideoEl = document.createElement('video');
    bgVideoEl.src = url;
    bgVideoEl.loop = true;
    bgVideoEl.muted = true;
    bgVideoEl.playsInline = true;
    bgVideoEl.play().catch(() => {});
  }
  return bgVideoEl!;
}

function loadImage(url: string, onLoad?: () => void) {
  if (imageCache.has(url)) return; // already loading or loaded
  imageCache.set(url, null);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { imageCache.set(url, img); onLoad?.(); };
  img.onerror = () => { /* keep null in cache — prevents retry loops */ };
  img.src = url;
}

function drawImageInBox(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  sizing: 'fill' | 'fit' | 'stretch',
  shape: 'rectangle' | 'circle'
) {
  ctx.save();
  ctx.beginPath();
  if (shape === 'circle') {
    const r = Math.min(w, h) / 2;
    ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();

  if (sizing === 'stretch') {
    ctx.drawImage(img, x, y, w, h);
  } else if (sizing === 'fill') {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = img.width * scale, sh = img.height * scale;
    ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
  } else {
    const scale = Math.min(w / img.width, h / img.height);
    const sw = img.width * scale, sh = img.height * scale;
    ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
  }
  ctx.restore();
}

function bounceOut(t: number): number {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1)       return n1 * t * t;
  if (t < 2 / d1)       return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1)     return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'ease-out':    return 1 - Math.pow(1 - t, 3);
    case 'ease-in-out': return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'sine-in-out': return 0.5 * (1 - Math.cos(Math.PI * t));
    case 'spring': {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case 'bounce':   return bounceOut(t);
    case 'elastic': {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    }
    default: return t;
  }
}

function getTextColor(hex: string): string {
  const c = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function useChartRenderer() {
  const { data, periods, settings } = useChartStore();
  const [imgVersion, bumpImgVersion] = useReducer((n: number) => n + 1, 0);

  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    physicalWidth: number,
    physicalHeight: number,
    periodIndex: number,
    t: number,
    _deltaMs: number = 0,
    springStates?: BarSpringBundle,
  ) => {
    const isVertical = settings.layout === 'vertical';

    ctx.fillStyle = settings.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, physicalWidth, physicalHeight);

    // Find active background entry for current period
    const bgCurIdx = periods.indexOf(periods[periodIndex] ?? '');
    const activeBgEntry = (settings.backgroundEntries ?? []).find(e => {
      const fi = periods.indexOf(e.from);
      const ti = periods.indexOf(e.to);
      if (fi === -1 || ti === -1) return false;
      const [s, en] = fi <= ti ? [fi, ti] : [ti, fi];
      return bgCurIdx >= s && bgCurIdx <= en;
    });

    const mTop   = (activeBgEntry?.marginTop    ?? settings.backgroundMarginTop    ?? 0);
    const mRight = (activeBgEntry?.marginRight   ?? settings.backgroundMarginRight  ?? 0);
    const mBot   = (activeBgEntry?.marginBottom  ?? settings.backgroundMarginBottom ?? 0);
    const mLeft  = (activeBgEntry?.marginLeft    ?? settings.backgroundMarginLeft   ?? 0);
    const bgOpacity = activeBgEntry?.opacity ?? settings.backgroundOpacity ?? 1;
    const bgTint    = activeBgEntry?.tint    ?? settings.backgroundTint    ?? 0;
    const bx = mLeft, by = mTop;
    const bw = physicalWidth - mLeft - mRight;
    const bh = physicalHeight - mTop - mBot;

    const activeImageUrl = activeBgEntry?.imageUrl || settings.backgroundImageUrl;
    const activeVideoUrl = activeBgEntry ? '' : settings.backgroundVideoUrl;

    if (activeVideoUrl && bw > 0 && bh > 0) {
      const video = getBgVideo(activeVideoUrl);
      if (video.readyState >= 2) {
        ctx.globalAlpha = bgOpacity;
        ctx.drawImage(video, bx, by, bw, bh);
        ctx.globalAlpha = 1;
      }
    } else if (activeImageUrl) {
      loadImage(activeImageUrl, bumpImgVersion);
      const bgImg = imageCache.get(activeImageUrl);
      if (bgImg && bw > 0 && bh > 0) {
        ctx.globalAlpha = bgOpacity;
        drawImageInBox(ctx, bgImg, bx, by, bw, bh, 'fill', 'rectangle');
        ctx.globalAlpha = 1;
      }
    }

    if (bgTint > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${bgTint})`;
      ctx.fillRect(0, 0, physicalWidth, physicalHeight);
    }

    if (periods.length === 0 || data.length === 0) return;

    const textColor = getTextColor(settings.backgroundColor || '#ffffff');
    const labelColor = settings.labelColor || textColor;

    // Preload images
    const imageUrlMap = new Map<string, string>();
    for (const row of data) {
      if (row.imageUrl && !imageUrlMap.has(row.name)) {
        imageUrlMap.set(row.name, row.imageUrl);
        loadImage(row.imageUrl, bumpImgVersion);
      }
    }

    // Build color map based on colorMode
    const allNames = [...new Set(data.map(d => d.name))];
    let colorMap: Map<string, string>;

    if (settings.colorMode === 'single') {
      const custom = parseSingleColorText(settings.singleColorText);
      colorMap = buildBarColors(allNames, settings.palette);
      for (const [name, color] of custom) colorMap.set(name, color);
    } else if (settings.colorMode === 'category') {
      const catMap = new Map<string, string>();
      for (const row of data) {
        if (!catMap.has(row.name)) catMap.set(row.name, row.category ?? row.name);
      }
      colorMap = buildCategoryColors(catMap, settings.palette);
    } else {
      colorMap = buildBarColors(allNames, settings.palette);
    }

    const currentPeriod = periods[periodIndex];
    const prevPeriod = periodIndex > 0 ? periods[periodIndex - 1] : currentPeriod;

    const et = applyEasing(t, settings.easing ?? 'ease-out');

    const prevDataMap = new Map(data.filter(d => d.time === prevPeriod).map(d => [d.name, d.value]));
    const currDataMap = new Map(data.filter(d => d.time === currentPeriod).map(d => [d.name, d.value]));
    const allEntities = new Set([...prevDataMap.keys(), ...currDataMap.keys()]);

    const interpolatedData: { name: string; value: number }[] = [];

    if (springStates) {
      // Spring mode: use spring positions directly
      for (const [name, state] of springStates.val) {
        interpolatedData.push({ name, value: state.pos });
      }
    } else {
      for (const name of allEntities) {
        const val = interpolate(prevDataMap.get(name) ?? 0, currDataMap.get(name) ?? 0, et);
        interpolatedData.push({ name, value: val });
      }
    }

    interpolatedData.sort((a, b) => b.value - a.value);
    const topData = interpolatedData.slice(0, settings.maxBars);

    const fullPrev = allNames.map(name => ({ name, value: prevDataMap.get(name) ?? 0 })).sort((a, b) => b.value - a.value);
    const fullCurr = allNames.map(name => ({ name, value: currDataMap.get(name) ?? 0 })).sort((a, b) => b.value - a.value);
    const prevRankMap = new Map(fullPrev.map((d, i) => [d.name, i]));
    const currRankMap = new Map(fullCurr.map((d, i) => [d.name, i]));

    const vfmt = (settings.valueFormat ?? 'short') as ValueFormat;

    let margin: { top: number; right: number; bottom: number; left: number };
    if (isVertical) {
      margin = {
        top: settings.titleVisible ? physicalHeight * 0.15 : physicalHeight * 0.05,
        right: physicalWidth * 0.05,
        bottom: physicalHeight * 0.15,
        left: physicalWidth * 0.05
      };
    } else {
      const isPortrait = physicalWidth < physicalHeight;
      const topPct = isPortrait ? 0.12 : 0.10;
      const approxTop = settings.titleVisible ? physicalHeight * topPct : physicalHeight * 0.03;
      const approxBot = isPortrait ? physicalHeight * 0.14 : physicalHeight * 0.04;
      const approxChartH = physicalHeight - approxTop - approxBot;
      const totalPartsEst = settings.barThickness + settings.barGap;
      const approxBarH = (approxChartH / settings.maxBars) * (settings.barThickness / totalPartsEst);
      const approxNameSize = settings.labelVisible
        ? Math.round(approxBarH * (settings.labelFontSize / 100))
        : 0;

      // Measure label width to set left margin
      let neededLeft = physicalWidth * 0.03; // minimal padding when no label on left
      if (settings.labelVisible && settings.labelPosition === 'left' && approxNameSize > 0) {
        const minLeft = physicalWidth * (isPortrait ? 0.22 : 0.14);
        ctx.font = (settings.labelBold ? '700 ' : '400 ') + approxNameSize + 'px Inter, sans-serif';
        const maxLW = Math.max(...allNames.map(n => ctx.measureText(n).width));
        const imgExtra = settings.imagePosition === 'left' ? settings.imageWidth + (settings.imageMarginRight || 10) : 0;
        neededLeft = Math.max(minLeft, maxLW + (settings.labelMargin ?? 15) + imgExtra + 12);
      }

      // Measure value width to set right margin (use fixed valueSize, not labelFontSize)
      const approxValueSize = Math.round(approxBarH * ((settings.valueFontSize ?? 55) / 100));
      const maxDataVal = Math.max(...Array.from(currDataMap.values()), 1);
      const sampleValStr = formatValue(maxDataVal, vfmt) + (settings.unit ? ' ' + settings.unit : '');
      ctx.font = '700 ' + (approxValueSize || 14) + 'px Inter, sans-serif';
      const valW = ctx.measureText(sampleValStr).width;
      const imgRightExtra = settings.imagePosition === 'right' ? (settings.imageWidth + (settings.imageMarginRight || 10) * 2) : 0;
      const neededRight = Math.max(physicalWidth * (isPortrait ? 0.16 : 0.14), valW + imgRightExtra + 16);

      margin = {
        top: approxTop,
        right: neededRight,
        bottom: approxBot,
        left: neededLeft,
      };
    }

    const chartWidth = physicalWidth - margin.left - margin.right;
    const chartHeight = physicalHeight - margin.top - margin.bottom;
    const maxVal = Math.max(...topData.map(d => d.value), 1);
    
    const minLength = settings.minBarLength ?? 80;
    const scaleFactor = (settings.barLengthScale ?? 100) / 100;
    const maxScaleWidth = Math.max(minLength, chartWidth * scaleFactor);
    const maxScaleHeight = Math.max(minLength, chartHeight * scaleFactor);
    
    let xScale = d3.scaleLinear().domain([0, maxVal]).range([minLength, maxScaleWidth]);
    let yScale = d3.scaleLinear().domain([0, maxVal]).range([minLength, maxScaleHeight]);

    const totalParts = settings.barThickness + settings.barGap;
    const slotSize = isVertical ? (chartWidth / settings.maxBars) : (chartHeight / settings.maxBars);
    const barThicknessPx = slotSize * (settings.barThickness / totalParts);
    const barPaddingPx = slotSize * (settings.barGap / totalParts);

    // Title
    if (settings.titleVisible) {
      const titleSize = Math.round(physicalHeight * (settings.titleFontSize / 1000));
      const titleWeight = settings.titleBold ? 'bold' : '400';
      ctx.font = titleWeight + ' ' + titleSize + 'px Inter, sans-serif';
      ctx.textBaseline = 'top';
      const titleY = physicalHeight * 0.04;

      // Animation: fade or typewriter on first period
      const titleAnim = settings.titleAnimation ?? 'none';
      const animProgress = periodIndex === 0 ? Math.min(1, t * 2) : 1; // completes in first half of period 0
      let titleAlpha = 1;
      let displayTitle = settings.title;

      if (titleAnim === 'fade') {
        titleAlpha = animProgress;
      } else if (titleAnim === 'typewriter') {
        const chars = Math.round(animProgress * settings.title.length);
        displayTitle = settings.title.slice(0, chars);
      }

      ctx.save();
      ctx.globalAlpha = titleAlpha;
      ctx.fillStyle = settings.titleColor || textColor;

      if (settings.titleAlign === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(displayTitle, physicalWidth / 2, titleY);
      } else if (settings.titleAlign === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(displayTitle, physicalWidth * 0.95, titleY);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(displayTitle, physicalWidth * 0.05, titleY);
      }
      ctx.restore();
    }

    // Period watermark
    if (settings.timeVisible !== false) {
      ctx.fillStyle = textColor;
      const fontSizePx = Math.round(Math.min(physicalWidth, physicalHeight) * ((settings.timeFontSize ?? 22) / 100));
      const fontWeight = settings.timeBold !== false ? 'bold' : 'normal';
      ctx.font = `${fontWeight} ${fontSizePx}px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = isVertical ? 'top' : 'bottom';
      
      const baseX = physicalWidth * 0.95 - (settings.timeMarginX ?? 0);
      let baseY = isVertical
        ? physicalHeight * 0.05
        : physicalHeight - margin.bottom * 0.18;
      baseY += (settings.timeMarginY ?? 0);
      
      const baseOpacity = settings.timeOpacity ?? 0.5;
      const drawWatermarkText = (text: string, xOffset: number, yOffset: number, alphaMultiplier: number) => {
        ctx.save();
        ctx.globalAlpha = baseOpacity * alphaMultiplier;
        ctx.fillText(text, baseX + xOffset, baseY + yOffset);
        ctx.restore();
      };

      let fraction = t;
      
      if (settings.timeMonthVisible) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = Math.min(11, Math.floor(t * 12));
        const formatMonth = (mIdx: number) => settings.timeMonthFormat === 'text' ? months[mIdx] : (mIdx + 1).toString().padStart(2, '0');
        
        let currentMonth = formatMonth(monthIndex);
        let nextMonth = monthIndex === 11 ? formatMonth(0) : formatMonth(monthIndex + 1);
        
        let currentYear = currentPeriod;
        let nextYear = monthIndex === 11 ? (periods[periodIndex + 1] ?? currentPeriod) : currentPeriod;

        const yearWidth = ctx.measureText(' ' + currentYear).width;
        fraction = (t * 12) % 1;

        if (settings.timeAnimation === 'slide') {
          const slideDistance = fontSizePx;
          if (fraction < 0.8) {
            drawWatermarkText(currentYear, 0, 0, 1);
            drawWatermarkText(currentMonth, -yearWidth, 0, 1);
          } else {
            const animT = (fraction - 0.8) / 0.2;
            
            // Year: Fade transition without sliding
            if (currentYear !== nextYear) {
               drawWatermarkText(currentYear, 0, 0, 1 - animT);
               drawWatermarkText(nextYear, 0, 0, animT);
            } else {
               drawWatermarkText(currentYear, 0, 0, 1);
            }
            
            // Month: Slide transition
            drawWatermarkText(currentMonth, -yearWidth, -slideDistance * animT, 1 - animT);
            const nextYearWidth = ctx.measureText(' ' + nextYear).width;
            drawWatermarkText(nextMonth, -nextYearWidth, slideDistance * (1 - animT), animT);
          }
        } else {
          drawWatermarkText(currentYear, 0, 0, 1);
          drawWatermarkText(currentMonth, -yearWidth, 0, 1);
        }
      } else {
        // No months visible
        let currentText = currentPeriod;
        let nextText = periods[periodIndex + 1] ?? currentPeriod;
        if (settings.timeAnimation === 'slide') {
          const slideDistance = fontSizePx;
          if (fraction < 0.8) {
            drawWatermarkText(currentText, 0, 0, 1);
          } else {
            const animT = (fraction - 0.8) / 0.2;
            drawWatermarkText(currentText, 0, -slideDistance * animT, 1 - animT);
            drawWatermarkText(nextText, 0, slideDistance * (1 - animT), animT);
          }
        } else {
          drawWatermarkText(currentText, 0, 0, 1);
        }
      }
    }

    // Total Counter
    if (settings.totalVisible !== false) {
      const totalVal = interpolatedData.reduce((acc, d) => acc + Math.max(0, d.value), 0);
      
      ctx.save();
      ctx.globalAlpha = settings.totalOpacity ?? 0.5;
      ctx.fillStyle = textColor;
      ctx.font = 'bold ' + Math.round(physicalHeight * 0.06) + 'px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = isVertical ? 'top' : 'bottom';
      let totalX = physicalWidth * 0.95 - (settings.totalMarginX ?? 0);
      let totalY: number;
      if (isVertical) {
        totalY = (settings.timeVisible !== false) ? physicalHeight * 0.28 : physicalHeight * 0.05;
      } else {
        // Position total inside bottom margin, above the time watermark
        const hasTime = settings.timeVisible !== false;
        totalY = hasTime
          ? physicalHeight - margin.bottom * 0.60
          : physicalHeight - margin.bottom * 0.18;
      }
      totalY += (settings.totalMarginY ?? 0);
      ctx.fillText(`Total: ${formatValue(totalVal, vfmt)} ${settings.unit}`, totalX, totalY);
      ctx.restore();
    }

    // Watermark
    if (settings.watermarkText) {
      const wSize = Math.round(physicalHeight * (settings.watermarkFontSize / 1000));
      ctx.font = `700 ${wSize}px Inter, sans-serif`;
      ctx.globalAlpha = settings.watermarkOpacity;
      ctx.fillStyle = textColor;
      const pad = wSize * 0.8;
      const pos = settings.watermarkPosition;
      ctx.textBaseline = pos.startsWith('top') ? 'top' : 'bottom';
      ctx.textAlign   = pos.endsWith('right') ? 'right' : 'left';
      const wx = pos.endsWith('right') ? physicalWidth - pad : pad;
      const wy = pos.startsWith('top')  ? pad : physicalHeight - pad;
      ctx.fillText(settings.watermarkText, wx, wy);
      ctx.globalAlpha = 1;
    }

    // Ticker — framed box, right side, just above total counter
    if (settings.tickerVisible) {
      const curIdx = periods.indexOf(currentPeriod);
      const activeEntry = (settings.tickerEntries ?? []).find(e => {
        const fi = periods.indexOf(e.from);
        const ti = periods.indexOf(e.to);
        if (fi === -1 || ti === -1) return false;
        const [s, en] = fi <= ti ? [fi, ti] : [ti, fi];
        return curIdx >= s && curIdx <= en;
      });
      const text = activeEntry?.text ?? '';
      if (text) {
        // Fade only at range boundaries; middle periods are fully visible
        let fadeAlpha = 1;
        if (activeEntry) {
          const fi = periods.indexOf(activeEntry.from);
          const ti = periods.indexOf(activeEntry.to);
          const [rs, re] = fi <= ti ? [fi, ti] : [ti, fi];
          if (rs === re) {
            if (t < 0.2) fadeAlpha = t / 0.2;
            else if (t > 0.8) fadeAlpha = (1 - t) / 0.2;
          } else if (curIdx === rs) {
            fadeAlpha = t < 0.2 ? t / 0.2 : 1;
          } else if (curIdx === re) {
            fadeAlpha = t > 0.8 ? (1 - t) / 0.2 : 1;
          }
        }

        const mb = (activeEntry?.marginY ?? 0) + (settings.tickerMarginBottom ?? 0);
        const mx = (activeEntry?.marginX ?? 0) + (settings.tickerMarginX ?? 0);
        const fontSize = Math.round(physicalHeight * (settings.tickerFontSize / 220));
        const padX = fontSize * 0.9;
        const padY = fontSize * 0.6;
        const lineHeight = fontSize * 1.4;

        // Fixed box width — same as tickerHeight-based column, capped at 45% canvas
        const boxW = Math.min(physicalWidth * 0.45 - mx * 2, physicalWidth * 0.45);
        const innerW = boxW - padX * 2;

        ctx.font = `600 ${fontSize}px Inter, sans-serif`;

        // Word-wrap text into lines that fit innerW
        const words = text.split(' ');
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
          const test = current ? current + ' ' + word : word;
          if (ctx.measureText(test).width <= innerW) {
            current = test;
          } else {
            if (current) lines.push(current);
            current = word;
          }
        }
        if (current) lines.push(current);

        const boxH = lines.length * lineHeight + padY * 2;


        // Total counter Y anchor (must match the main total draw above)
        const hasTime2 = settings.timeVisible !== false;
        const totalY = isVertical
          ? (hasTime2 ? physicalHeight * 0.28 : physicalHeight * 0.05)
          : (hasTime2
              ? physicalHeight - margin.bottom * 0.60
              : physicalHeight - margin.bottom * 0.18);

        const boxX = physicalWidth * 0.95 - boxW - mx;
        const boxY = totalY - boxH - 10 - mb; // grows upward

        ctx.save();

        // Text lines — word-by-word coloring (no background/border)
        ctx.globalAlpha = fadeAlpha;
        ctx.textBaseline = 'middle';
        const wordColors = activeEntry?.wordColors ?? {};
        const spaceW = ctx.measureText(' ').width;
        lines.forEach((line, li) => {
          const lineY = boxY + padY + li * lineHeight + lineHeight / 2;
          const words = line.split(' ');
          const lineW = words.reduce((acc, w) => acc + ctx.measureText(w).width, 0) + spaceW * (words.length - 1);
          let wx = boxX + (boxW - lineW) / 2;
          for (const word of words) {
            ctx.fillStyle = wordColors[word] || settings.tickerTextColor;
            ctx.textAlign = 'left';
            ctx.fillText(word, wx, lineY);
            wx += ctx.measureText(word).width + spaceW;
          }
        });

        ctx.restore();
      }
    }

    // Grid Lines (horizontal layout only)
    if (settings.gridVisible !== false && !isVertical) {
      const ticks = xScale.ticks(5).filter((v: number) => v > 0);
      const gridOpacity = settings.gridOpacity ?? 0.12;

      ctx.save();
      ctx.strokeStyle = settings.gridColor || textColor;
      ctx.lineWidth = Math.max(1, physicalWidth / 960);
      ctx.globalAlpha = gridOpacity;

      for (const tick of ticks) {
        const tx = margin.left + xScale(tick);
        ctx.beginPath();
        ctx.moveTo(tx, margin.top);
        ctx.lineTo(tx, physicalHeight - margin.bottom);
        ctx.stroke();
      }

      if (settings.gridLabelVisible !== false) {
        const labelSize2 = Math.round(physicalHeight * 0.020);
        ctx.font = `700 ${labelSize2}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const labelY = physicalHeight - margin.bottom - 4;
        const padX = labelSize2 * 0.5;
        const padY = labelSize2 * 0.25;

        for (const tick of ticks) {
          const tx = margin.left + xScale(tick);
          const label = formatGridTick(tick);
          const tw = ctx.measureText(label).width;

          // pill background for readability
          const labelSize2 = Math.round(physicalHeight * 0.020);
          ctx.globalAlpha = gridOpacity * 0.85;
          ctx.fillStyle = settings.backgroundColor || '#ffffff';
          ctx.beginPath();
          ctx.roundRect(tx - tw / 2 - padX, labelY - labelSize2 - padY, tw + padX * 2, labelSize2 + padY * 2, labelSize2 * 0.35);
          ctx.fill();

          // label text at full contrast
          ctx.globalAlpha = Math.min(1, gridOpacity * 4);
          ctx.fillStyle = settings.gridLabelColor || textColor;
          ctx.fillText(label, tx, labelY);
        }
      }

      ctx.restore();
    }

    // Video / Image Clips
    const curIdx2 = periods.indexOf(currentPeriod);
    for (const clip of (settings.videoEntries ?? [])) {
      const isImageClip = clip.type === 'image';
      if (!isImageClip && !clip.objectUrl) continue;
      if (isImageClip && !clip.imageUrl) continue;

      const fi = periods.indexOf(clip.from);
      const ti = periods.indexOf(clip.to);
      if (fi === -1 || ti === -1) continue;
      const [cs, ce] = fi <= ti ? [fi, ti] : [ti, fi];
      if (curIdx2 < cs || curIdx2 > ce) continue;

      let clipW: number, clipH: number;
      const pad = physicalWidth * 0.03;
      const fa = clipFadeAlpha(curIdx2, fi, ti, t);

      if (isImageClip) {
        loadImage(clip.imageUrl!, bumpImgVersion);
        const img = imageCache.get(clip.imageUrl!);
        if (!img) continue;
        clipW = physicalWidth * (clip.width / 100);
        const aspect = img.naturalWidth > 0 ? img.naturalWidth / img.naturalHeight : 1;
        clipH = clipW / aspect;
        let cx = 0, cy = 0;
        switch (clip.position) {
          case 'top-left':     cx = pad;                         cy = pad; break;
          case 'top-right':    cx = physicalWidth - clipW - pad; cy = pad; break;
          case 'bottom-left':  cx = pad;                         cy = physicalHeight - clipH - pad; break;
          case 'bottom-right': cx = physicalWidth - clipW - pad; cy = physicalHeight - clipH - pad; break;
          case 'center':       cx = (physicalWidth - clipW) / 2; cy = (physicalHeight - clipH) / 2; break;
        }
        cx += (clip.offsetX ?? 0);
        cy += (clip.offsetY ?? 0);
        ctx.save();
        ctx.globalAlpha = (clip.opacity ?? 1) * fa;
        ctx.drawImage(img, cx, cy, clipW, clipH);
        ctx.restore();
      } else {
        const video = getClipVideo(clip.objectUrl);
        if (video.readyState < 2) continue;
        clipW = physicalWidth * (clip.width / 100);
        const aspect = video.videoWidth > 0 ? video.videoWidth / video.videoHeight : 16 / 9;
        clipH = clipW / aspect;
        let cx = 0, cy = 0;
        switch (clip.position) {
          case 'top-left':     cx = pad;                         cy = pad; break;
          case 'top-right':    cx = physicalWidth - clipW - pad; cy = pad; break;
          case 'bottom-left':  cx = pad;                         cy = physicalHeight - clipH - pad; break;
          case 'bottom-right': cx = physicalWidth - clipW - pad; cy = physicalHeight - clipH - pad; break;
          case 'center':       cx = (physicalWidth - clipW) / 2; cy = (physicalHeight - clipH) / 2; break;
        }
        cx += (clip.offsetX ?? 0);
        cy += (clip.offsetY ?? 0);
        ctx.save();
        ctx.globalAlpha = (clip.opacity ?? 1) * fa;
        ctx.drawImage(video, cx, cy, clipW, clipH);
        ctx.restore();
      }
    }


    // ── Rank animation ────────────────────────────────────────────────────────
    const riseProgressMap = new Map<string, number>();
    const rankEt = Math.min(1, et * (settings.rankSwapSpeed ?? 1.0));

    topData.forEach(d => {
      const prevRank = prevRankMap.get(d.name) ?? settings.maxBars;
      const currRank = currRankMap.get(d.name) ?? settings.maxBars;
      if (currRank < prevRank) {
        riseProgressMap.set(d.name, rankEt);
      }
    });

    // ── Draw ─────────────────────────────────────────────────────────────────
    topData.forEach((d) => {
      const prevRank = prevRankMap.get(d.name) ?? settings.maxBars;
      const currRank = currRankMap.get(d.name) ?? settings.maxBars;
      let rank: number;
      if (springStates) {
        rank = springStates.rank.get(d.name)?.pos ?? interpolatedData.findIndex(x => x.name === d.name);
      } else {
        rank = interpolate(prevRank, currRank, rankEt);
      }
      const riseProgress = riseProgressMap.get(d.name) ?? 0;

      if (rank >= settings.maxBars) return;

      // Image spin: one full 360° when rising up in rank (if enabled)
      const isRising = currRank < prevRank;
      const spinAngle = (settings.imageSpinOnRise && isRising) ? t * 2 * Math.PI : 0;

      // Overtake glow: when spring rank is actively moving to a better position
      const springRankPos = springStates?.rank.get(d.name)?.pos;
      const isOvertaking = springStates && springRankPos !== undefined && isRising && t > 0.1 && t < 0.9;

      const color = colorMap.get(d.name) ?? '#6c63ff';
      const nameSize = settings.labelVisible ? Math.round(barThicknessPx * (settings.labelFontSize / 100)) : 0;
      const valueSize = Math.round(barThicknessPx * ((settings.valueFontSize ?? 55) / 100));
      
      const imgUrl = imageUrlMap.get(d.name);
      const cachedImg = imgUrl ? imageCache.get(imgUrl) : undefined;
      const hasImage = !!cachedImg;
      
      let imgH = settings.imageHeight;
      let imgW = settings.imageWidth;
      const gap = settings.imageMarginRight || 10;

      if (hasImage) {
        if (isVertical) {
          imgW = barThicknessPx;
          imgH = imgW / (cachedImg.width / cachedImg.height);
        } else {
          imgH = Math.min(barThicknessPx, imgH);
          // Scale imgW proportionally so the aspect ratio stays constant at any canvas size
          imgW = settings.imageWidth * (imgH / settings.imageHeight);
        }
      }

      let bx = 0, by = 0, bw = 0, bh = 0;
      
      if (isVertical) {
        bx = margin.left + rank * (barThicknessPx + barPaddingPx);
        bh = Math.max(hasImage ? imgH : 0, Math.max(0, yScale(d.value)));
        by = physicalHeight - margin.bottom - bh;
        bw = barThicknessPx;
      } else {
        by = margin.top + rank * (barThicknessPx + barPaddingPx);
        bw = Math.max(hasImage ? imgW : 0, Math.max(0, xScale(d.value)));
        bx = margin.left;
        bh = barThicknessPx;
      }

      // Uniform scale anchored to left edge: bar grows right while rising
      const popScale = 1 + 0.22 * Math.sin(Math.PI * riseProgress);
      ctx.save();
      if (popScale > 1.001 && !isVertical) {
        const cy = by + bh / 2;
        ctx.translate(bx, cy);
        ctx.scale(popScale, popScale);
        ctx.translate(-bx, -cy);
      }

      ctx.globalAlpha = settings.barOpacity ?? 1;
      ctx.fillStyle = color;
      if (isOvertaking) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
      }
      ctx.beginPath();
      
      if (settings.barEndShape === 'flat') {
        ctx.rect(bx, by, bw, bh);
      } else if (settings.barEndShape === 'arrow') {
        if (isVertical) {
          const arrowHeight = Math.min(bw * 0.4, bh * 0.2);
          ctx.moveTo(bx, by + bh);
          ctx.lineTo(bx + bw, by + bh);
          ctx.lineTo(bx + bw, by + arrowHeight);
          ctx.lineTo(bx + bw / 2, by);
          ctx.lineTo(bx, by + arrowHeight);
          ctx.closePath();
        } else {
          const arrowWidth = Math.min(bh * 0.4, bw * 0.2);
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + bw - arrowWidth, by);
          ctx.lineTo(bx + bw, by + bh / 2);
          ctx.lineTo(bx + bw - arrowWidth, by + bh);
          ctx.lineTo(bx, by + bh);
          ctx.closePath();
        }
      } else {
        if (isVertical) {
          ctx.roundRect(bx, by, bw, bh, [bw / 2, bw / 2, 0, 0]);
        } else {
          ctx.roundRect(bx, by, bw, bh, [0, bh / 2, bh / 2, 0]);
        }
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      if (isVertical) {
        // Vertical layout image & labels
        if (hasImage) {
          let imgY = by - imgH - gap;
          if (settings.imagePosition === 'inside') imgY = by + gap;
          else if (settings.imagePosition === 'right') imgY = by - imgH - gap; // top is right equivalent
          else if (settings.imagePosition === 'left') imgY = physicalHeight - margin.bottom + gap; // bottom is left equivalent
          
          const imgCX = bx + bw / 2, imgCY = imgY + imgH / 2;
          ctx.save();
          ctx.translate(imgCX, imgCY);
          ctx.rotate(spinAngle);
          ctx.translate(-imgCX, -imgCY);
          drawImageInBox(ctx, cachedImg, bx + (bw - imgW) / 2, imgY, imgW, imgH, settings.imageSizing, settings.imageShape);
          ctx.restore();
        }

        // Names vertical at bottom
        if (settings.labelVisible) {
          ctx.save();
          ctx.translate(bx + bw / 2, physicalHeight - margin.bottom + (settings.labelMargin ?? 15));
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = labelColor;
          ctx.font = (settings.labelBold ? '700 ' : '400 ') + nameSize + 'px Inter, sans-serif';
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          ctx.fillText(d.name, 0, 0);
          ctx.restore();
        }

        // Value vertical inside
        ctx.save();
        ctx.translate(bx + bw / 2, by + (settings.labelMargin ?? 15));
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = settings.valueColor || getTextColor(color);
        ctx.font = '700 ' + valueSize + 'px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatValue(d.value, vfmt) + ' ' + settings.unit, 0, 0);
        ctx.restore();

        ctx.restore(); // pop scale (vertical — no scale applied but save was opened)

      } else {
        // Horizontal layout image & labels
        const labelMargin = settings.labelMargin ?? 15;
        const isInside = settings.labelPosition === 'inside-left' || settings.labelPosition === 'inside-right';

        if (settings.labelVisible) {
          ctx.font = (settings.labelBold ? '700 ' : '400 ') + nameSize + 'px Inter, sans-serif';
        }
        const nameWidth = settings.labelVisible ? ctx.measureText(d.name).width : 0;

        let imgX = 0;
        let nameX = 0;
        let nameAlign: CanvasTextAlign = 'right';
        let valueX = 0;
        let nameColor = textColor;

        if (settings.imagePosition === 'left') {
          imgX = margin.left - gap - imgW;
        } else if (settings.imagePosition === 'inside') {
          imgX = margin.left + Math.max(bw - imgW - gap, gap);
        } else if (settings.imagePosition === 'right') {
          imgX = margin.left + bw + gap;
        }

        if (settings.labelPosition === 'left') {
          nameAlign = 'right';
          nameX = (settings.imagePosition === 'left' && hasImage) ? imgX - gap : margin.left - labelMargin;
        } else if (settings.labelPosition === 'inside-left') {
          nameAlign = 'left';
          nameX = margin.left + labelMargin;
        } else if (settings.labelPosition === 'inside-right') {
          nameAlign = 'right';
          if (settings.imagePosition === 'inside' && hasImage) {
            nameX = imgX - gap;
          } else {
            nameX = margin.left + bw - labelMargin;
          }
        } else if (settings.labelPosition === 'right') {
          nameAlign = 'left';
          nameX = (settings.imagePosition === 'right' && hasImage) ? imgX + imgW + gap : margin.left + bw + labelMargin;
        }

        if (settings.labelPosition === 'right' && settings.imagePosition === 'right' && hasImage) {
          valueX = nameX + nameWidth + gap;
        } else if (settings.labelPosition === 'right') {
          valueX = nameX + nameWidth + gap;
        } else if (settings.imagePosition === 'right' && hasImage) {
          valueX = imgX + imgW + gap;
        } else {
          valueX = margin.left + bw + 15;
        }

        if (hasImage) {
          const imgY = by + (bh - imgH) / 2;
          const imgCX = imgX + imgW / 2, imgCY = imgY + imgH / 2;
          ctx.save();
          ctx.translate(imgCX, imgCY);
          ctx.rotate(spinAngle);
          ctx.translate(-imgCX, -imgCY);
          drawImageInBox(ctx, cachedImg, imgX, imgY, imgW, imgH, settings.imageSizing, settings.imageShape);
          ctx.restore();
        }

        ctx.font = '700 ' + valueSize + 'px Inter, sans-serif';
        ctx.fillStyle = settings.valueColor || textColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatValue(d.value, vfmt) + ' ' + settings.unit, valueX, by + bh / 2);

        // Restore scale transform before drawing label (name stays fixed on left)
        ctx.restore();

        if (settings.labelVisible) {
          ctx.save();
          if (isInside) {
            ctx.beginPath();
            ctx.rect(margin.left, by, bw, bh);
            ctx.clip();
          }
          ctx.font = (settings.labelBold ? '700 ' : '400 ') + nameSize + 'px Inter, sans-serif';
          ctx.fillStyle = labelColor;
          ctx.textAlign = nameAlign;
          ctx.textBaseline = 'middle';
          ctx.fillText(d.name, nameX, by + bh / 2);
          ctx.restore();
        }
      }
    });

  }, [data, periods, settings, imgVersion, bumpImgVersion]);

  const seekClipVideos = useCallback(async (periodIndex: number, t: number) => {
    const curIdx = periodIndex;
    for (const clip of (settings.videoEntries ?? []) as VideoEntry[]) {
      if (!clip.objectUrl) continue;
      const fi = periods.indexOf(clip.from);
      const ti = periods.indexOf(clip.to);
      if (fi === -1 || ti === -1) continue;
      const [cs, ce] = fi <= ti ? [fi, ti] : [ti, fi];
      if (curIdx < cs || curIdx > ce) continue;

      const video = getClipVideo(clip.objectUrl);

      if (video.readyState < 1) {
        await new Promise<void>(resolve => {
          const fn = () => { video.removeEventListener('loadedmetadata', fn); resolve(); };
          video.addEventListener('loadedmetadata', fn);
          setTimeout(resolve, 500);
        });
      }

      const durationSec = settings.durationMs / 1000;
      const clipTime = (curIdx - cs + t) * durationSec;
      video.currentTime = video.duration > 0 ? Math.min(clipTime, video.duration) : clipTime;

      await new Promise<void>(resolve => {
        const fn = () => { video.removeEventListener('seeked', fn); resolve(); };
        video.addEventListener('seeked', fn);
        setTimeout(resolve, 200);
      });
    }
  }, [periods, settings]);

  return { drawFrame, imgVersion, seekClipVideos };
}
