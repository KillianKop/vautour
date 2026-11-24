/** Inline SVG icons of the interface (all original drawings). */
import type { Maneuver } from "../nav/guidance";

export const MANEUVER_ICONS: Record<Maneuver, string> = {
  spiral:
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M22 27a3 3 0 1 1 3 3a7 7 0 1 1 7-7a11 11 0 1 1-11-11a15 15 0 0 1 15 15" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><path d="M41 22l-4 8-5-6z" fill="#fff"/></svg>',
  flag: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 43V6" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><path d="M13 7H37l-6 8 6 8H13z" fill="#62c8ff"/></svg>',
  finish:
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 43V6" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/><path d="M13 7h24v16H13z" fill="#fff"/><path d="M13 7h6v4h-6zM25 7h6v4h-6zM19 11h6v4h-6zM31 11h6v4h-6zM13 15h6v4h-6zM25 15h6v4h-6zM19 19h6v4h-6zM31 19h6v4h-6z" fill="#14181f"/></svg>',
  up: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 42V9M13 20L24 9l11 11" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const thumb =
  '<path d="M7 18H4V9h3zM9 18h6.5a2 2 0 0 0 2-1.7l1-6A2 2 0 0 0 16.5 8H12l.7-3.4A1.8 1.8 0 0 0 9.4 4L9 9z"';

export const UI_ICONS = {
  report:
    '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 9h24a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H19l-7 6v-6H8a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4z" fill="#14181f"/><path d="M20 13v9M20 25.5v.5" stroke="#ffd21f" stroke-width="3.6" stroke-linecap="round"/></svg>',
  overview:
    '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M5 20L11 5L21 15Z" fill="none" stroke="#3d1f99" stroke-width="2.4" stroke-linejoin="round"/><circle cx="5" cy="20" r="2.6" fill="#8c5cff"/><circle cx="11" cy="5" r="2.6" fill="#8c5cff"/><circle cx="21" cy="15" r="2.6" fill="#8c5cff"/></svg>',
  soundOn:
    '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M4 10h4l6-5v16l-6-5H4z" fill="#14181f"/><path d="M18 9q3 4 0 8M20.5 6q5.5 7 0 14" fill="none" stroke="#14181f" stroke-width="2" stroke-linecap="round"/></svg>',
  soundOff:
    '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M4 10h4l6-5v16l-6-5H4z" fill="#14181f"/><path d="M18 10l6 6M24 10l-6 6" stroke="#ff4d5e" stroke-width="2.2" stroke-linecap="round"/></svg>',
  routes:
    '<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M13 23V14M13 14L6 6M13 14L20 6" fill="none" stroke="#14181f" stroke-width="2.4" stroke-linecap="round"/><path d="M3 9V4h5M23 9V4h-5" fill="none" stroke="#14181f" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.6" height="12" rx="1" fill="#14181f"/><rect x="9.4" y="2" width="3.6" height="12" rx="1" fill="#14181f"/></svg>',
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="#14181f"/></svg>',
  thumbUp: `<svg viewBox="0 0 20 20" aria-hidden="true">${thumb} fill="#22b357"/></svg>`,
  thumbDown: `<svg viewBox="0 0 20 20" aria-hidden="true"><g transform="rotate(180 10 10)">${thumb} fill="#ff4d5e"/></g></svg>`,
  flag: '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 13V1.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/><path d="M3.5 2H12l-2 3 2 3H3.5z" fill="#fff"/></svg>',
  check:
    '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/** Small canopy of another pilot, in that pilot's colour. */
export const pilotIcon = (color: string): string =>
  `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 14Q16 3 27 14" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round"/><path d="M6 15L16 25L26 15" fill="none" stroke="#333" stroke-width="1"/><circle cx="16" cy="26" r="2.8" fill="#333"/></svg>`;
