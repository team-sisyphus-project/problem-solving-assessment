/*
 * S-1 / M-1·M-2·M-3 — Identity verification step data consent-to-review gate (E2E)
 * ---------------------------------------------------------------------------
 * Under test (driven with real clicks on a router isomorphic to production):
 *   1) The identity verification screen exposes the consent copy (two
 *      disclosures) + checkbox + proceed button together (M-2: solving-process
 *      review notice, M-3: LLM no-training disclosure — simultaneous exposure
 *      on the same screen).
 *   2) Even with name and email filled in, without the consent check "Confirm
 *      and start" does not proceed to the next step (problem brief) and shows
 *      a guidance message (M-1: blocking + persona C).
 *   3) After checking and clicking, the identity is saved to the session and
 *      the flow advances to the problem brief (M-1: progression).
 *
 * Copy/tone is read directly from i18n (strings) and compared without
 * hardcoding. The assigned problem text is checked against the value returned
 * by the production contract (assignProblem) to avoid coupling to specific
 * strings.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "../../src/app/shell/AppShell";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { strings } from "../../src/app/i18n";
import { assignProblem } from "../../src/app/session/problems";
import { getSession } from "../../src/app/session/store";

const TOKEN = "consent-gate-token";
const verify = strings.screens.verify;

/** Renders on nested routes isomorphic to production (AppShell = layout +
 * child steps). Starts at the verify index; a real navigate to brief happens
 * after the consent passes, so the brief route is included as well. */
function renderFlowAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}${path}`]}>
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
    target: { value: "Alex Morgan" },
  });
  fireEvent.change(screen.getByLabelText(verify.emailLabel), {
    target: { value: "alex@example.com" },
  });
}

describe("Identity verification consent gate — exposure, blocking, progression (S-1/M-1·M-2·M-3)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("the consent screen exposes both disclosure statements + checkbox + proceed button together (M-2/M-3)", () => {
    renderFlowAt("");

    // (a) the solving-process review notice and (b) the LLM no-training
    // disclosure are exposed simultaneously on the same screen.
    expect(screen.getByText(verify.consentReview)).toBeInTheDocument();
    expect(screen.getByText(verify.consentNoTraining)).toBeInTheDocument();

    // The checkbox (consent control) and the proceed button are present together.
    expect(
      screen.getByRole("checkbox", { name: verify.consentCheckboxLabel }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: verify.primaryAction }),
    ).toBeInTheDocument();
  });

  it("proceeding without the consent check is blocked and guidance appears (M-1 blocking, persona C)", () => {
    renderFlowAt("");
    fillIdentity();

    // The checkbox is unselected by default and the button announces its
    // disabled state.
    const checkbox = screen.getByRole("checkbox", {
      name: verify.consentCheckboxLabel,
    });
    expect(checkbox).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: verify.primaryAction }),
    ).toHaveAttribute("aria-disabled", "true");

    // Attempt to proceed without consent — guidance appears and the flow does
    // not move on to the problem brief.
    fireEvent.click(screen.getByRole("button", { name: verify.primaryAction }));

    expect(screen.getByText(verify.consentRequired)).toBeInTheDocument();
    // Still on the identity verification screen (form), and the assigned
    // problem screen does not appear.
    expect(screen.getByLabelText(verify.nameLabel)).toBeInTheDocument();
    const assigned = assignProblem(TOKEN);
    expect(
      screen.queryByRole("heading", { name: assigned.title }),
    ).not.toBeInTheDocument();
    // The identity has not been saved yet either.
    expect(getSession(TOKEN)?.candidate).toBeNull();
  });

  it("proceeding after the consent check saves the identity and moves on to the problem brief (M-1 progression)", () => {
    renderFlowAt("");
    fillIdentity();

    fireEvent.click(
      screen.getByRole("checkbox", { name: verify.consentCheckboxLabel }),
    );
    // Consenting removes the button's disabled indication.
    expect(
      screen.getByRole("button", { name: verify.primaryAction }),
    ).not.toHaveAttribute("aria-disabled");

    fireEvent.click(screen.getByRole("button", { name: verify.primaryAction }));

    // Advances to the assigned problem (brief) — the problem title returned by
    // the assignment contract appears on screen.
    const assigned = assignProblem(TOKEN);
    expect(
      screen.getByRole("heading", { name: assigned.title }),
    ).toBeInTheDocument();
    // The identity verification form is gone.
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
    // The identity has been saved to the session.
    expect(getSession(TOKEN)?.candidate).toMatchObject({
      name: "Alex Morgan",
      email: "alex@example.com",
    });
  });
});
