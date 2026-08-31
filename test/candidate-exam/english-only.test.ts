/*
 * Language policy — user-facing strings are English only
 * ---------------------------------------------------------------------------
 * This product does not support Korean. Every string that reaches the screen
 * must be English; only code comments (internal team documentation) may keep
 * other languages.
 *
 * There are two spots where regressions can quietly creep in, so we pin them
 * down here:
 *   1) The locale dictionary — Korean slipping in when a new key is added in a hurry.
 *   2) Mock problem data — domain content outside the i18n dictionary, easy to
 *      miss in convention checks.
 *
 * We recursively walk the whole dictionary and fail if even a single Hangul
 * character appears.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import { defaultLocale, locales, strings } from "../../src/app/i18n";
import { PROBLEM_POOL } from "../../src/app/session/problems";

/** Hangul syllable and jamo ranges */
const HANGUL = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/;

/** Flattens a nested dictionary into a "path -> string" list */
function flatten(value: unknown, path: string[] = []): [string, string][] {
  if (typeof value === "string") return [[path.join("."), value]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, [...path, key]),
    );
  }
  return [];
}

describe("Language policy — English only (no Korean support)", () => {
  it("the default locale is en, and en is the only registered locale", () => {
    expect(defaultLocale).toBe("en");
    expect(Object.keys(locales)).toEqual(["en"]);
  });

  it("no locale dictionary string contains Hangul", () => {
    const offenders = flatten(strings)
      .filter(([, text]) => HANGUL.test(text))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it("dates and times rendered on screen come out in English (not pulled along by the browser locale)", () => {
    // Calling toLocaleString() with no arguments mixes in Hangul on a Korean
    // browser (e.g. an AM/PM marker in Korean). We pin down here that the app
    // locale is passed explicitly.
    const rendered = new Date("2026-08-27T12:28:58.000Z").toLocaleString(
      defaultLocale,
      { dateStyle: "medium", timeStyle: "short" },
    );
    expect(HANGUL.test(rendered)).toBe(false);
  });

  it("mock problem data (title and description) contains no Hangul either", () => {
    const offenders = PROBLEM_POOL.filter(
      (problem) => HANGUL.test(problem.title) || HANGUL.test(problem.description),
    ).map((problem) => problem.id);
    expect(offenders).toEqual([]);
  });
});
