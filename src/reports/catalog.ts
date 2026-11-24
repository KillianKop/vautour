/**
 * Report categories ("hazards") and their icons. Labels live in the i18n files
 * (`t().reports[kind]`), icons are original SVG drawings on a 64 x 64 grid.
 */

export const REPORT_KINDS = [
  "crash",
  "plouf",
  "sink",
  "boom",
  "washer",
  "vultures",
  "cows",
  "queue",
  "jet",
] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** Number of variants offered for every category (must match the i18n files). */
export const VARIANT_COUNT = 3;

export const REPORT_COLORS: Record<ReportKind, string> = {
  crash: "#ff5a6e",
  plouf: "#3aa0ff",
  sink: "#8a5cf6",
  boom: "#ff9f1c",
  washer: "#16b3a5",
  vultures: "#8d6e63",
  cows: "#4cae4f",
  queue: "#f2b705",
  jet: "#3d4b63",
};

const WHITE = 'fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"';

const rays = (cx: number, cy: number, r0: number, r1: number, n = 8): string =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n;
    const p = (r: number) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
    return `M${p(r0)}L${p(r1)}`;
  }).join("");

/** Coloured disc with a shadow plane and a light edge. */
const disc = (c: string): string =>
  `<circle cx="32" cy="32" r="30" fill="${c}"/><path d="M2 32a30 30 0 0 0 60 0z" fill="#000" opacity=".09"/>` +
  `<path d="M9 21a26 26 0 0 1 46 0" fill="none" stroke="#fff" stroke-width="2.5" opacity=".35" stroke-linecap="round"/>`;

const GLYPHS: Record<ReportKind, (c: string) => string> = {
  crash: () =>
    `<g transform="rotate(-28 32 34)"><path d="M12 30Q32 10 52 30" ${WHITE} stroke-width="7"/>` +
    `<path d="M14 31L30 47M50 31L34 47" ${WHITE} stroke-width="2.4"/><circle cx="32" cy="50" r="5" fill="#fff"/></g>` +
    `<path d="M47 43l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM15 11l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#fff"/>`,
  plouf: (c) =>
    `<path d="M32 9C32 9 21 24 21 31a11 11 0 0 0 22 0C43 24 32 9 32 9z" fill="#fff"/>` +
    `<circle cx="28" cy="31" r="1.9" fill="${c}"/><circle cx="36" cy="31" r="1.9" fill="${c}"/>` +
    `<path d="M28 37q4-3 8 0" ${WHITE} stroke="${c}" stroke-width="2"/>` +
    `<path d="M10 52q5.5-7 11 0t11 0t11 0t11 0" ${WHITE} stroke-width="4"/><path d="M15 45l-4-4M49 45l4-4" ${WHITE} stroke-width="3.4"/>`,
  sink: () =>
    `<path d="M18 13l14 11 14-11" ${WHITE} stroke-width="6" opacity=".55"/>` +
    `<path d="M18 27l14 11 14-11" ${WHITE} stroke-width="6" opacity=".8"/><path d="M18 41l14 11 14-11" ${WHITE} stroke-width="6"/>`,
  boom: () =>
    `<path d="M20 22l12-10 12 10" ${WHITE} stroke-width="6"/><circle cx="32" cy="42" r="8.5" fill="#fff"/>` +
    `<path d="${rays(32, 42, 12, 16)}" ${WHITE} stroke-width="3.4"/>`,
  washer: (c) =>
    `<rect x="16" y="11" width="32" height="42" rx="6" fill="#fff"/><circle cx="32" cy="35" r="11" fill="${c}" opacity=".28"/>` +
    `<circle cx="32" cy="35" r="11" fill="none" stroke="${c}" stroke-width="3"/>` +
    `<path d="M25 37q3.5-7 7 0t7 0" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<circle cx="21.5" cy="17" r="2" fill="${c}"/><circle cx="27.5" cy="17" r="2" fill="${c}"/>` +
    `<path d="M36 17h7" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`,
  vultures: () =>
    `<path d="M7 35Q19 21 32 34Q45 21 57 35Q45 29 32 41Q19 29 7 35z" fill="#fff"/>` +
    `<path d="M33 17Q38 12 43 17Q48 12 53 17Q48 15 43 20Q38 15 33 17z" fill="#fff" opacity=".8"/>`,
  cows: () =>
    `<path d="M22 18q-3-6 1-8M42 18q3-6-1-8" ${WHITE} stroke-width="3"/>` +
    `<ellipse cx="17" cy="26" rx="7" ry="4" fill="#fff" transform="rotate(-20 17 26)"/>` +
    `<ellipse cx="47" cy="26" rx="7" ry="4" fill="#fff" transform="rotate(20 47 26)"/>` +
    `<ellipse cx="32" cy="33" rx="13" ry="15" fill="#fff"/><path d="M23 23q6-4 8 2q-1 6-7 4q-3-2-1-6z" fill="#2d2d2d"/>` +
    `<circle cx="27" cy="32" r="2" fill="#222"/><circle cx="37" cy="32" r="2" fill="#222"/>` +
    `<ellipse cx="32" cy="43" rx="10" ry="7" fill="#ffb3c1"/>` +
    `<circle cx="28.5" cy="43" r="1.6" fill="#a0525e"/><circle cx="35.5" cy="43" r="1.6" fill="#a0525e"/>`,
  queue: () => {
    const canopies = [16, 32, 48]
      .map(
        (x) =>
          `<path d="M${x - 8} 30Q${x} 20 ${x + 8} 30" ${WHITE} stroke-width="5"/>` +
          `<path d="M${x - 7} 31L${x} 40L${x + 7} 31" ${WHITE} stroke-width="1.5"/><circle cx="${x}" cy="43" r="3" fill="#fff"/>`,
      )
      .join("");
    return `${canopies}<path d="M10 51H54" ${WHITE} stroke-width="3" stroke-dasharray="4 5"/>`;
  },
  jet: () =>
    `<path transform="rotate(40 32 32)" d="M32 6L35.5 22L52 36V40L35 35L34 48L40 53V56L32 54L24 56V53L30 48L29 35L12 40V36L28.5 22Z" fill="#fff"/>` +
    `<path d="M12 47h9M9 53h9" ${WHITE} stroke-width="3" opacity=".7"/>`,
};

/** SVG icon of a report category. */
export function reportIcon(kind: ReportKind): string {
  const c = REPORT_COLORS[kind];
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${disc(c)}${GLYPHS[kind](c)}</svg>`;
}
