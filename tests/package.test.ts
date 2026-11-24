import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { Elevation } from "../src/package/elevation";
import { checkPackage, PackageError } from "../src/package/load";
import { climbAt, weatherAt } from "../src/package/queries";
import { packageSchema, samplePackage } from "./fixtures";

describe("flight package", () => {
  const pkg = samplePackage();

  it("matches the shared JSON schema", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(packageSchema());
    const ok = validate(pkg);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });

  it("is accepted by checkPackage, and other versions are refused", () => {
    expect(() => checkPackage(pkg)).not.toThrow();
    expect(() => checkPackage({ ...pkg, version: 2 })).toThrow(PackageError);
    expect(() => checkPackage({ format: "something-else" })).toThrow(/Not a flight package/);
  });

  it("ships the attribution notices that must be shown", () => {
    expect(pkg.meta.attribution.some((a) => a.includes("Copernicus"))).toBe(true);
  });

  it("interpolates climb rates and picks the closest weather entry", () => {
    const [t0, t1] = pkg.climb_times;
    const [c0, c1] = pkg.nodes[0].climb;
    expect(climbAt(pkg, 0, (t0 + t1) / 2)).toBeCloseTo((c0 + c1) / 2, 6);
    expect(climbAt(pkg, 0, 0)).toBe(c0);
    expect(weatherAt(pkg, pkg.weather[2].t + 0.1)).toBe(pkg.weather[2]);
  });
});

describe("Elevation", () => {
  it("decodes the package grid and returns ground altitudes inside the DEM range", () => {
    const pkg = samplePackage();
    const elevation = Elevation.fromPackage(pkg);
    expect(elevation.z.length).toBe(pkg.dem.nx * pkg.dem.ny);
    const launch = pkg.nodes[pkg.takeoff];
    expect(Math.abs(elevation.at(launch.x, launch.y) - launch.z)).toBeLessThan(60);
  });

  it("is exact at cell centres and bilinear between them", () => {
    // 2 x 2 grid over a 200 m x 200 m map, first row at the north edge
    const e = new Elevation(Int16Array.from([100, 200, 300, 400]), 2, 2, 200, 200);
    expect(e.at(50, 150)).toBeCloseTo(100);
    expect(e.at(150, 150)).toBeCloseTo(200);
    expect(e.at(50, 50)).toBeCloseTo(300);
    expect(e.at(100, 100)).toBeCloseTo(250);
  });
});
