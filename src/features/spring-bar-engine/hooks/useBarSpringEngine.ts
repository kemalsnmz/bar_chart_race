import { useRef, useCallback } from 'react';
import type { BarEngineState, BarEngineConfig } from '../types';
import { stepBarEngine, createBarEngineState } from '../engine/barEngine';

export function useBarSpringEngine() {
  const stateRef = useRef<BarEngineState>(createBarEngineState());

  const step = useCallback((
    targetValues: Map<string, number>,
    dtSec: number,
    cfg: BarEngineConfig,
  ): BarEngineState => {
    stateRef.current = stepBarEngine(stateRef.current, targetValues, dtSec, cfg);
    return stateRef.current;
  }, []);

  const reset = useCallback(() => {
    stateRef.current = createBarEngineState();
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  return { step, reset, getState };
}
