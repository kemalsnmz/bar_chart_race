import { useCallback } from 'react';
import * as d3 from 'd3';
import { useChartStore } from '../store/chartStore';
import { interpolate } from '../utils/interpolate';
import { buildBarColors, buildCategoryColors, parseSingleColorText, DISTINCT_20 } from '../utils/colorPalettes';
import { formatValue } from '../utils/formatValue';

export function useChartRenderer() {
  const { data, periods, settings } = useChartStore();

  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    periodIndex: number,
    t: number
  ) => {
    ctx.fillStyle = settings.backgroundColor || '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    if (periods.length === 0 || data.length === 0) return;

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
    const barHeight = (chartHeight / settings.maxBars) * 0.8;
    const barPadding = (chartHeight / settings.maxBars) * 0.2;
    const maxVal = Math.max(...topData.map(d => d.value), 1);
    const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, chartWidth]);

    // Title
    const titleSize = Math.round(height * (settings.titleFontSize / 1000));
    const titleWeight = settings.titleBold ? 'bold' : '400';
    ctx.fillStyle = '#ffffff';
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
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
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
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(margin.left, y, w, barHeight, [0, barHeight / 2, barHeight / 2, 0]);
      ctx.fill();
      ctx.shadowBlur = 0;

      const nameSize = Math.round(barHeight * 0.6);
      ctx.font = '600 ' + nameSize + 'px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.name, margin.left - 15, y + barHeight / 2);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(formatValue(d.value) + ' ' + settings.unit, margin.left + w + 15, y + barHeight / 2);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '400 ' + Math.round(barHeight * 0.4) + 'px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('#' + (Math.round(rank) + 1), margin.left - 15, y + barHeight * 0.1);
    });

  }, [data, periods, settings]);

  return { drawFrame };
}
