import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { FlightPackage } from "../src/package/types";

const root = fileURLToPath(new URL("..", import.meta.url));

/** The sample flight package served by the app (public/flight.json). */
export const samplePackage = (): FlightPackage =>
  JSON.parse(readFileSync(`${root}public/flight.json`, "utf-8")) as FlightPackage;

export const packageSchema = (): object =>
  JSON.parse(readFileSync(`${root}schema/flight-package.v1.schema.json`, "utf-8")) as object;
