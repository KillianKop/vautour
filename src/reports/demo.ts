/**
 * Demo content: fictitious pilots and reports placed along the route, so that the app
 * shows a lively sky before reports are shared between phones (see ROADMAP.md).
 * Deterministic: the same route always gets the same demo.
 */
import type { NavRoute } from "../nav/route";
import type { Elevation } from "../package/elevation";
import { climbAt } from "../package/queries";
import type { FlightPackage } from "../package/types";
import { lerp, seededRandom } from "../util/math";
import type { ReportKind } from "./catalog";
import type { Report } from "./store";

export const DEMO_PILOTS = [
  { name: "Gégé du 04", color: "#ff6b6b" },
  { name: "La Buse", color: "#10b981" },
  { name: "Jean-Plouf", color: "#f59e0b" },
  { name: "Mamie Cumulus", color: "#ec4899" },
  { name: "Zébulon", color: "#06b6d4" },
  { name: "Le Chamois", color: "#84cc16" },
] as const;

export interface DemoPilot {
  name: string;
  color: string;
  /** Thermal nodes visited in a loop. */
  loop: number[];
  /** Phase offset (s). */
  offset: number;
  /** Ground speed while gliding (m/s). */
  speed: number;
}

export function demoReports(pkg: FlightPackage, route: NavRoute, elevation: Elevation, seed = 11): Report[] {
  const rnd = seededRandom(seed);
  const glides = route.segments.filter((s) => s.type === "glide");
  const climbs = route.segments.filter((s) => s.type === "climb");
  const pick = <T>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)];
  const reports: Report[] = [];
  const add = (kind: ReportKind, variant: number, p: { x: number; y: number }, minutesAgo: number) =>
    reports.push({
      id: `demo-${reports.length}`,
      kind,
      variant,
      x: p.x,
      y: p.y,
      author: pick(DEMO_PILOTS).name,
      minutesAgo,
      alerted: false,
      votes: 0,
    });
  /** Middle of a glide, shifted sideways by `off` metres. */
  const mid = (k: number, off: number) => {
    const g = glides[k];
    return {
      x: (g.x0 + g.x1) / 2 + Math.cos(g.bearing) * off,
      y: (g.y0 + g.y1) / 2 - Math.sin(g.bearing) * off,
    };
  };
  const launch = pkg.nodes[pkg.takeoff];
  add("queue", 1, { x: launch.x + 140, y: launch.y - 90 }, 4);
  if (glides[1]) add("sink", 1, mid(1, 120), 9);
  if (climbs[3]) add("vultures", 0, { x: climbs[3].x0 + 90, y: climbs[3].y0 + 60 }, 17);
  if (glides[5]) add("washer", 0, mid(5, -150), 23);
  if (glides[8]) {
    // cows graze at the bottom of the valley
    const g = mid(8, 0);
    let best = g;
    let lowest = Number.POSITIVE_INFINITY;
    for (let k = 0; k < 60; k++) {
      const p = { x: g.x + (rnd() - 0.5) * 3000, y: g.y + (rnd() - 0.5) * 3000 };
      const z = elevation.at(p.x, p.y);
      if (z < lowest) {
        lowest = z;
        best = p;
      }
    }
    add("cows", 0, best, 41);
  }
  const far = [...route.turnpoints.keys()][1];
  if (far !== undefined) add("jet", 0, { x: pkg.nodes[far].x - 900, y: pkg.nodes[far].y + 700 }, 12);
  if (glides[3]) add("crash", 1, mid(3, 1100), 58);
  const onRoute = new Set(route.nodes);
  const strong = pkg.nodes.map((_, i) => i).filter((i) => !onRoute.has(i) && climbAt(pkg, i, 14) > 1.2);
  if (strong.length) add("boom", 1, pkg.nodes[pick(strong)], 6);
  return reports;
}

export function demoPilots(pkg: FlightPackage, route: NavRoute, seed = 29): DemoPilot[] {
  const rnd = seededRandom(seed);
  const starts = route.nodes.slice(1);
  return DEMO_PILOTS.map(({ name, color }) => {
    const loop = [starts[Math.floor(rnd() * starts.length)]];
    for (let j = 0; j < 3; j++) {
      const p = pkg.nodes[loop[loop.length - 1]];
      const near = pkg.nodes
        .map((n, i) => [Math.hypot(n.x - p.x, n.y - p.y), i] as const)
        .filter(([d, i]) => d > 1500 && d < 5000 && !loop.includes(i))
        .sort((a, b) => a[0] - b[0]);
      if (near.length) loop.push(near[Math.floor(rnd() * Math.min(4, near.length))][1]);
    }
    return { name, color, loop, offset: rnd() * 3000, speed: 8 + rnd() * 3 };
  });
}

const CLIMB_S = 200;
const TURN_S = 30;
const RADIUS_M = 70;

/** Position and heading of a demo pilot at `seconds` (local time in seconds). */
export function pilotPosition(
  pkg: FlightPackage,
  p: DemoPilot,
  seconds: number,
): { x: number; y: number; heading: number } {
  const legs = p.loop.map((a, k) => {
    const b = p.loop[(k + 1) % p.loop.length];
    const d = Math.hypot(pkg.nodes[b].x - pkg.nodes[a].x, pkg.nodes[b].y - pkg.nodes[a].y);
    return { a, b, glide: Math.max(d / p.speed, 1) };
  });
  const period = legs.reduce((s, l) => s + CLIMB_S + l.glide, 0);
  let t = (((seconds + p.offset) % period) + period) % period;
  for (const leg of legs) {
    const A = pkg.nodes[leg.a];
    const B = pkg.nodes[leg.b];
    if (t < CLIMB_S) {
      const ph = (t / TURN_S) * 2 * Math.PI;
      return {
        x: A.x + RADIUS_M * Math.cos(ph),
        y: A.y + RADIUS_M * Math.sin(ph),
        heading: Math.atan2(-Math.sin(ph), Math.cos(ph)),
      };
    }
    t -= CLIMB_S;
    if (t < leg.glide) {
      const f = t / leg.glide;
      return { x: lerp(A.x, B.x, f), y: lerp(A.y, B.y, f), heading: Math.atan2(B.x - A.x, B.y - A.y) };
    }
    t -= leg.glide;
  }
  const A = pkg.nodes[p.loop[0]];
  return { x: A.x, y: A.y, heading: 0 };
}
