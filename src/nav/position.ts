/**
 * Where the pilot is. The app only talks to a `PositionSource`: today the `Simulator`,
 * tomorrow a GPS source (see ROADMAP.md) that will have to match fixes to the route.
 */
import type { NavRoute } from "./route";

export interface Fix {
  x: number;
  y: number;
  /** Altitude above sea level (m). */
  alt: number;
  /** Track, radians clockwise from north. */
  heading: number;
  /** Vertical speed (m/s, positive up). */
  vario: number;
  /** Ground speed (km/h). */
  groundSpeed: number;
}

export interface NavState {
  /** Local decimal hour. */
  t: number;
  /** Index of the active segment of the route. */
  segment: number;
  fix: Fix;
  finished: boolean;
}

export interface PositionSource {
  readonly kind: "simulation" | "gps";
  /** Start following a (new) route. */
  reset(route: NavRoute): void;
  /** Advance by `dtReal` seconds of wall-clock time; `clock` is a wall-clock time in seconds (for cosmetic noise). */
  update(dtReal: number, clock: number): NavState;
}
