/** A package route prepared for navigation: geometry, bearings and cumulated distances per segment. */
import type { ClimbSegment, FlightPackage, GlideSegment, Route, RouteKind } from "../package/types";
import { bearing } from "../util/math";

interface Geometry {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Track of the glide, or of the next glide while climbing (radians clockwise from north). */
  bearing: number;
  /** Horizontal distance flown before this segment (m). */
  cum0: number;
}

export type NavClimb = ClimbSegment & Geometry;
export type NavGlide = GlideSegment & Geometry;
export type NavSegment = NavClimb | NavGlide;

export interface NavRoute {
  kind: RouteKind;
  distanceKm: number;
  points: number;
  tStart: number;
  tEnd: number;
  nodes: number[];
  scoring: number[];
  /** Turnpoint labels by node index. */
  turnpoints: Map<number, string>;
  segments: NavSegment[];
  /** Horizontal length of the flown path (m). */
  total: number;
  /** Last node of the flight. */
  endNode: number;
  /** Polyline of the flown path: launch, then each glide end. */
  path: [number, number][];
}

export const isClosedCircuit = (kind: RouteKind): boolean => kind === "triangle" || kind === "fai";

export function prepareRoute(pkg: FlightPackage, route: Route): NavRoute {
  let cum = 0;
  const segments: NavSegment[] = route.segments.map((s) => {
    if (s.type === "glide") {
      const a = pkg.nodes[s.src];
      const b = pkg.nodes[s.dst];
      const g: NavGlide = {
        ...s,
        x0: a.x,
        y0: a.y,
        x1: b.x,
        y1: b.y,
        bearing: bearing(a.x, a.y, b.x, b.y),
        cum0: cum,
      };
      cum += s.dist;
      return g;
    }
    const n = pkg.nodes[s.node];
    return { ...s, x0: n.x, y0: n.y, x1: n.x, y1: n.y, bearing: 0, cum0: cum };
  });
  segments.forEach((s, k) => {
    if (s.type !== "climb") return;
    const next = segments.slice(k + 1).find((q) => q.type === "glide");
    const prev = segments
      .slice(0, k)
      .reverse()
      .find((q) => q.type === "glide");
    s.bearing = (next ?? prev)?.bearing ?? 0;
  });
  const last = segments[segments.length - 1];
  const path: [number, number][] = [[segments[0].x0, segments[0].y0]];
  for (const s of segments) if (s.type === "glide") path.push([s.x1, s.y1]);
  return {
    kind: route.kind,
    distanceKm: route.distance_km,
    points: route.points,
    tStart: route.t_start,
    tEnd: route.t_end,
    nodes: route.nodes,
    scoring: route.scoring,
    turnpoints: new Map(Object.entries(route.turnpoints).map(([k, v]) => [Number(k), v])),
    segments,
    total: cum,
    endNode: last.type === "glide" ? last.dst : last.node,
    path,
  };
}

/** Horizontal distance flown (m) at a position inside segment `index`. */
export function flownDistance(route: NavRoute, index: number, x: number, y: number): number {
  const s = route.segments[index];
  return s.type === "glide" ? s.cum0 + Math.hypot(x - s.x0, y - s.y0) : s.cum0;
}

/** Number of climbs in the route. */
export const climbCount = (route: NavRoute): number =>
  route.segments.filter((s) => s.type === "climb").length;
