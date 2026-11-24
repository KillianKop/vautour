/**
 * Types of the cheminee flight package, version 1.
 * Source of truth: `schema/flight-package.v1.schema.json` (copied from the cheminee repository).
 * Positions: local metric frame of the DEM (x east, y north, metres). Times: local decimal hours.
 */

export const PACKAGE_FORMAT = "cheminee.flight-package";
export const PACKAGE_VERSION = 1;

export type RouteKind = "free" | "triangle" | "fai" | "goal";
export type Aspect = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "flat";
/** [speed km/h, direction the wind comes from, degrees] */
export type Wind = [number, number];

export interface Meta {
  generator: string;
  created: string;
  date?: string | null;
  day_of_year: number;
  utc_offset: number;
  lift_model: string;
  attribution: string[];
}

export interface Extent {
  width: number;
  height: number;
  lon: [number, number];
  lat: [number, number];
}

export interface ThermalNode {
  x: number;
  y: number;
  /** Ground altitude. */
  z: number;
  aspect: Aspect;
  /** Expected climb rate (m/s) at each of `climb_times`. */
  climb: number[];
}

export interface ClimbSegment {
  type: "climb";
  node: number;
  t0: number;
  t1: number;
  a0: number;
  a1: number;
  rate: number;
}

export interface GlideSegment {
  type: "glide";
  src: number;
  dst: number;
  t0: number;
  t1: number;
  a0: number;
  a1: number;
  dist: number;
  gs_kmh: number;
  sink_ms: number;
  airspeed_kmh: number;
  margin_m: number;
}

export type PackageSegment = ClimbSegment | GlideSegment;

export interface Route {
  kind: RouteKind;
  label: string;
  distance_km: number;
  points: number;
  t_start: number;
  t_end: number;
  nodes: number[];
  scoring: number[];
  /** Node index (as a string) -> "B1".."B3" (triangles) or "P1".."P3" (free distance). */
  turnpoints: Record<string, string>;
  segments: PackageSegment[];
}

export interface WeatherEntry {
  t: number;
  ceiling: number;
  base: number;
  wind: Wind;
  wind_aloft: Wind;
}

export interface GraphSlot {
  t0: number;
  t1: number;
  ceiling_m: number;
  wind_kmh: number;
  wind_dir_deg: number;
  /** [i, j, glide_s, loss_m] repeated for each airspeed of `speeds_kmh`; -1 when not feasible. */
  edges: number[][];
  /** [j, glide_s, loss_m] from the launch altitude, trim speed. */
  takeoff_edges: number[][];
}

export interface RoutingGraph {
  speeds_kmh: number[];
  circling_sink_ms: number;
  arrival_margin_m: number;
  clearance_m: number;
  slots: GraphSlot[];
}

export interface FlightPackage {
  format: typeof PACKAGE_FORMAT;
  version: typeof PACKAGE_VERSION;
  meta: Meta;
  extent: Extent;
  terrain: { image: string; px: [number, number] };
  dem: { nx: number; ny: number; data: string };
  lift: { hours: number[]; frames: string[] };
  polar: { trim_kmh: number; min_kmh: number; max_kmh: number };
  takeoff: number;
  nodes: ThermalNode[];
  climb_times: number[];
  routes: Route[];
  weather: WeatherEntry[];
  graph?: RoutingGraph;
}
