import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "../src/i18n";
import { Camera, fitView } from "../src/map/camera";
import {
  approachAnnouncement,
  instruction,
  marginTone,
  nodeName,
  segmentAnnouncement,
} from "../src/nav/guidance";
import { flownDistance, isClosedCircuit, prepareRoute } from "../src/nav/route";
import { Simulator } from "../src/nav/simulator";
import { samplePackage } from "./fixtures";

const pkg = samplePackage();
const routes = pkg.routes.map((r) => prepareRoute(pkg, r));
afterEach(() => setLocale("fr"));

describe("prepareRoute", () => {
  it("builds the flown path and cumulated distances", () => {
    for (const route of routes) {
      const glides = route.segments.filter((s) => s.type === "glide");
      expect(route.path).toHaveLength(glides.length + 1);
      expect(route.total).toBeCloseTo(
        glides.reduce((sum, g) => sum + g.dist, 0),
        0,
      );
      const last = route.segments[route.segments.length - 1];
      expect(flownDistance(route, route.segments.length - 1, last.x1, last.y1)).toBeCloseTo(route.total, 0);
    }
  });

  it("gives every climb the bearing of the following glide", () => {
    const r = routes[0];
    r.segments.forEach((s, k) => {
      const next = r.segments[k + 1];
      if (s.type === "climb" && next?.type === "glide") expect(s.bearing).toBe(next.bearing);
    });
  });

  it("labels the three turnpoints of a triangle", () => {
    const tri = routes.find((r) => isClosedCircuit(r.kind));
    expect(tri).toBeDefined();
    expect([...tri!.turnpoints.values()].sort()).toEqual(["B1", "B2", "B3"]);
  });
});

describe("Simulator", () => {
  it("flies the whole route continuously and finishes", () => {
    const route = routes[0];
    const sim = new Simulator(route);
    sim.speed = 300;
    let prev = sim.update(0, 0);
    let maxJump = 0;
    let steps = 0;
    while (!prev.finished && steps < 100000) {
      const s = sim.update(0.05, steps * 0.05);
      expect(s.segment).toBeGreaterThanOrEqual(prev.segment);
      maxJump = Math.max(maxJump, Math.hypot(s.fix.x - prev.fix.x, s.fix.y - prev.fix.y));
      prev = s;
      steps++;
    }
    expect(prev.finished).toBe(true);
    expect(prev.t).toBeCloseTo(route.tEnd);
    // 0.05 s x 300 = 15 s of flight per step: never more than a few hundred metres (incl. entering a circle)
    expect(maxJump).toBeLessThan(400);
  });

  it("does not move while paused and climbs during a climb segment", () => {
    const route = routes[0];
    const sim = new Simulator(route);
    const climb = route.segments.find((s) => s.type === "climb")!;
    sim.seek((climb.t0 + climb.t1) / 2);
    sim.paused = true;
    const a = sim.update(1, 0);
    const b = sim.update(1, 1);
    expect(b.t).toBe(a.t);
    expect(a.fix.alt).toBeGreaterThan(climb.a0);
    expect(a.fix.alt).toBeLessThan(climb.a1);
  });
});

describe("guidance", () => {
  const route = routes[0];
  const sim = new Simulator(route);
  const glideIndex = route.segments.findIndex((s) => s.type === "glide" && s.dist > 2000);
  const glide = route.segments[glideIndex];

  it("describes a glide: distance to go, speed to fly, arrival margin", () => {
    sim.seek(glide.t0 + (glide.t1 - glide.t0) * 0.25);
    const state = sim.update(0, 0);
    const ins = instruction(pkg, route, state);
    expect(ins.maneuver).not.toBe("up");
    expect(ins.main).toMatch(/km|m$/);
    expect(ins.chips).toHaveLength(2);
    expect(ins.chips[1].tone).toBe(glide.type === "glide" ? marginTone(glide.margin_m) : undefined);
    expect(ins.progress).toBeGreaterThan(0.15);
    expect(ins.progress).toBeLessThan(0.35);
  });

  it("describes a climb with a target altitude, in French then in English", () => {
    const climb = route.segments.find((s) => s.type === "climb")!;
    sim.seek((climb.t0 + climb.t1) / 2);
    const state = sim.update(0, 0);
    const fr = instruction(pkg, route, state);
    expect(fr.spin).toBe(true);
    expect(fr.lead).toBe("Enroule jusqu'à");
    setLocale("en");
    expect(instruction(pkg, route, state).lead).toBe("Climb to");
  });

  it("announces segments and approaches", () => {
    expect(segmentAnnouncement(route, 0)).toMatch(/Enroule/);
    expect(approachAnnouncement(pkg, route, glideIndex, glide.t1)).toMatch(/900 mètres/);
    expect(nodeName(pkg, route, pkg.takeoff)).toMatch(/^Déco/);
  });

  it("colours arrival margins", () => {
    expect(marginTone(400)).toBe("good");
    expect(marginTone(200)).toBe("warn");
    expect(marginTone(100)).toBe("bad");
  });
});

describe("Camera", () => {
  it("unproject inverts project for any bearing and pan", () => {
    const cam = new Camera();
    Object.assign(cam, {
      zoom: 0.07,
      bearing: 1.1,
      cx: 5000,
      cy: 7000,
      panX: 12,
      panY: -30,
      anchorX: 195,
      anchorY: 540,
    });
    for (const [x, y] of [
      [5000, 7000],
      [6200, 6400],
      [100, 17000],
    ]) {
      const [px, py] = cam.project(x, y);
      const [bx, by] = cam.unproject(px, py);
      expect(bx).toBeCloseTo(x, 6);
      expect(by).toBeCloseTo(y, 6);
    }
  });

  it("puts the bearing up on screen", () => {
    const cam = new Camera();
    Object.assign(cam, { zoom: 0.1, bearing: Math.PI / 2, cx: 0, cy: 0, anchorX: 0, anchorY: 0 });
    const [px, py] = cam.project(1000, 0); // 1 km east, bearing east: straight up
    expect(px).toBeCloseTo(0, 6);
    expect(py).toBeCloseTo(-100, 6);
  });

  it("fitView keeps every point inside the box", () => {
    const pts: [number, number][] = routes[0].path;
    const v = fitView(pts, 360, 400);
    for (const [x, y] of pts) {
      expect(Math.abs(x - v.cx) * v.zoom).toBeLessThanOrEqual(180 + 1e-6);
      expect(Math.abs(y - v.cy) * v.zoom).toBeLessThanOrEqual(200 + 1e-6);
    }
  });
});
