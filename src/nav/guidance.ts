/**
 * Turn-by-turn guidance: what the banner shows and what the voice says.
 * Pure functions of the route, the package and the navigation state (no DOM).
 */
import { t } from "../i18n";
import { climbAt } from "../package/queries";
import type { FlightPackage } from "../package/types";
import { fmtAlt, fmtDist, fmtInt, fmtRate } from "../util/format";
import type { NavState } from "./position";
import { isClosedCircuit, type NavRoute } from "./route";

export type Maneuver = "spiral" | "flag" | "finish" | "up";
export type Tone = "sun" | "good" | "warn" | "bad";

export interface Chip {
  text: string;
  tone?: Tone;
}

export interface Instruction {
  maneuver: Maneuver;
  /** Spin the maneuver icon (climbing). */
  spin: boolean;
  /** Small text before the main figure. */
  lead?: string;
  /** Main figure: distance to go or altitude to reach. */
  main: string;
  /** Target name. */
  sub: string;
  chips: Chip[];
  /** Progress of the current segment, 0..1. */
  progress: number;
  /** What comes after the current segment. */
  next?: { maneuver: Maneuver; text: string };
}

/** Distance before the end of a glide at which the voice announces what comes next. */
export const APPROACH_M = 900;

/** Colour of an arrival margin above the ground. */
export const marginTone = (m: number): Tone => (m > 250 ? "good" : m > 140 ? "warn" : "bad");

export function nodeName(pkg: FlightPackage, route: NavRoute, i: number): string {
  const m = t();
  const n = pkg.nodes[i];
  if (i === pkg.takeoff) return m.nodes.launch(fmtAlt(n.z));
  const tp = route.turnpoints.get(i);
  return `${tp ? m.nodes.turnpoint(tp) : ""}${m.nodes.thermal(m.aspects[n.aspect], fmtAlt(n.z))}`;
}

export function instruction(pkg: FlightPackage, route: NavRoute, state: NavState): Instruction {
  const m = t();
  const k = state.segment;
  const s = route.segments[k];
  const { fix } = state;
  let result: Instruction;
  if (s.type === "glide") {
    const remaining = Math.hypot(s.x1 - fix.x, s.y1 - fix.y);
    const last = k === route.segments.length - 1;
    const tp = route.turnpoints.get(s.dst);
    const fast = s.airspeed_kmh > pkg.polar.trim_kmh + 1;
    result = {
      maneuver: last ? "finish" : tp ? "flag" : "spiral",
      spin: false,
      main: fmtDist(remaining),
      sub: last
        ? isClosedCircuit(route.kind)
          ? m.banner.closeTriangle
          : m.banner.endOfFlight
        : nodeName(pkg, route, s.dst),
      chips: [
        { text: fast ? m.banner.speedBar(s.airspeed_kmh) : m.banner.handsUp(s.airspeed_kmh) },
        { text: m.banner.arrival(fmtInt(s.margin_m)), tone: marginTone(s.margin_m) },
      ],
      progress: Math.min(Math.max(1 - remaining / Math.max(s.dist, 1), 0), 1),
    };
  } else {
    result = {
      maneuver: "spiral",
      spin: true,
      lead: m.banner.climbTo,
      main: fmtAlt(s.a1),
      sub: k === 0 ? m.nodes.launchThermal : nodeName(pkg, route, s.node),
      chips: [
        { text: m.banner.rate(fmtRate(s.rate)), tone: "sun" },
        { text: m.banner.toGo(fmtAlt(s.a1 - fix.alt)) },
      ],
      progress: Math.min(Math.max((fix.alt - s.a0) / Math.max(s.a1 - s.a0, 1), 0), 1),
    };
  }
  const nx = route.segments[k + 1];
  if (nx?.type === "climb") {
    result.next = { maneuver: "spiral", text: m.banner.thenClimb(fmtRate(climbAt(pkg, nx.node, s.t1))) };
  } else if (nx?.type === "glide") {
    const tp = route.turnpoints.get(nx.dst);
    result.next = {
      maneuver: tp ? "flag" : "up",
      text: m.banner.thenGlide(fmtDist(nx.dist), tp ? m.banner.toTurnpoint(tp) : m.banner.toThermal),
    };
  }
  return result;
}

/** Voice line when segment `k` starts. */
export function segmentAnnouncement(route: NavRoute, k: number): string {
  const m = t();
  const s = route.segments[k];
  if (s.type === "climb")
    return k === 0 ? m.voice.launchThermal(Math.round(s.a1)) : m.voice.thermal(Math.round(s.a1));
  const tp = route.turnpoints.get(s.dst);
  return m.voice.glide(fmtDist(s.dist), tp ? m.banner.toTurnpoint(tp) : m.banner.toThermal, s.airspeed_kmh);
}

/** Voice line when the end of glide `k` is `APPROACH_M` away. */
export function approachAnnouncement(pkg: FlightPackage, route: NavRoute, k: number, hour: number): string {
  const m = t();
  const s = route.segments[k];
  if (s.type !== "glide") return "";
  if (k === route.segments.length - 1) return m.voice.soonEnd;
  const tp = route.turnpoints.get(s.dst);
  return tp
    ? m.voice.soonTurnpoint(tp)
    : m.voice.soonThermal(fmtRate(climbAt(pkg, s.dst, hour)).replace("+", ""));
}
