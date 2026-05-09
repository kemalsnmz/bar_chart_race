import { useCallback } from 'react';
import { useLineChartStore } from '../../store/lineChartStore';

export function LinePlaybackBar() {
  const { periods, playback, settings, updatePlayback } = useLineChartStore();

  const togglePlay = useCallback(() => {
    updatePlayback({ isPlaying: !useLineChartStore.getState().playback.isPlaying });
  }, [updatePlayback]);

  const seek = useCallback((idx: number) => {
    updatePlayback({ currentPeriodIndex: idx, currentTimeInPeriod: 0, isPlaying: false });
  }, [updatePlayback]);

  const setSpeed = useCallback((speed: number) => {
    updatePlayback({ speed });
  }, [updatePlayback]);

  if (periods.length === 0) return null;

  const totalSeconds = (periods.length * settings.durationMs) / 1000;
  const currentSeconds = ((playback.currentPeriodIndex + playback.currentTimeInPeriod) * settings.durationMs) / 1000;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="playback-bar">
      <button onClick={togglePlay} className="play-btn">
        {playback.isPlaying ? (
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
        ) : (
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
          </svg>
        )}
      </button>

      <div style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
        {fmt(currentSeconds)} / {fmt(totalSeconds)}
      </div>

      <div className="timeline">
        <input
          type="range"
          min="0"
          max={periods.length - 1}
          value={playback.currentPeriodIndex}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <div className="timeline-labels">
          <span>{periods[0]}</span>
          <span className="current">{periods[playback.currentPeriodIndex]}</span>
          <span>{periods[periods.length - 1]}</span>
        </div>
      </div>

      <div className="speed-group">
        {[0.25, 0.5, 1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={'speed-btn' + (playback.speed === s ? ' active' : '')}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
