export function interpolate(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
