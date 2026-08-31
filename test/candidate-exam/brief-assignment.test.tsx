/*
 * SC-2 / M-2 — Assigned problem exposure and isolation (render contract)
 * ---------------------------------------------------------------------------
 * Under test: the problem brief screen (BriefScreen) shows only the title and
 * description of the single problem assigned to the given token, and never
 * exposes a problem assigned to another token.
 *
 * Avoiding coupling: instead of hardcoding specific problem text, we verify
 * against the values returned by the production contract (assignProblem).
 * What we assert is "does the screen show exactly that token's assignment
 * result", not whether a particular string is on screen.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { assignProblem } from "../../src/app/session/problems";

/** Renders BriefScreen at the brief route for the given token. */
function renderBriefFor(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${token}/brief`]}>
      <Routes>
        <Route path="/invite/:token/brief" element={<BriefScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Two tokens that receive different problems (fixed set, deterministic
// assignment). We first confirm the two tokens really do get different
// problems to defend the test premise — if they got the same problem, the
// isolation check would be meaningless.
const TOKEN_A = "token-a";
const TOKEN_B = "token-b";

describe("BriefScreen — assigned problem exposure and isolation (SC-2/M-2)", () => {
  it("premise: the two tokens are assigned different problems", () => {
    expect(assignProblem(TOKEN_A).id).not.toBe(assignProblem(TOKEN_B).id);
  });

  it("shows the title and description of the single assigned problem", () => {
    const assigned = assignProblem(TOKEN_A);

    renderBriefFor(TOKEN_A);

    // The title is also exposed in the accessibility hierarchy (heading).
    expect(
      screen.getByRole("heading", { name: assigned.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(assigned.description)).toBeInTheDocument();
  });

  it("does not expose another token's problem (render isolation)", () => {
    const otherAssigned = assignProblem(TOKEN_A);

    // Render TOKEN_B's screen — the problem assigned to TOKEN_A is outside
    // this scope.
    renderBriefFor(TOKEN_B);

    expect(screen.queryByText(otherAssigned.title)).not.toBeInTheDocument();
    expect(screen.queryByText(otherAssigned.description)).not.toBeInTheDocument();
  });
});
