// Types
export type { SpringConfig, SpringState, BarEngineConfig, BarEngineState, MotionPresetKey } from './types';

// Physics
export { stepSpringRK4, settleSpring } from './physics/springRK4';

// Presets
export { MOTION_PRESETS, resolveEngineConfig } from './utils/motionPresets';

// Engine
export { stepBarEngine, createBarEngineState } from './engine/barEngine';

// Hook
export { useBarSpringEngine } from './hooks/useBarSpringEngine';
