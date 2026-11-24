/** Small numeric helpers shared by the whole app. */

export const lerp = (a: number, b: number, f: number): number => a + (b - a) * f;

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Signed smallest rotation from angle `a` to angle `b`, radians, in [-π, π]. */
export const angDiff = (a: number, b: number): number => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Bearing from (x0, y0) to (x1, y1), radians clockwise from north (x east, y north). */
export const bearing = (x0: number, y0: number, x1: number, y1: number): number =>
  Math.atan2(x1 - x0, y1 - y0);

/** Park–Miller "minimal standard" generator: same seed, same demo content on every device. */
export function seededRandom(seed: number): () => number {
  let s = Math.abs(Math.floor(seed)) % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
