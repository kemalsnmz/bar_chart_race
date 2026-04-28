import { useCallback, useReducer } from 'react';
import * as d3 from 'd3';
import { useChartStore } from '../store/chartStore';
import { interpolate } from '../utils/interpolate';
import { buildBarColors, buildCategoryColors, parseSingleColorText } from '../utils/colorPalettes';
import { formatValue } from '../utils/formatValue';

const imageCache = new Map<string, HTMLImageElement | null>();

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
    width: number,
    height: number,
    periodIndex: number,
    t: number
  ) => {
    ctx.fillStyle = settings.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (periods.length === 0 || data.length === 0) return;

    const textColor = getTextColor(settings.backgroundColor || '#ffffff');

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

    const prevDataMap = new Map(data.filter(d => d.time === prevPeriod).map(d => [d.name, d.value]));
    const currDataMap = new Map(data.filter(d => d.time === currentPeriod).map(d => [d.name, d.value]));
    const allEntities = new Set([...prevDataMap.keys(), ...currDataMap.keys()]);

    const interpolatedData: { name: string; value: number }[] = [];
    for (const name of allEntities) {
      const val = interpolate(prevDataMap.get(name) ?? 0, currDataMap.get(name) ?? 0, t);
      interpolatedData.push({ name, value: val });
    }

    interpolatedData.sort((a, b) => b.value - a.value);
    const topData = interpolatedData.slice(0, settings.maxBars);

    const fullPrev = allNames.map(name => ({ name, value: prevDataMap.get(name) ?? 0 })).sort((a, b) => b.value - a.value);
    const fullCurr = allNames.map(name => ({ name, value: currDataMap.get(name) ?? 0 })).sort((a, b) => b.value - a.value);
    const prevRankMap = new Map(fullPrev.map((d, i) => [d.name, i]));
    const currRankMap = new Map(fullCurr.map((d, i) => [d.name, i]));

    const margin = { top: height * 0.15, right: width * 0.1, bottom: height * 0.05, left: width * 0.15 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const slotHeight = chartHeight / settings.maxBars;
    const totalParts = settings.barThickness + settings.barGap;
    const barHeight = slotHeight * (settings.barThickness / totalParts);
    const barPadding = slotHeight * (settings.barGap / totalParts);
    const maxVal = Math.max(...topData.map(d => d.value), 1);
    const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, chartWidth]);

    // Title
    const titleSize = Math.round(height * (settings.titleFontSize / 1000));
    const titleWeight = settings.titleBold ? 'bold' : '400';
    ctx.fillStyle = textColor;
    ctx.font = titleWeight + ' ' + titleSize + 'px Inter, sans-serif';
    ctx.textBaseline = 'top';
    const titleY = height * 0.04;
    if (settings.titleAlign === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(settings.title, width / 2, titleY);
    } else if (settings.titleAlign === 'right') {
      ctx.textAlign = 'right';
      ctx.fillText(settings.title, width * 0.95, titleY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(settings.title, width * 0.05, titleY);
    }

    // Period watermark
    ctx.fillStyle = textColor === '#000000' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    ctx.font = 'bold ' + Math.round(height * 0.22) + 'px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(currentPeriod, width * 0.95, height * 0.95);

    // Bars
    topData.forEach((d) => {
      const prevRank = prevRankMap.get(d.name) ?? settings.maxBars;
      const currRank = currRankMap.get(d.name) ?? settings.maxBars;
      const rank = interpolate(prevRank, currRank, t);
      if (rank >= settings.maxBars) return;

      const y = margin.top + rank * (barHeight + barPadding);
      const w = Math.max(0, xScale(d.value));
      const color = colorMap.get(d.name) ?? '#6c63ff';

      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.globalAlpha = settings.barOpacity ?? 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      
      if (settings.barEndShape === 'flat') {
        ctx.rect(margin.left, y, w, barHeight);
      } else if (settings.barEndShape === 'arrow') {
        const arrowWidth = Math.min(barHeight * 0.4, w * 0.2);
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + w - arrowWidth, y);
        ctx.lineTo(margin.left + w, y + barHeight / 2);
        ctx.lineTo(margin.left + w - arrowWidth, y + barHeight);
        ctx.lineTo(margin.left, y + barHeight);
        ctx.closePath();
      } else {
        // default is round
        ctx.roundRect(margin.left, y, w, barHeight, [0, barHeight / 2, barHeight / 2, 0]);
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Image and Label positioning
      const imgUrl = imageUrlMap.get(d.name);
      const cachedImg = imgUrl ? imageCache.get(imgUrl) : undefined;
      const hasImage = !!cachedImg;
      
      const imgH = settings.imageHeight;
      const imgW = settings.imageWidth;
      const gap = settings.imageMarginRight || 10;

      let imgX = 0;
      let nameX = margin.left - 15; // default fixed label position
      let nameAlign: CanvasTextAlign = 'right';
      let valueX = margin.left + w + 15;
      let nameColor = textColor;
      
      const nameSize = settings.labelVisible ? Math.round(barHeight * (settings.labelFontSize / 100)) : 0;
      if (settings.labelVisible) {
        ctx.font = (settings.labelBold ? '700 ' : '400 ') + nameSize + 'px Inter, sans-serif';
      }

      if (settings.imagePosition === 'left') {
        imgX = margin.left - gap - imgW;
        if (hasImage) nameX = imgX - 8;
      } else if (settings.imagePosition === 'inside') {
        imgX = margin.left + Math.max(w - imgW - gap, gap); // ensure it doesn't overflow left axis
      } else if (settings.imagePosition === 'right') {
        imgX = margin.left + w + gap;
        if (hasImage) valueX = imgX + imgW + gap; // push value label further right
      }

      // Draw Image
      if (hasImage) {
        const imgY = y + (barHeight - imgH) / 2;
        drawImageInBox(ctx, cachedImg, imgX, imgY, imgW, imgH, settings.imageSizing, settings.imageShape);
      }

      // Draw Name
      if (settings.labelVisible) {
        ctx.fillStyle = nameColor;
        ctx.textAlign = nameAlign;
        ctx.textBaseline = 'middle';
        ctx.fillText(d.name, nameX, y + barHeight / 2);
      }

      // Draw Value
      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      ctx.fillText(formatValue(d.value) + ' ' + settings.unit, valueX, y + barHeight / 2);

    });

  }, [data, periods, settings, imgVersion, bumpImgVersion]);

  return { drawFrame, imgVersion };
}
