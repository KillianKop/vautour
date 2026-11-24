/**
 * User-interface strings. French is the default language of the app; English is available
 * from the flight menu. Add a locale by creating `xx.ts` typed as `Messages` and listing it here.
 */
import { en, type Messages } from "./en";
import { fr } from "./fr";

export const LOCALES = { fr, en } as const;
export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = "fr";
export type { Messages };

const STORAGE_KEY = "vautour.locale";

/** The language picked in a previous session, if the browser lets us read it. */
function savedLocale(): Locale | null {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    return saved && saved in LOCALES ? (saved as Locale) : null;
  } catch {
    return null; // storage disabled (private mode, strict settings)
  }
}

let current: Locale = savedLocale() ?? DEFAULT_LOCALE;

/** Strings of the current locale. */
export const t = (): Messages => LOCALES[current];

export const getLocale = (): Locale => current;

/** Switch language and remember the choice for the next sessions (best effort). */
export function setLocale(locale: Locale): void {
  current = locale;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // storage disabled: the choice lasts for this session only
  }
}

/** BCP 47 tag used for number formatting and speech synthesis. */
export const numberLocale = (): string => LOCALES[current].locale;
