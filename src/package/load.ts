/** Loading and sanity checks of a flight package. */
import { type FlightPackage, PACKAGE_FORMAT, PACKAGE_VERSION } from "./types";

export class PackageError extends Error {}

/** Throw a `PackageError` unless `data` looks like a flight package this app can read. */
export function checkPackage(data: unknown): asserts data is FlightPackage {
  const pkg = data as Partial<FlightPackage> | null;
  if (!pkg || pkg.format !== PACKAGE_FORMAT) {
    throw new PackageError(`Not a flight package (expected format "${PACKAGE_FORMAT}")`);
  }
  if (pkg.version !== PACKAGE_VERSION) {
    throw new PackageError(
      `Unsupported flight package version ${pkg.version}; this app reads version ${PACKAGE_VERSION}`,
    );
  }
  if (!pkg.routes?.length || !pkg.nodes?.length) {
    throw new PackageError("The flight package has no route or no thermal node");
  }
}

/** Fetch and check a flight package (default: `flight.json` next to the page). */
export async function loadPackage(url = "flight.json"): Promise<FlightPackage> {
  const res = await fetch(url);
  if (!res.ok) throw new PackageError(`HTTP ${res.status} while loading ${url}`);
  const data: unknown = await res.json();
  checkPackage(data);
  return data;
}
