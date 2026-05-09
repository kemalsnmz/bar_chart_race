import { useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { useLineChartStore } from '../store/lineChartStore';
import { useLineChartRenderer } from './useLineChartRenderer';

export function useLineVideoExporter() {
  const { periods, settings, exportSettings, setExporting } = useLineChartStore();
  const { drawFrame } = useLineChartRenderer();

  const exportVideo = useCallback(async () => {
    if (periods.length === 0) return;

    setExporting(true, 0);

    const width  = exportSettings.resolution === '4k' ? 3840 : 1920;
    const height = exportSettings.resolution === '4k' ? 2160 : 1080;
    const fps    = exportSettings.fps;

    const canvas = document.createElement('canvas');
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setExporting(false); throw new Error('No canvas context'); }

    const ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress }) => {
      setExporting(true, 0.8 + progress * 0.2);
    });

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL('/ffmpeg-core.js',   'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
      });
    } catch (e) {
      setExporting(false);
      alert('FFmpeg yüklenemedi: ' + String(e));
      return;
    }

    setExporting(true, 0.05);

    const framesPerPeriod = Math.floor((settings.durationMs / 1000) * fps);
    const totalFrames     = (periods.length - 1) * framesPerPeriod + 1;
    const pad = (n: number) => String(n).padStart(6, '0');
    let frameIdx = 0;

    const captureFrame = (): Promise<Uint8Array> =>
      new Promise(resolve =>
        canvas.toBlob(async blob => {
          resolve(new Uint8Array(await blob!.arrayBuffer()));
        }, 'image/jpeg', 0.92)
      );

    for (let p = 0; p < periods.length - 1; p++) {
      for (let f = 0; f < framesPerPeriod; f++) {
        const t = f / framesPerPeriod;
        drawFrame(ctx, width, height, p, t);
        await ffmpeg.writeFile(`f${pad(frameIdx)}.jpg`, await captureFrame());
        frameIdx++;
        setExporting(true, 0.05 + (frameIdx / totalFrames) * 0.73);
      }
    }

    // Final frame
    drawFrame(ctx, width, height, periods.length - 1, 0);
    await ffmpeg.writeFile(`f${pad(frameIdx)}.jpg`, await captureFrame());
    setExporting(true, 0.78);

    await ffmpeg.exec([
      '-framerate', String(fps),
      '-i',         'f%06d.jpg',
      '-c:v',       'libx264',
      '-preset',    'fast',
      '-crf',       '18',
      '-pix_fmt',   'yuv420p',
      '-r',         String(fps),
      '-movflags',  '+faststart',
      'output.mp4',
    ]);

    const fileData  = await ffmpeg.readFile('output.mp4');
    const finalBlob = new Blob(
      [(fileData as Uint8Array).buffer as ArrayBuffer],
      { type: 'video/mp4' }
    );

    const url = URL.createObjectURL(finalBlob);
    const a   = document.createElement('a');
    a.style.display = 'none';
    a.href     = url;
    a.download = `line-chart-race-${exportSettings.resolution}.mp4`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

    setExporting(false, 1);
  }, [periods, settings, exportSettings, drawFrame, setExporting]);

  const exportVideoSafe = useCallback(async () => {
    try {
      await exportVideo();
    } catch (e) {
      setExporting(false);
      alert('Export hatası: ' + String(e));
    }
  }, [exportVideo, setExporting]);

  return { exportVideo: exportVideoSafe };
}
