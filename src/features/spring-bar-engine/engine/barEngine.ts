import type { BarEngineConfig, BarEngineState, SpringState } from '../types';
import { stepSpringRK4, settleSpring } from '../physics/springRK4';

function initSpring(pos: number): SpringState { return { pos, vel: 0 }; }

// Stable sort: same-value entities keep their previous rank order
function stableRankTargets(
  valMap: Map<string, SpringState>,
  prevRankMap: Map<string, number>,
): Map<string, number> {
  const entries = [...valMap.entries()];
  entries.sort((a, b) => {
    const diff = b[1].pos - a[1].pos;
    if (Math.abs(diff) > 0.01) return diff;
    // tie-break by previous rank (stable)
    return (prevRankMap.get(a[0]) ?? 999) - (prevRankMap.get(b[0]) ?? 999);
  });
  return new Map(entries.map(([name], i) => [name, i]));
}

export function stepBarEngine(
  state: BarEngineState,
  targetValues: Map<string, number>,
  dtSec: number,
  cfg: BarEngineConfig,
): BarEngineState {
  const valCfg  = { stiffness: cfg.valueStiffness, damping: cfg.valueDamping, mass: cfg.valueMass };
  const rankCfg = { stiffness: cfg.rankStiffness,  damping: cfg.rankDamping,  mass: cfg.rankMass };

  // Ensure all entities have spring state
  for (const [name, target] of targetValues) {
    if (!state.val.has(name))  state.val.set(name,  initSpring(target));
    if (!state.rank.has(name)) state.rank.set(name, initSpring(0));
  }

  // Step value springs (bar widths)
  const newVal = new Map<string, SpringState>();
  for (const [name, s] of state.val) {
    const target = targetValues.get(name) ?? 0;
    const stepped = stepSpringRK4(s, target, dtSec, valCfg);
    newVal.set(name, settleSpring(stepped, target, cfg.settleThreshold));
  }

  // Derive stable rank targets from current value spring positions
  const prevRankMap = new Map([...state.rank.entries()].map(([n, s]) => [n, Math.round(s.pos)]));
  const rankTargets = stableRankTargets(newVal, prevRankMap);

  // Step rank springs (bar Y positions)
  const newRank = new Map<string, SpringState>();
  for (const [name, s] of state.rank) {
    const target = rankTargets.get(name) ?? s.pos;
    const stepped = stepSpringRK4(s, target, dtSec, rankCfg);
    newRank.set(name, settleSpring(stepped, target, cfg.settleThreshold));
  }

  return { val: newVal, rank: newRank };
}

export function createBarEngineState(): BarEngineState {
  return { val: new Map(), rank: new Map() };
}
