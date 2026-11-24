/** Elevation grid of the package: heights above ground and terrain queries. */
import { clamp, lerp } from "../util/math";
import type { FlightPackage } from "./types";

export function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export class Elevation {
  constructor(
    readonly z: Int16Array,
    readonly nx: number,
    readonly ny: number,
    readonly width: number,
    readonly height: number,
  ) {
    if (z.length !== nx * ny) throw new Error(`Elevation grid: ${z.length} values for ${nx} x ${ny} cells`);
  }

  static fromPackage(pkg: FlightPackage): Elevation {
    const bytes = decodeBase64(pkg.dem.data);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const z = new Int16Array(bytes.byteLength / 2);
    for (let i = 0; i < z.length; i++) z[i] = view.getInt16(2 * i, true); // little endian
    return new Elevation(z, pkg.dem.nx, pkg.dem.ny, pkg.extent.width, pkg.extent.height);
  }

  /** Ground altitude (m) at metric coordinates, bilinear, clamped to the grid. Row 0 is the north edge. */
  at(x: number, y: number): number {
    const c = clamp((x / this.width) * this.nx - 0.5, 0, this.nx - 1);
    const r = clamp(((this.height - y) / this.height) * this.ny - 0.5, 0, this.ny - 1);
    const c0 = Math.min(Math.floor(c), this.nx - 2);
    const r0 = Math.min(Math.floor(r), this.ny - 2);
    const fc = c - c0;
    const fr = r - r0;
    const n = this.nx;
    const z = this.z;
    const top = lerp(z[r0 * n + c0], z[r0 * n + c0 + 1], fc);
    const bottom = lerp(z[(r0 + 1) * n + c0], z[(r0 + 1) * n + c0 + 1], fc);
    return lerp(top, bottom, fr);
  }
}
