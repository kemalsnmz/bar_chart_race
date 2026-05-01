import { useCallback, useReducer } from 'react';
import * as d3 from 'd3';
import { useChartStore } from '../store/chartStore';
import { interpolate } from '../utils/interpolate';
import { buildBarColors, buildCategoryColors, parseSingleColorText } from '../utils/colorPalettes';
import { formatValue } from '../utils/formatValue';

const imageCache = new Map<string, HTMLImageElement | null>();

let bgVideoEl: HTMLVideoElement | null = null;
let bgVideoSrc = '';

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
    t: number
  ) => {
    const isVertical = settings.layout === 'vertical';

    ctx.fillStyle = settings.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, physicalWidth, physicalHeight);

    const mTop = settings.backgroundMarginTop ?? 0;
    const mRight = settings.backgroundMarginRight ?? 0;
    const mBot = settings.backgroundMarginBottom ?? 0;
    const mLeft = settings.backgroundMarginLeft ?? 0;
    const bx = mLeft, by = mTop;
    const bw = physicalWidth - mLeft - mRight;
    const bh = physicalHeight - mTop - mBot;

    if (settings.backgroundVideoUrl && bw > 0 && bh > 0) {
      const video = getBgVideo(settings.backgroundVideoUrl);
      if (video.readyState >= 2) {
        ctx.globalAlpha = settings.backgroundOpacity ?? 1;
        ctx.drawImage(video, bx, by, bw, bh);
        ctx.globalAlpha = 1;
      }
    } else if (settings.backgroundImageUrl) {
      loadImage(settings.backgroundImageUrl, bumpImgVersion);
      const bgImg = imageCache.get(settings.backgroundImageUrl);
      if (bgImg && bw > 0 && bh > 0) {
        ctx.globalAlpha = settings.backgroundOpacity ?? 1;
        drawImageInBox(ctx, bgImg, bx, by, bw, bh, 'fill', 'rectangle');
        ctx.globalAlpha = 1;
      }
    }

    if ((settings.backgroundTint ?? 0) > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundTint})`;
      ctx.fillRect(0, 0, physicalWidth, physicalHeight);
    }

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

    let margin;
    if (isVertical) {
      margin = {
        top: settings.titleVisible ? physicalHeight * 0.15 : physicalHeight * 0.05,
        right: physicalWidth * 0.05,
        bottom: physicalHeight * 0.15,
        left: physicalWidth * 0.05
      };
    } else {
      const baseRightMargin = physicalWidth * 0.15;
      const extraRightMargin = settings.imagePosition === 'right' ? (settings.imageWidth + (settings.imageMarginRight || 10) * 2) : 0;
      margin = { 
        top: settings.titleVisible ? physicalHeight * 0.15 : physicalHeight * 0.05, 
        right: baseRightMargin + extraRightMargin, 
        bottom: physicalHeight * 0.05, 
        left: physicalWidth * 0.15 
      };
    }

    const chartWidth = physicalWidth - margin.left - margin.right;
    const chartHeight = physicalHeight - margin.top - margin.bottom;
    const maxVal = Math.max(...topData.map(d => d.value), 1);
    
    let xScale = d3.scaleLinear().domain([0, maxVal]).range([0, chartWidth]);
    let yScale = d3.scaleLinear().domain([0, maxVal]).range([0, chartHeight]);

    const totalParts = settings.barThickness + settings.barGap;
    const slotSize = isVertical ? (chartWidth / settings.maxBars) : (chartHeight / settings.maxBars);
    const barThicknessPx = slotSize * (settings.barThickness / totalParts);
    const barPaddingPx = slotSize * (settings.barGap / totalParts);

    // Title
    if (settings.titleVisible) {
      const titleSize = Math.round(physicalHeight * (settings.titleFontSize / 1000));
      const titleWeight = settings.titleBold ? 'bold' : '400';
      ctx.fillStyle = settings.titleColor || textColor;
      ctx.font = titleWeight + ' ' + titleSize + 'px Inter, sans-serif';
      ctx.textBaseline = 'top';
      const titleY = physicalHeight * 0.04;
      if (settings.titleAlign === 'center') {
        ctx.textAlign = 'center';
        ctx.fillText(settings.title, physicalWidth / 2, titleY);
      } else if (settings.titleAlign === 'right') {
        ctx.textAlign = 'right';
        ctx.fillText(settings.title, physicalWidth * 0.95, titleY);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(settings.title, physicalWidth * 0.05, titleY);
      }
    }

    // Period watermark
    if (settings.timeVisible !== false) {
      ctx.fillStyle = textColor;
      const fontSizePx = Math.round(physicalHeight * ((settings.timeFontSize ?? 22) / 100));
      const fontWeight = settings.timeBold !== false ? 'bold' : 'normal';
      ctx.font = `${fontWeight} ${fontSizePx}px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = isVertical ? 'top' : 'bottom';
      
      const baseX = physicalWidth * 0.95 - (settings.timeMarginX ?? 0);
      let baseY = isVertical ? physicalHeight * 0.05 : physicalHeight * 0.95;
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
      let totalY = physicalHeight * 0.95;
      if (isVertical) {
        totalY = (settings.timeVisible !== false) ? physicalHeight * 0.28 : physicalHeight * 0.05;
      } else {
        totalY = (settings.timeVisible !== false) ? physicalHeight * 0.73 : physicalHeight * 0.95;
      }
      totalY += (settings.totalMarginY ?? 0);
      ctx.fillText(`Total: ${formatValue(totalVal)} ${settings.unit}`, totalX, totalY);
      ctx.restore();
    }

    // Bars
    topData.forEach((d) => {
      const rank = interpolate(prevRankMap.get(d.name) ?? settings.maxBars, currRankMap.get(d.name) ?? settings.maxBars, t);
      if (rank >= settings.maxBars) return;

      const color = colorMap.get(d.name) ?? '#6c63ff';
      const nameSize = settings.labelVisible ? Math.round(barThicknessPx * (settings.labelFontSize / 100)) : 0;
      
      const imgUrl = imageUrlMap.get(d.name);
      const cachedImg = imgUrl ? imageCache.get(imgUrl) : undefined;
      const hasImage = !!cachedImg;
      
      let imgH = settings.imageHeight;
      let imgW = settings.imageWidth;
      const gap = settings.imageMarginRight || 10;

      if (hasImage) {
        const aspect = cachedImg.width / cachedImg.height;
        if (isVertical) {
          imgW = barThicknessPx;
          imgH = imgW / aspect;
        } else {
          imgH = barThicknessPx;
          imgW = imgH * aspect;
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

      ctx.globalAlpha = settings.barOpacity ?? 1;
      ctx.fillStyle = color;
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
          
          drawImageInBox(ctx, cachedImg, bx + (bw - imgW) / 2, imgY, imgW, imgH, settings.imageSizing, settings.imageShape);
        }

        // Names vertical at bottom
        if (settings.labelVisible) {
          ctx.save();
          ctx.translate(bx + bw / 2, physicalHeight - margin.bottom + (settings.labelMargin ?? 15));
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = settings.labelColor || textColor;
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
        ctx.fillStyle = getTextColor(color);
        ctx.font = (settings.labelBold ? '700 ' : '400 ') + nameSize + 'px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatValue(d.value) + ' ' + settings.unit, 0, 0);
        ctx.restore();

      } else {
        // Horizontal layout image & labels
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
          nameX = (settings.imagePosition === 'left' && hasImage) ? imgX - gap : margin.left - (settings.labelMargin ?? 15);
        } else if (settings.labelPosition === 'inside') {
          nameAlign = 'left';
          nameX = margin.left + (settings.labelMargin ?? 15);
          nameColor = getTextColor(color);
        } else if (settings.labelPosition === 'right') {
          nameAlign = 'left';
          nameX = (settings.imagePosition === 'right' && hasImage) ? imgX + imgW + gap : margin.left + bw + (settings.labelMargin ?? 15);
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
          drawImageInBox(ctx, cachedImg, imgX, imgY, imgW, imgH, settings.imageSizing, settings.imageShape);
        }

        if (settings.labelVisible) {
          ctx.fillStyle = settings.labelColor || nameColor;
          ctx.textAlign = nameAlign;
          ctx.textBaseline = 'middle';
          ctx.fillText(d.name, nameX, by + bh / 2);
        }

        ctx.fillStyle = textColor;
        ctx.textAlign = 'left';
        ctx.fillText(formatValue(d.value) + ' ' + settings.unit, valueX, by + bh / 2);
      }
    });

  }, [data, periods, settings, imgVersion, bumpImgVersion]);

  return { drawFrame, imgVersion };
}
