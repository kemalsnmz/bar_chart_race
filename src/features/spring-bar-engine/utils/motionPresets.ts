import type { BarEngineConfig, MotionPresetKey } from '../types';

export const MOTION_PRESETS: Record<Exclude<MotionPresetKey, 'custom'>, BarEngineConfig> = {
  cinematic: {
    valueStiffness: 85,  valueDamping: 13,  valueMass: 1.2,
    rankStiffness:  130, rankDamping:  22,  rankMass:  1.0,
    settleThreshold: 0.3,
  },
  smooth: {
    valueStiffness: 140, valueDamping: 22,  valueMass: 1.0,
    rankStiffness:  180, rankDamping:  28,  rankMass:  1.0,
    settleThreshold: 0.3,
  },
  energetic: {
    valueStiffness: 280, valueDamping: 20,  valueMass: 0.8,
    rankStiffness:  320, rankDamping:  26,  rankMass:  0.8,
    settleThreshold: 0.5,
  },
  snappy: {
    valueStiffness: 420, valueDamping: 32,  valueMass: 0.7,
    rankStiffness:  480, rankDamping:  38,  rankMass:  0.7,
    settleThreshold: 0.8,
  },
};

export function resolveEngineConfig(
  preset: MotionPresetKey,
  custom: Partial<BarEngineConfig>,
): BarEngineConfig {
  if (preset === 'custom') {
    return {
      valueStiffness:  custom.valueStiffness  ?? 140,
      valueDamping:    custom.valueDamping    ?? 22,
      valueMass:       custom.valueMass       ?? 1.0,
      rankStiffness:   custom.rankStiffness   ?? 180,
      rankDamping:     custom.rankDamping     ?? 28,
      rankMass:        custom.rankMass        ?? 1.0,
      settleThreshold: custom.settleThreshold ?? 0.3,
    };
  }
  return MOTION_PRESETS[preset];
}
