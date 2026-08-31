/*
 * S-2 / M-2·M-3 — Consent copy content check (E2E)
 * ---------------------------------------------------------------------------
 * Reuses the render pattern of `consent-gate-e2e.test.tsx` (drives the real
 * screens on top of a nested router isomorphic to production), but this file
 * looks at **content and placement** only. Blocking/progression (M-1) and
 * persistence (M-4) are out of scope.
 *
 * Mapping to the verification goals (Measure):
 *   · M-2 — (a) the notice that reviewers will review inputs and outputs from
 *           the solving process is rendered on the consent screen (100% text match).
 *   · M-3 — (b) the disclosure that this data will not be used for training
 *           the underlying LLM models etc. is exposed **simultaneously in the
 *           same form** as (a) (100% text match).
 *
 * The two statements are placed with **equal weight**: both carry the same
 * `.verify-consent__statement` class and sit side by side as siblings under
 * the same parent (neither is buried inside the other — persona B). All copy
 * is read directly from i18n (strings) and compared without hardcoding.
 * This test lives in the test layer only and does not change production code.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "../../src/app/shell/AppShell";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { strings } from "../../src/app/i18n";

const TOKEN = "consent-content-check-e2e-token";
const verify = strings.screens.verify;

/** (a) review notice = consentReview, (b) no-training disclosure = consentNoTraining.
 * Both statements are read directly from strings and compared (no hardcoding). */
const COPY_A = verify.consentReview;
const COPY_B = verify.consentNoTraining;

/** Nested routes isomorphic to production. We only check content, so only the
 * verify index is rendered. */
function renderVerify() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}`]}>
      <Routes>
        <Route path="/invite/:token" element={<AppShell />}>
          <Route index element={<VerifyScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Consent copy content check E2E — (a)(b) simultaneous exposure with equal weight (S-2/M-2·M-3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("(a) the review notice is rendered on the consent screen — 100% text match (M-2)", () => {
    renderVerify();
    // An element exists whose text exactly matches statement (a) from strings.
    const node = screen.getByText(COPY_A);
    expect(node).toBeInTheDocument();
    expect(node.textContent).toBe(COPY_A);
  });

  it("(b) the no-training disclosure is rendered on the consent screen — 100% text match (M-3)", () => {
    renderVerify();
    const node = screen.getByText(COPY_B);
    expect(node).toBeInTheDocument();
    expect(node.textContent).toBe(COPY_B);
  });

  it("(a)(b) both statements are exposed simultaneously within the same verify form (M-3 simultaneous exposure 100%)", () => {
    const { container } = renderVerify();
    const form = container.querySelector("form.verify-form");
    expect(form).not.toBeNull();

    // Even when scoped to the same form, both (a) and (b) are found = simultaneous
    // exposure on the same screen.
    const scoped = within(form as HTMLElement);
    expect(scoped.getByText(COPY_A)).toBeInTheDocument();
    expect(scoped.getByText(COPY_B)).toBeInTheDocument();
  });

  it("(a)(b) are placed with equal weight as siblings sharing the .verify-consent__statement class (persona B)", () => {
    const { container } = renderVerify();

    // Pick out only the statement nodes inside the consent block.
    const statements = Array.from(
      container.querySelectorAll<HTMLElement>(".verify-consent__statement"),
    );

    // Exactly two statements are carried as statements (no more, no less).
    expect(statements).toHaveLength(2);

    // The two nodes' texts match statements (a) and (b) 100% respectively.
    const texts = statements.map((el) => el.textContent);
    expect(texts).toContain(COPY_A);
    expect(texts).toContain(COPY_B);

    // Evidence of equal weight: both have the same class and are siblings
    // under the same parent (neither is subordinate to or nested in the other).
    const [first, second] = statements;
    expect(first.className).toBe(second.className);
    expect(first.parentElement).not.toBeNull();
    expect(first.parentElement).toBe(second.parentElement);
    expect(first.tagName).toBe(second.tagName);
  });
});
