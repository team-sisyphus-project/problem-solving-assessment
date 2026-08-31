/*
 * Test bootstrap — registers jest-dom matchers + isolation reset
 * ---------------------------------------------------------------------------
 * - Extends DOM matchers such as `toBeInTheDocument` via `@testing-library/jest-dom`.
 * - The session store persists per-token sessions in localStorage, so we clear
 *   the DOM and localStorage after every test to ensure each test starts from
 *   a clean state (prevents assignment state leaking between tests).
 * ---------------------------------------------------------------------------
 */

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
