/** Locale-aware formatting of the numbers shown to the pilot. */
import { numberLocale } from "../i18n";

const pad = (n: number): string => String(n).padStart(2, "0");

export const fmtInt = (n: number): string => Math.round(n).toLocaleString(numberLocale());

export const fmt1 = (n: number): string =>
  n.toLocaleString(numberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Metres above 1 km are shown in km (one decimal below 10 km), below 1 km rounded to 50 m. */
export function fmtDist(m: number): string {
  if (m >= 1000) {
    return `${(m / 1000).toLocaleString(numberLocale(), { maximumFractionDigits: m < 10000 ? 1 : 0 })} km`;
  }
  return `${Math.max(0, Math.round(m / 50) * 50)} m`;
}

/** Altitude with thousands separator and unit, e.g. "1 220 m". */
export const fmtAlt = (m: number): string => `${fmtInt(m)} m`;

/** Decimal hours to "HH:MM". */
export function fmtHour(h: number): string {
  const m = Math.round(h * 60);
  return `${pad(Math.floor(m / 60))}:${pad(((m % 60) + 60) % 60)}`;
}

/** Decimal hours to "1 h 05" or "42 min". */
export function fmtDuration(h: number): string {
  const m = Math.max(0, Math.round(h * 60));
  return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)}` : `${m} min`;
}

/** Vertical speed with an explicit sign, e.g. "+1.8" or "−0.6". */
export const fmtRate = (r: number): string => `${r >= 0 ? "+" : "−"}${fmt1(Math.abs(r))}`;

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type Cardinal = (typeof CARDINALS)[number];

/** Compass point (English letters, translate with `t().aspects`) of a direction in degrees. */
export const cardinal = (deg: number): Cardinal =>
  CARDINALS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/** Escape text before inserting it into HTML. */
export const esc = (v: unknown): string =>
  String(v).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
