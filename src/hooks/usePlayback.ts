import { useCallback } from 'react';
import { useChartStore } from '../store/chartStore';

export function usePlayback() {
  const togglePlay = useCallback(() => {
    const { playback, updatePlayback } = useChartStore.getState();
    updatePlayback({ isPlaying: !playback.isPlaying });
  }, []);

  const seek = useCallback((periodIndex: number) => {
    useChartStore.getState().updatePlayback({
      currentPeriodIndex: periodIndex,
      currentTimeInPeriod: 0,
      isPlaying: false,
    });
  }, []);

  const setSpeed = useCallback((speed: number) => {
    useChartStore.getState().updatePlayback({ speed });
  }, []);

  return { togglePlay, seek, setSpeed };
}
