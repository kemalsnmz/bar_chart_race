import { useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { useChartStore } from '../store/chartStore';
import type { AudioEntry } from '../store/chartStore';
import { useChartRenderer } from './useChartRenderer';

function audioBufferToWav(buffer: AudioBuffer): Uint8Array {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const byteLen = len * numCh * 2;
  const out = new ArrayBuffer(44 + byteLen);
  const view = new DataView(out);
  const write = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  write(0, 'RIFF'); view.setUint32(4, 36 + byteLen, true);
  write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true); view.setUint16(34, 16, true);
  write(36, 'data'); view.setUint32(40, byteLen, true);
  const channels = Array.from({ length: numCh }, (_, i) => buffer.getChannelData(i));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return new Uint8Array(out);
}

async function renderAudioOffline(
  audioEntries: AudioEntry[],
  periods: string[],
  durationMs: number,
): Promise<Uint8Array | null> {
  if (audioEntries.length === 0) return null;
  const totalSec = (periods.length - 1) * (durationMs / 1000);
  if (totalSec <= 0) return null;
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(totalSec * sr), sr);

  for (const entry of audioEntries) {
    const fromIdx = periods.indexOf(entry.from);
    const toIdx = periods.indexOf(entry.to);
    if (fromIdx < 0 || toIdx < 0 || fromIdx > toIdx) continue;
    const startSec = fromIdx * (durationMs / 1000);
    const endSec = Math.min((toIdx + 1) * (durationMs / 1000), totalSec);
    try {
      const resp = await fetch(entry.objectUrl);
      const buf = await ctx.decodeAudioData(await resp.arrayBuffer());
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startSec);
      if (entry.fadeIn > 0) {
        gain.gain.linearRampToValueAtTime(entry.volume, startSec + entry.fadeIn);
      } else {
        gain.gain.setValueAtTime(entry.volume, startSec);
      }
      if (entry.fadeOut > 0 && endSec - entry.fadeOut > startSec) {
        gain.gain.setValueAtTime(entry.volume, endSec - entry.fadeOut);
        gain.gain.linearRampToValueAtTime(0.0001, endSec);
      }
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(startSec);
      src.stop(endSec);
    } catch { /* skip undecodable entries */ }
  }

  const rendered = await ctx.startRendering();
  return audioBufferToWav(rendered);
}

export function useVideoExporter() {
  const { periods, settings, exportSettings, setExporting } = useChartStore();
  const { drawFrame, seekClipVideos } = useChartRenderer();

  const exportVideo = useCallback(async () => {
    if (periods.length === 0) return;
    const { audioEntries } = useChartStore.getState();

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
    const deltaMs         = 1000 / fps;
    let   frameIdx        = 0;

    // Synchronous JPEG capture — eliminates one async round-trip per frame
    const captureFrame = (): Uint8Array => {
      const dataURL = canvas.toDataURL('image/jpeg', 0.94);
      const base64  = dataURL.slice(dataURL.indexOf(',') + 1);
      const bin     = atob(base64);
      const bytes   = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    };

    // Only seek clip videos when clips are actually present
    const hasClipVideos = (settings.videoEntries ?? []).some(
      e => (e.type === 'image' ? !!e.imageUrl : !!e.objectUrl) && e.from && e.to
    );

    const pad = (n: number) => String(n).padStart(6, '0');

    // Render every frame and write to FFmpeg virtual FS
    for (let p = 0; p < periods.length - 1; p++) {
      for (let f = 0; f < framesPerPeriod; f++) {
        const tInPeriod = f / framesPerPeriod;
        if (hasClipVideos) await seekClipVideos(p, tInPeriod);
        drawFrame(ctx, width, height, p, tInPeriod, deltaMs);
        await ffmpeg.writeFile(`f${pad(frameIdx)}.jpg`, captureFrame());
        frameIdx++;
        setExporting(true, 0.05 + (frameIdx / totalFrames) * 0.73);
        // Yield to browser every 15 frames so progress bar stays responsive
        if (frameIdx % 15 === 0) await new Promise(r => setTimeout(r, 0));
      }
    }

    // Final frame
    if (hasClipVideos) await seekClipVideos(periods.length - 1, 1);
    drawFrame(ctx, width, height, periods.length - 1, 1, deltaMs);
    await ffmpeg.writeFile(`f${pad(frameIdx)}.jpg`, captureFrame());
    setExporting(true, 0.78);

    // Render audio offline and write to FFmpeg FS
    const audioWav = await renderAudioOffline(audioEntries, periods, settings.durationMs);
    const hasAudio = audioWav !== null;
    if (hasAudio) await ffmpeg.writeFile('audio.wav', audioWav!);

    // Encode video (+ optional audio)
    const crf = exportSettings.resolution === '4k' ? '20' : '16';
    const baseVideoArgs = [
      '-framerate', String(fps),
      '-i',         'f%06d.jpg',
    ];
    const encodeArgs = [
      '-c:v',     'libx264',
      '-preset',  'veryfast',
      '-crf',     crf,
      '-tune',    'animation',
      '-pix_fmt', 'yuv420p',
      '-r',       String(fps),
      '-movflags', '+faststart',
    ];

    if (hasAudio) {
      await ffmpeg.exec([
        ...baseVideoArgs,
        '-i', 'audio.wav',
        ...encodeArgs,
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        'output.mp4',
      ]);
    } else {
      await ffmpeg.exec([
        ...baseVideoArgs,
        ...encodeArgs,
        'output.mp4',
      ]);
    }

    const fileData  = await ffmpeg.readFile('output.mp4');
    const finalBlob = new Blob(
      [(fileData as Uint8Array).buffer as ArrayBuffer],
      { type: 'video/mp4' }
    );

    const url = URL.createObjectURL(finalBlob);
    const a   = document.createElement('a');
    a.style.display = 'none';
    a.href     = url;
    a.download = `bar-chart-race-${exportSettings.resolution}.mp4`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

    setExporting(false, 1);
  }, [periods, settings, exportSettings, drawFrame, seekClipVideos, setExporting]);

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
