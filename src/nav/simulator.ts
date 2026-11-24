/** Time-driven simulation of a flight along the planned route. */
import { lerp } from "../util/math";
import type { NavState, PositionSource } from "./position";
import type { NavRoute } from "./route";

/** Selectable time compressions (simulated seconds per real second). */
export const SIM_SPEEDS = [30, 60, 120, 300] as const;

const CIRCLE_RADIUS_M = 55;
const CIRCLE_PERIOD_S = 3.2; // real seconds per turn on screen, whatever the time compression

export class Simulator implements PositionSource {
  readonly kind = "simulation";
  speed = 60;
  paused = false;
  t = 0;
  private route!: NavRoute;
  private index = 0;
  private phase = 0;

  constructor(route: NavRoute) {
    this.reset(route);
  }

  reset(route: NavRoute, t = route.tStart): void {
    this.route = route;
    this.t = t;
    this.index = 0;
    this.phase = 0;
  }

  /** Jump to local hour `t` (clamped to the flight). */
  seek(t: number): void {
    this.t = Math.min(Math.max(t, this.route.tStart), this.route.tEnd);
  }

  /** Index of the segment active at hour `t`. */
  segmentAt(t: number): number {
    const segs = this.route.segments;
    while (this.index < segs.length - 1 && t >= segs[this.index].t1) this.index++;
    while (this.index > 0 && t < segs[this.index].t0) this.index--;
    return this.index;
  }

  update(dtReal: number, clock: number): NavState {
    const route = this.route;
    if (!this.paused) this.t = Math.min(route.tEnd, this.t + (dtReal * this.speed) / 3600);
    const finished = this.t >= route.tEnd;
    const t = finished ? route.tEnd - 1e-6 : this.t;
    const index = this.segmentAt(t);
    const s = route.segments[index];
    const f = Math.min(Math.max((t - s.t0) / Math.max(s.t1 - s.t0, 1e-9), 0), 1);
    const wobble = Math.sin(clock / 0.38) * 0.25 + Math.sin(clock / 0.91) * 0.15;
    const alt = lerp(s.a0, s.a1, f);
    if (s.type === "glide") {
      const durationS = Math.max((s.t1 - s.t0) * 3600, 1);
      return {
        t: this.t,
        segment: index,
        finished,
        fix: {
          x: lerp(s.x0, s.x1, f),
          y: lerp(s.y0, s.y1, f),
          alt,
          heading: s.bearing,
          vario: -(s.a0 - s.a1) / durationS + wobble,
          groundSpeed: s.gs_kmh + wobble * 3,
        },
      };
    }
    if (!this.paused) this.phase += (dtReal * 2 * Math.PI) / CIRCLE_PERIOD_S;
    return {
      t: this.t,
      segment: index,
      finished,
      fix: {
        x: s.x0 + CIRCLE_RADIUS_M * Math.cos(this.phase),
        y: s.y0 + CIRCLE_RADIUS_M * Math.sin(this.phase),
        alt,
        heading: Math.atan2(-Math.sin(this.phase), Math.cos(this.phase)),
        vario: s.rate + wobble * 0.6 + 0.15,
        groundSpeed: 34 + 6 * Math.sin(this.phase),
      },
    };
  }
}
