/** Time-dependent lookups in the package (climb rates, weather). */
import { lerp } from "../util/math";
import type { FlightPackage, WeatherEntry } from "./types";

/** Expected climb rate (m/s) of a thermal node at local hour `t`, linear between quarter hours. */
export function climbAt(pkg: FlightPackage, node: number, t: number): number {
  const ts = pkg.climb_times;
  const climb = pkg.nodes[node].climb;
  if (t <= ts[0]) return climb[0];
  for (let k = 1; k < ts.length; k++) {
    if (t <= ts[k]) return lerp(climb[k - 1], climb[k], (t - ts[k - 1]) / (ts[k] - ts[k - 1]));
  }
  return climb[climb.length - 1];
}

/** Weather entry closest in time to local hour `t`. */
export function weatherAt(pkg: FlightPackage, t: number): WeatherEntry {
  let best = pkg.weather[0];
  for (const entry of pkg.weather) if (Math.abs(entry.t - t) < Math.abs(best.t - t)) best = entry;
  return best;
}
