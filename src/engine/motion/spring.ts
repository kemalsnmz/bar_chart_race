export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface SpringState {
  pos: number;
  vel: number;
}

export const motionPresets = {
  smooth:    { stiffness: 150, damping: 24,  mass: 1.0 },
  cinematic: { stiffness: 80,  damping: 14,  mass: 1.2 },
  energetic: { stiffness: 300, damping: 22,  mass: 0.8 },
} satisfies Record<string, SpringConfig>;

export type MotionPreset = keyof typeof motionPresets;

// Semi-implicit Euler integration — stable for typical spring configs
export function stepSpring(
  state: SpringState,
  target: number,
  dtSec: number,
  cfg: SpringConfig,
): SpringState {
  const dt = Math.min(dtSec, 1 / 20); // cap to prevent instability on slow frames
  const accel = (cfg.stiffness * (target - state.pos) - cfg.damping * state.vel) / cfg.mass;
  const vel = state.vel + accel * dt;
  const pos = state.pos + vel * dt;
  return { pos, vel };
}

export function isSettled(state: SpringState, target: number, tol = 0.5): boolean {
  return Math.abs(state.pos - target) < tol && Math.abs(state.vel) < tol;
}

export function createSpring(initialPos: number): SpringState {
  return { pos: initialPos, vel: 0 };
}

export interface BarSpringBundle {
  val:  Map<string, SpringState>; // displayed value (bar width)
  rank: Map<string, SpringState>; // displayed rank position (bar Y)
}

export function createBarSpringBundle(): BarSpringBundle {
  return { val: new Map(), rank: new Map() };
}

// Step all springs in a bundle toward their targets.
// Returns the sorted entity order (for overtake detection).
export function stepBarSprings(
  bundle: BarSpringBundle,
  targetValues: Map<string, number>,
  dtSec: number,
  cfg: SpringConfig,
  rankCfg?: SpringConfig,
): string[] {
  // Initialize missing entities at their target values (no pop-in)
  for (const [name, target] of targetValues) {
    if (!bundle.val.has(name)) bundle.val.set(name, createSpring(target));
    if (!bundle.rank.has(name)) bundle.rank.set(name, createSpring(0));
  }

  // Step value springs (bar width)
  for (const [name, state] of bundle.val) {
    const target = targetValues.get(name) ?? 0;
    bundle.val.set(name, stepSpring(state, target, dtSec, cfg));
  }

  // Derive integer target ranks from current spring values (bar vertical order)
  const sorted = [...bundle.val.entries()]
    .sort((a, b) => b[1].pos - a[1].pos)
    .map(([name]) => name);

  const rankTargets = new Map(sorted.map((name, i) => [name, i]));  
  // Soft rank spring config (very smooth)
  const rankConfig: SpringConfig = rankCfg ?? { stiffness: cfg.stiffness * 0.02, damping: cfg.damping * 3.0, mass: cfg.mass };
  

  // Step rank springs toward their integer rank targets
  for (const [name, state] of bundle.rank) {
    const target = rankTargets.get(name) ?? state.pos;
    bundle.rank.set(name, stepSpring(state, target, dtSec, rankConfig));
  }

  return sorted;
}

// Line chart: per-series Y-value springs + a spring for the Y-axis max
export interface LineSpringBundle {
  val:   Map<string, SpringState>; // Y value for each series at current time
  yMax:  SpringState;              // Y-axis upper bound
}

export function createLineSpringBundle(initialYMax = 0): LineSpringBundle {
  return { val: new Map(), yMax: createSpring(initialYMax) };
}

export function stepLineSprings(
  bundle: LineSpringBundle,
  targetValues: Map<string, number>,
  targetYMax: number,
  dtSec: number,
  cfg: SpringConfig,
): void {
  for (const [name, target] of targetValues) {
    if (!bundle.val.has(name)) bundle.val.set(name, createSpring(target));
    const state = bundle.val.get(name)!;
    bundle.val.set(name, stepSpring(state, target, dtSec, cfg));
  }
  bundle.yMax = stepSpring(bundle.yMax, targetYMax, dtSec, cfg);
}
