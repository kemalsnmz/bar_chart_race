import type { SpringState, SpringConfig } from '../types';

export function stepSpringRK4(state: SpringState, target: number, dt: number, cfg: SpringConfig): SpringState {
  const clampedDt = Math.min(dt, 1 / 30);
  const f = (pos: number, vel: number) => ({
    dpos: vel,
    dvel: (cfg.stiffness * (target - pos) - cfg.damping * vel) / cfg.mass,
  });
  const k1 = f(state.pos, state.vel);
  const k2 = f(state.pos + k1.dpos * clampedDt / 2, state.vel + k1.dvel * clampedDt / 2);
  const k3 = f(state.pos + k2.dpos * clampedDt / 2, state.vel + k2.dvel * clampedDt / 2);
  const k4 = f(state.pos + k3.dpos * clampedDt, state.vel + k3.dvel * clampedDt);
  return {
    pos: state.pos + (clampedDt / 6) * (k1.dpos + 2 * k2.dpos + 2 * k3.dpos + k4.dpos),
    vel: state.vel + (clampedDt / 6) * (k1.dvel + 2 * k2.dvel + 2 * k3.dvel + k4.dvel),
  };
}

export function settleSpring(state: SpringState, target: number, threshold: number): SpringState {
  if (Math.abs(state.pos - target) < threshold && Math.abs(state.vel) < threshold) {
    return { pos: target, vel: 0 };
  }
  return state;
}
