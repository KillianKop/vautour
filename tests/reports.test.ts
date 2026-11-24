import { describe, expect, it } from "vitest";
import { liftColor } from "../src/map/lift";
import { prepareRoute } from "../src/nav/route";
import { Elevation } from "../src/package/elevation";
import { REPORT_KINDS, reportIcon } from "../src/reports/catalog";
import { demoPilots, demoReports, pilotPosition } from "../src/reports/demo";
import { ReportStore } from "../src/reports/store";
import { samplePackage } from "./fixtures";

describe("report catalogue", () => {
  it("has an SVG icon for every kind", () => {
    for (const kind of REPORT_KINDS)
      expect(reportIcon(kind)).toMatch(/^<svg viewBox="0 0 64 64"[\s\S]*<\/svg>$/);
  });
});

describe("ReportStore", () => {
  const other = (x: number, y: number) => ({
    id: `o${x}`,
    kind: "sink" as const,
    variant: 0,
    x,
    y,
    author: "La Buse",
    minutesAgo: 3,
    alerted: false,
    votes: 0,
  });

  it("alerts once for a report ahead, never for one behind", () => {
    const store = new ReportStore([other(0, 500), other(0, -600)]);
    const first = store.nextAlert(0, 0, 0); // flying north
    expect(first?.y).toBe(500);
    expect(store.nextAlert(0, 0, 0)).toBeNull();
    store.rearm();
    expect(store.nextAlert(0, 0, 0)?.y).toBe(500);
  });

  it("never alerts on the pilot's own reports", () => {
    const store = new ReportStore();
    store.add("cows", 1, 0, 100);
    store.rearm();
    expect(store.nextAlert(0, 0, 0)).toBeNull();
    expect(store.items[0].author).toBeNull();
  });
});

describe("demo content", () => {
  const pkg = samplePackage();
  const route = prepareRoute(pkg, pkg.routes[0]);
  const elevation = Elevation.fromPackage(pkg);

  it("is deterministic", () => {
    expect(demoReports(pkg, route, elevation)).toEqual(demoReports(pkg, route, elevation));
    expect(demoPilots(pkg, route)).toEqual(demoPilots(pkg, route));
  });

  it("places pilots at finite positions all day long", () => {
    for (const p of demoPilots(pkg, route)) {
      for (let s = 11 * 3600; s < 18 * 3600; s += 997) {
        const pos = pilotPosition(pkg, p, s);
        expect(Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.heading)).toBe(true);
      }
    }
  });
});

describe("lift overlay colours", () => {
  it("is transparent for weak lift and opaque-ish for strong lift", () => {
    expect(liftColor(0.1)[3]).toBe(0);
    expect(liftColor(0.9)[3]).toBeGreaterThan(150);
  });
});
