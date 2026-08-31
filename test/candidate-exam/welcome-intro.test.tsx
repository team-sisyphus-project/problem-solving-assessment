/*
 * Welcome intro — entry-screen contract at the front of the flow
 * ---------------------------------------------------------------------------
 * Under test (spec "main flow"):
 *   1) The invite link's token index (`/invite/:token`) renders the welcome
 *      intro first, not the identity verification form — eyebrow · title ·
 *      subcopy · a single CTA.
 *   2) The intro is not a flow step — no step indicator (stepper) appears, and
 *      there are no actions besides the CTA (no skip, no back).
 *   3) Pressing the CTA advances to the first step of the flow, identity
 *      verification (`/invite/:token/verify`) (the existing 4-step structure
 *      is unchanged).
 *   4) Re-entering with an already-submitted token sends the candidate to the
 *      first flow step instead of the intro, where the shell lock notice
 *      (SC-4/M-5) appears — we do not show a welcome screen again for a
 *      finished attempt.
 *
 * Structured isomorphic to production routing (index = intro, 4 steps under
 * the shell layout). jsdom has no WebGL, so the 3D object falls back to a
 * static substitute; this test covers only the copy, navigation, and lock
 * contracts, not the 3D rendering itself.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "../../src/app/shell/AppShell";
import { WelcomeScreen } from "../../src/app/screens/WelcomeScreen";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { SolveScreen } from "../../src/app/screens/SolveScreen";
import { CompleteScreen } from "../../src/app/screens/CompleteScreen";
import { strings } from "../../src/app/i18n";
import { markSubmitted } from "../../src/app/session/store";
import { firstStepPath, welcomePath } from "../../src/app/flow";

const TOKEN = "welcome-token";
const welcome = strings.screens.welcome;
const verify = strings.screens.verify;

/** Routes isomorphic to production — index = intro (outside the shell), the 4
 * sub-steps inside the shell */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/invite/:token">
          <Route index element={<WelcomeScreen />} />
          <Route element={<AppShell />}>
            <Route path="verify" element={<VerifyScreen />} />
            <Route path="brief" element={<BriefScreen />} />
            <Route path="solve" element={<SolveScreen />} />
            <Route path="complete" element={<CompleteScreen />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Welcome intro (front of the 4-step flow)", () => {
  it("entering via the invite link shows the intro copy first, not identity verification", () => {
    renderAt(welcomePath(TOKEN));

    expect(screen.getByText(welcome.eyebrow)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: welcome.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(welcome.description)).toBeInTheDocument();

    // The identity verification form has not appeared yet.
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(verify.emailLabel)).not.toBeInTheDocument();
  });

  it("keeps a single CTA with no step indicator (no skip, no back)", () => {
    renderAt(welcomePath(TOKEN));

    expect(
      screen.queryByRole("navigation", { name: strings.nav.ariaLabel }),
    ).not.toBeInTheDocument();

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(welcome.primaryAction);
  });

  it("pressing the CTA advances to the first flow step (identity verification)", () => {
    renderAt(welcomePath(TOKEN));

    fireEvent.click(screen.getByRole("button", { name: welcome.primaryAction }));

    // The identity verification screen appears together with the shell's step
    // indicator.
    expect(
      screen.getByRole("heading", { name: verify.title }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(verify.nameLabel)).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: strings.nav.ariaLabel }),
    ).toBeInTheDocument();
  });

  it("the first-step path for identity verification is /verify, not the token index", () => {
    expect(firstStepPath(TOKEN)).toBe(`${welcomePath(TOKEN)}/verify`);
  });

  it("even for an already-submitted token, the intro still shows (no blocking)", () => {
    markSubmitted(TOKEN);
    renderAt(welcomePath(TOKEN));

    // The brand mark in the header is also the door back here — no one is
    // trapped even after submission.
    expect(screen.getByText(welcome.eyebrow)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: welcome.title }),
    ).toBeInTheDocument();
  });

  it("after submitting, entering the flow via the CTA shows the previous submission notice asking, instead of the form", () => {
    markSubmitted(TOKEN);
    renderAt(welcomePath(TOKEN));

    fireEvent.click(screen.getByRole("button", { name: welcome.primaryAction }));

    expect(
      screen.getByRole("heading", { name: strings.screens.previous.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: strings.screens.previous.restartAction,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
  });

  it("even without motion/3D, the same copy and CTA remain (static fallback)", () => {
    // jsdom has no WebGL, so GlassAsterisk has fallen back to its static
    // substitute.
    renderAt(welcomePath(TOKEN));

    // The object itself is decorative (aria-hidden); only the fallback text
    // remains for screen readers.
    expect(screen.getByText(welcome.visualLabel)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: welcome.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: welcome.primaryAction }),
    ).toBeInTheDocument();
  });
});
