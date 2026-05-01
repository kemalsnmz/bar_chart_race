import { useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { useChartStore } from '../store/chartStore';
import { useChartRenderer } from './useChartRenderer';

export function useVideoExporter() {
  const { periods, settings, exportSettings, setExporting } = useChartStore();
  const { drawFrame } = useChartRenderer();

  const exportVideo = useCallback(async () => {
    if (periods.length === 0) return;

    setExporting(true, 0);

    const width = exportSettings.resolution === '4k' ? 3840 : 1920;
    const height = exportSettings.resolution === '4k' ? 2160 : 1080;
    const fps = exportSettings.fps;
    const bitrate = exportSettings.resolution === '4k' ? 80000000 : 20000000;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setExporting(false);
      throw new Error('Canvas context could not be created');
    }

    const stream = canvas.captureStream(fps);

    const mimeTypes = [
      'video/mp4; codecs="avc1.42E01E"',
      'video/webm; codecs="vp9"',
      'video/webm; codecs="vp8"',
      'video/webm'
    ];

    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }

    if (!selectedMimeType) {
      setExporting(false);
      throw new Error('No supported video MIME type found');
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: bitrate,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordingPromise = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        resolve(new Blob(chunks, { type: selectedMimeType }));
      };
    });

    mediaRecorder.start();

    const framesPerPeriod = Math.floor((settings.durationMs / 1000) * fps);
    const totalFrames = (periods.length - 1) * framesPerPeriod;
    const deltaMs = 1000 / fps;

    let currentFrame = 0;

    for (let p = 0; p < periods.length - 1; p++) {
      for (let f = 0; f < framesPerPeriod; f++) {
        const t = f / framesPerPeriod;
        drawFrame(ctx, width, height, p, t, deltaMs);

        await new Promise((r) => setTimeout(r, 1000 / fps));

        currentFrame++;
        setExporting(true, (currentFrame / totalFrames) * 0.5);
      }
    }

    drawFrame(ctx, width, height, periods.length - 1, 1, deltaMs);
    await new Promise((r) => setTimeout(r, 1000 / fps));

    mediaRecorder.stop();
    const blob = await recordingPromise;

    let finalBlob = blob;
    let finalExtension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';

    if (!selectedMimeType.includes('mp4')) {
      try {
        setExporting(true, 0.5);
        const ffmpeg = new FFmpeg();

        ffmpeg.on('progress', ({ progress }) => {
          setExporting(true, 0.5 + progress * 0.5);
        });

        await ffmpeg.load({
          coreURL: await fetchFile(
            'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js'
          ) as any,
          wasmURL: await fetchFile(
            'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm'
          ) as any,
        });

        const inputName = 'input.webm';
        const outputName = 'output.mp4';

        await ffmpeg.writeFile(inputName, await fetchFile(blob));
        await ffmpeg.exec(['-i', inputName, '-c:v', 'copy', outputName]);

        const fileData = await ffmpeg.readFile(outputName);
        const data = new Uint8Array(fileData as any);

        finalBlob = new Blob([data.buffer], { type: 'video/mp4' });
        finalExtension = 'mp4';
      } catch (err) {
        console.error('FFmpeg conversion failed, falling back to original blob', err);
      }
    }

    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'bar-chart-race-' + exportSettings.resolution + '.' + finalExtension;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);

    setExporting(false, 1);
  }, [periods, settings, exportSettings, drawFrame, setExporting]);

  return { exportVideo };
}
