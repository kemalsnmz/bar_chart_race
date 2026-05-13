export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface SpringState {
  pos: number;
  vel: number;
}

export interface BarEngineConfig {
  // Value (width) spring config
  valueStiffness: number;
  valueDamping: number;
  valueMass: number;
  // Rank (Y position) spring config — usually higher damping, no overshoot
  rankStiffness: number;
  rankDamping: number;
  rankMass: number;
  // Settle threshold — snap to target when very close (reduces jitter)
  settleThreshold: number;
}

export interface BarEngineState {
  val:  Map<string, SpringState>;
  rank: Map<string, SpringState>;
}

export type MotionPresetKey = 'cinematic' | 'smooth' | 'energetic' | 'snappy' | 'custom';
