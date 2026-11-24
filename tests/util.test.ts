import { afterEach, describe, expect, it } from "vitest";
import { LOCALES, setLocale } from "../src/i18n";
import { REPORT_KINDS, VARIANT_COUNT } from "../src/reports/catalog";
import { cardinal, esc, fmtDist, fmtDuration, fmtHour, fmtRate } from "../src/util/format";
import { angDiff, bearing, clamp, lerp, seededRandom } from "../src/util/math";

afterEach(() => setLocale("fr"));

describe("math", () => {
  it("lerp, clamp, bearing", () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(bearing(0, 0, 0, 10)).toBeCloseTo(0);
    expect(bearing(0, 0, 10, 0)).toBeCloseTo(Math.PI / 2);
  });

  it("angDiff takes the short way round", () => {
    expect(angDiff(0.1, 2 * Math.PI - 0.1)).toBeCloseTo(-0.2);
  });

  it("seededRandom is deterministic and in [0, 1)", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe("format", () => {
  it("uses French conventions by default", () => {
    expect(fmtDist(2450)).toBe("2,5 km");
    expect(fmtDist(12400)).toBe("12 km");
    expect(fmtDist(730)).toBe("750 m");
    expect(fmtRate(1.84)).toBe("+1,8");
    expect(fmtRate(-0.6)).toBe("−0,6");
  });

  it("switches to English number formatting", () => {
    setLocale("en");
    expect(fmtDist(2450)).toBe("2.5 km");
    expect(fmtRate(1.84)).toBe("+1.8");
  });

  it("formats hours and durations", () => {
    expect(fmtHour(14.5)).toBe("14:30");
    expect(fmtHour(9.999)).toBe("10:00");
    expect(fmtDuration(1.75)).toBe("1 h 45");
    expect(fmtDuration(0.5)).toBe("30 min");
  });

  it("cardinal points and HTML escaping", () => {
    expect(cardinal(270)).toBe("W");
    expect(cardinal(-45)).toBe("NW");
    expect(esc('<b a="1">&')).toBe("&lt;b a=&quot;1&quot;&gt;&amp;");
  });
});

describe("i18n", () => {
  it("every locale names every report kind with the same number of variants", () => {
    for (const messages of Object.values(LOCALES)) {
      for (const kind of REPORT_KINDS) {
        expect(messages.reports[kind].variants).toHaveLength(VARIANT_COUNT);
        expect(messages.reports[kind].title.length).toBeGreaterThan(0);
      }
    }
  });
});
