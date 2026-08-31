/*
 * S-1 / M-1·M-2·M-3 — Identity verification data consent-to-review gate (E2E)
 * ---------------------------------------------------------------------------
 * Driven with real clicks on top of a nested router isomorphic to production
 * (AppShell = layout + step children), the same way as
 * `submission-flow-e2e.test.tsx`.
 *
 * Mapping to the verification goals (Measure):
 *   · M-2 — the notice that reviewers will review inputs and outputs from the
 *           solving process is exposed.
 *   · M-3 — the disclosure that this data will not be used for LLM training
 *           etc. is exposed **simultaneously on the same screen** as notice (a).
 *   · M-1 — attempting to proceed without consent does not advance to the next
 *           step (brief) and shows guidance (100% blocked). After consenting,
 *           proceeding succeeds (100% progression).
 *
 * Copy is read directly from i18n (strings) and compared without hardcoding,
 * and the assigned problem title is checked against the value returned by the
 * production contract (assignProblem) to avoid coupling to specific strings.
 * This test lives in the test layer only and does not change production code.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "../../src/app/shell/AppShell";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { strings } from "../../src/app/i18n";
import { assignProblem } from "../../src/app/session/problems";
import { getSession } from "../../src/app/session/store";

const TOKEN = "consent-gate-e2e-token";
const verify = strings.screens.verify;

/** Renders on nested routes isomorphic to production. Starts at the verify
 * index; a real navigate to brief happens after the consent gate passes, so
 * the brief route is included as well. */
function renderFlow() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}`]}>
      <Routes>
        <Route path="/invite/:token" element={<AppShell />}>
          <Route index element={<VerifyScreen />} />
          <Route path="brief" element={<BriefScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** Fills in a valid name and email (does not consent). */
function fillIdentity() {
  fireEvent.change(screen.getByLabelText(verify.nameLabel), {
    target: { value: "Jordan Lee" },
  });
  fireEvent.change(screen.getByLabelText(verify.emailLabel), {
    target: { value: "jordan@example.com" },
  });
}

const proceedButton = () =>
  screen.getByRole("button", { name: verify.primaryAction });
const consentCheckbox = () =>
  screen.getByRole("checkbox", { name: verify.consentCheckboxLabel });

describe("Identity verification consent gate E2E — exposure, blocking, progression (S-1/M-1·M-2·M-3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("consent statements (a) review notice + (b) no-training disclosure are exposed simultaneously on the same screen as the checkbox and proceed button (M-2/M-3)", () => {
    const { container } = renderFlow();

    // Both disclosures (a) and (b) are carried together inside the same verify
    // form (simultaneous exposure).
    const form = container.querySelector("form.verify-form");
    expect(form).not.toBeNull();
    const scoped = within(form as HTMLElement);
    expect(scoped.getByText(verify.consentReview)).toBeInTheDocument();
    expect(scoped.getByText(verify.consentNoTraining)).toBeInTheDocument();

    // The consent control (checkbox) and the proceed button are in the same
    // form too.
    expect(
      scoped.getByRole("checkbox", { name: verify.consentCheckboxLabel }),
    ).toBeInTheDocument();
    expect(
      scoped.getByRole("button", { name: verify.primaryAction }),
    ).toBeInTheDocument();
  });

  it("attempting to proceed without consent does not advance to brief and shows guidance (M-1 blocking, persona C)", () => {
    renderFlow();
    fillIdentity();

    // Default state: unchecked, and the button announces its disabled state.
    expect(consentCheckbox()).not.toBeChecked();
    expect(proceedButton()).toHaveAttribute("aria-disabled", "true");

    // The guidance is not shown before an attempt (no premature warnings).
    expect(screen.queryByText(verify.consentRequired)).not.toBeInTheDocument();

    // Attempt to proceed without consent — guidance appears and we do not
    // advance to the next step.
    fireEvent.click(proceedButton());

    expect(screen.getByText(verify.consentRequired)).toBeInTheDocument();
    // Still on the identity verification form — the assigned problem (brief)
    // screen does not appear.
    expect(screen.getByLabelText(verify.nameLabel)).toBeInTheDocument();
    const assigned = assignProblem(TOKEN);
    expect(
      screen.queryByRole("heading", { name: assigned.title }),
    ).not.toBeInTheDocument();
    // The identity has not been saved to the session yet either (gate not passed).
    expect(getSession(TOKEN)?.candidate).toBeNull();
  });

  it("after checking consent, proceeding clears the guidance and advances to the next step (brief) (M-1 progression)", () => {
    renderFlow();
    fillIdentity();

    // First put the screen into the blocked-without-consent state with the
    // guidance visible.
    fireEvent.click(proceedButton());
    expect(screen.getByText(verify.consentRequired)).toBeInTheDocument();

    // Consenting removes both the disabled indication and the guidance.
    fireEvent.click(consentCheckbox());
    expect(consentCheckbox()).toBeChecked();
    expect(proceedButton()).not.toHaveAttribute("aria-disabled");
    expect(screen.queryByText(verify.consentRequired)).not.toBeInTheDocument();

    // Proceed — advances to the assigned problem (brief) and the identity
    // verification form disappears.
    fireEvent.click(proceedButton());

    const assigned = assignProblem(TOKEN);
    expect(
      screen.getByRole("heading", { name: assigned.title }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
    // The identity has been saved to the session.
    expect(getSession(TOKEN)?.candidate).toMatchObject({
      name: "Jordan Lee",
      email: "jordan@example.com",
    });
  });
});
