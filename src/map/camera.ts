/**
 * Map camera: world (x east, y north, metres) <-> screen (CSS pixels, y down).
 * The map rotates so that `bearing` points up; `anchor` is the screen point showing the
 * camera centre (the glider in navigation), `pan` an extra offset set by the user.
 */
import { angDiff, clamp } from "../util/math";

export interface View {
  cx: number;
  cy: number;
  zoom: number;
  bearing: number;
}

export const MIN_ZOOM = 0.015;
export const MAX_ZOOM = 0.4;

export class Camera {
  /** Pixels per metre. */
  zoom = 0.08;
  bearing = 0;
  cx = 0;
  cy = 0;
  panX = 0;
  panY = 0;
  anchorX = 0;
  anchorY = 0;
  /** Seconds left during which a manual zoom overrides automatic zoom. */
  manual = 0;
  /** Jump to the next target instead of easing towards it. */
  snap = true;

  project(x: number, y: number): [number, number] {
    const b = this.bearing;
    const dx = x - this.cx;
    const dy = y - this.cy;
    return [
      this.anchorX + this.panX + (dx * Math.cos(b) - dy * Math.sin(b)) * this.zoom,
      this.anchorY + this.panY - (dx * Math.sin(b) + dy * Math.cos(b)) * this.zoom,
    ];
  }

  unproject(px: number, py: number): [number, number] {
    const b = this.bearing;
    const u = (px - this.anchorX - this.panX) / this.zoom;
    const v = -(py - this.anchorY - this.panY) / this.zoom;
    return [this.cx + u * Math.cos(b) + v * Math.sin(b), this.cy - u * Math.sin(b) + v * Math.cos(b)];
  }

  /** Ease towards `target` (exponential smoothing over about 0.4 s), or jump if `snap` is set. */
  follow(target: View, dt: number): void {
    let k = 1 - Math.exp(-dt * 2.5);
    if (this.snap) {
      k = 1;
      this.snap = false;
    }
    if (this.manual > 0) this.manual -= dt;
    else this.zoom += (target.zoom - this.zoom) * k;
    this.bearing += angDiff(this.bearing, target.bearing) * k;
    const kc = Math.min(1, k * 3);
    this.cx += (target.cx - this.cx) * kc;
    this.cy += (target.cy - this.cy) * kc;
    if (k === 1) {
      this.bearing = target.bearing;
      if (this.manual <= 0) this.zoom = target.zoom;
    }
  }

  zoomBy(factor: number): void {
    this.zoom = clamp(this.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.manual = 10;
  }

  get panned(): boolean {
    return Math.hypot(this.panX, this.panY) > 20 || this.manual > 0;
  }

  recenter(): void {
    this.panX = 0;
    this.panY = 0;
    this.manual = 0;
  }
}

/** North-up view showing a set of points inside a `w` x `h` box, with a margin in metres. */
export function fitView(points: [number, number][], w: number, h: number, marginM = 600): View {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    zoom: Math.min(w / (x1 - x0 + 2 * marginM), h / (y1 - y0 + 2 * marginM)),
    bearing: 0,
  };
}
