/*
 * Strings entry point — backwards-compatible re-export (shim)
 * ---------------------------------------------------------------------------
 * String management has been promoted to the locale key-file structure
 * (`i18n/`). The canonical sources are the `i18n/locales/<locale>.ts`
 * dictionaries and the `i18n/index.ts` accessors. New consumers import
 * directly from `../i18n`. This file only keeps a thin re-export so the
 * existing path (`./strings`) does not break.
 *
 * Spec: foundations/i18n-strings.md
 * ---------------------------------------------------------------------------
 */

export { strings, getStrings, t, defaultLocale, locales } from "./i18n";
export type { Strings, Locale } from "./i18n";
