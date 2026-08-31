/*
 * i18n wiring — locale registry · accessors (headless)
 * ---------------------------------------------------------------------------
 * Spec: foundations/i18n-strings.md
 *
 * Minimal wiring that manages user-facing strings in locale key files
 * (`locales/<locale>.ts`). `en` is currently the only locale, but adding a
 * new one just means adding a dictionary file isomorphic to `en` (same key
 * set) and registering it in `locales`. An i18n library, bundle loading, and
 * a switching UI are out of scope for now (the convention only pins down the
 * skeleton).
 *
 *   - `defaultLocale` : the base/fallback locale (= en)
 *   - `locales`       : locale code → dictionary registry
 *   - `Strings`       : canonical key type derived from the en dictionary
 *   - `getStrings(l)` : returns a locale's full dictionary (falls back to defaultLocale if missing)
 *   - `t(l)`          : short alias for `getStrings`
 *   - `strings`       : `getStrings(defaultLocale)` — the default entry point for consumers
 * ---------------------------------------------------------------------------
 */

import { en } from "./locales/en";

/** Base (canonical) locale — this product's only user-facing language (Korean is not supported) */
export const defaultLocale = "en" as const;

/**
 * Locale registry — code → dictionary.
 * To add a new locale, create a file with the exact same key set as `en` and
 * register it here.
 */
export const locales = {
  en,
} as const;

/** Available locale codes */
export type Locale = keyof typeof locales;

/**
 * Canonical key type — derived from the `en` dictionary structure. Every
 * locale must satisfy this shape (isomorphism is enforced), so annotating a
 * new dictionary file with this type catches missing or misspelled keys at
 * compile time.
 */
export type Strings = typeof en;

/**
 * Returns a locale's full dictionary. Falls back to `defaultLocale` for
 * unregistered locales (the minimal form of missing-key fallback).
 */
export function getStrings(locale: Locale = defaultLocale): Strings {
  return locales[locale] ?? locales[defaultLocale];
}

/** Short alias for `getStrings` — for consumers accessing a locale dictionary */
export const t = getStrings;

/**
 * Binding to the default locale dictionary — with no locale-switching UI
 * today, this is the default entry point for screens, shell, and flow. Copy
 * must always be referenced through these keys; never write literals directly.
 */
export const strings = getStrings(defaultLocale);
