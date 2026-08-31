/*
 * SC-4 / M-5 (revised) — Re-entry after submission: ask instead of locking
 * ---------------------------------------------------------------------------
 * The old contract was "lock the whole flow after submission". Now, instead of
 * blocking, we **offer a choice**. This file guards that revised contract.
 *
 *   1) Re-entering any step of the flow after submission (index, /brief,
 *      /solve) renders the "previous submission notice" instead of the child
 *      screen — no form, chat, or resubmission is exposed.
 *      (The structure is unchanged: the guard lives at the shell layer and
 *      applies uniformly across the flow.)
 *   2) The previous submission **can be read** — expanding it shows the
 *      conversation log from that attempt as-is.
 *   3) Choosing "Start with a new problem" assigns a different problem and
 *      clears the conversation, but **the previous submission is not deleted**
 *      — it stays in history (preserving evaluation material).
 *   4) /complete, the destination right after submission, is the exception and
 *      remains reachable.
 *
 * The store contract (markSubmitted, appendMessage) uses the real functions —
 * this grain covers only the render branching and the side effects of restart.
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
import {
  appendMessage,
  getSession,
  markSubmitted,
} from "../../src/app/session/store";

const TOKEN = "previous-token";
const previous = strings.screens.previous;
const verify = strings.screens.verify;
const solve = strings.screens.solve;
const brief = strings.screens.brief;
const complete = strings.screens.complete;

/** Renders the given path on nested routes isomorphic to production (AppShell = layout). */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}${path}`]}>
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

/** Creates a session with two conversation entries and a completed submission. */
function haveSubmittedSession() {
  appendMessage(TOKEN, "applicant", "My first question");
  appendMessage(TOKEN, "ai", "AI answer", "gpt");
  markSubmitted(TOKEN);
}

/** Asserts that the previous submission notice is displayed. */
function expectPreviousNotice() {
  expect(
    screen.getByRole("heading", { name: previous.title }),
  ).toBeInTheDocument();
  expect(screen.getByText(previous.description)).toBeInTheDocument();
}

describe("Re-entry after submission — ask instead of locking (SC-4/M-5 revised)", () => {
  it("before submission the notice does not appear (solve flow renders normally)", () => {
    renderAt("/verify");
    expect(
      screen.getByRole("heading", { name: verify.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: previous.title }),
    ).not.toBeInTheDocument();
  });

  it("after submission, entering identity verification shows the previous submission notice instead of the form", () => {
    haveSubmittedSession();
    renderAt("/verify");
    expectPreviousNotice();
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
  });

  it("after submission, a /brief deep link is also replaced by the previous submission notice", () => {
    haveSubmittedSession();
    renderAt("/brief");
    expectPreviousNotice();
    expect(
      screen.queryByRole("button", { name: brief.primaryAction }),
    ).not.toBeInTheDocument();
  });

  it("after submission, a /solve deep link shows only the notice — no chat or resubmission", () => {
    haveSubmittedSession();
    renderAt("/solve");
    expectPreviousNotice();
    expect(
      screen.queryByLabelText(solve.composerPlaceholder),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: solve.sendAction }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: solve.primaryAction }),
    ).not.toBeInTheDocument();
  });

  it("the submitted conversation can be expanded and re-read as-is", () => {
    haveSubmittedSession();
    renderAt("/verify");

    // Before expanding, the log is not shown.
    expect(screen.queryByText("My first question")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: previous.viewAction }),
    );
    expect(screen.getByText("My first question")).toBeInTheDocument();
    expect(screen.getByText("AI answer")).toBeInTheDocument();

    // Collapsing hides it again, and the button label announces the state too
    // (no color-only signaling).
    fireEvent.click(
      screen.getByRole("button", { name: previous.hideAction }),
    );
    expect(screen.queryByText("My first question")).not.toBeInTheDocument();
  });

  it("the summary reveals the submission time, problem, and conversation count", () => {
    haveSubmittedSession();
    const { container } = renderAt("/verify");
    const session = getSession(TOKEN)!;

    // Search only within the summary block so the numbers do not mix with the
    // step indicator.
    const summary = container.querySelector(".previous__summary")!;
    const values = Array.from(
      summary.querySelectorAll(".previous__value"),
    ).map((el) => el.textContent);

    expect(values).toContain(session.problem.title);
    expect(values).toContain(String(session.messages.length));
    // The submission time is filled with a real value, not "—".
    expect(values[0]).not.toBe("—");
  });

  it("'Start with a new problem' assigns a different problem but does not delete the previous submission", () => {
    haveSubmittedSession();
    const before = getSession(TOKEN)!;
    renderAt("/verify");

    fireEvent.click(
      screen.getByRole("button", { name: previous.restartAction }),
    );

    const after = getSession(TOKEN)!;
    // New attempt — reverts to a different problem, an empty conversation, and
    // an unsubmitted state.
    expect(after.attempt).toBe(before.attempt + 1);
    expect(after.problem.id).not.toBe(before.problem.id);
    expect(after.messages).toEqual([]);
    expect(after.submittedAt).toBeNull();

    // The previous submission is not deleted — it stays in history as-is
    // (preserving evaluation material).
    expect(after.history).toHaveLength(1);
    expect(after.history[0].problem.id).toBe(before.problem.id);
    expect(after.history[0].messages.map((m) => m.text)).toEqual([
      "My first question",
      "AI answer",
    ]);
    expect(after.history[0].submittedAt).toBe(before.submittedAt);
  });

  it("restarting reopens the flow (back to the identity verification form)", () => {
    haveSubmittedSession();
    renderAt("/verify");
    fireEvent.click(
      screen.getByRole("button", { name: previous.restartAction }),
    );
    // Navigates to welcome -> entering the first step via the CTA now shows the form.
    fireEvent.click(
      screen.getByRole("button", {
        name: strings.screens.welcome.primaryAction,
      }),
    );
    expect(screen.getByLabelText(verify.nameLabel)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: previous.title }),
    ).not.toBeInTheDocument();
  });

  it("even after submission, /complete renders normally as the exception", () => {
    haveSubmittedSession();
    renderAt("/complete");
    expect(
      screen.getByRole("heading", { name: complete.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: previous.title }),
    ).not.toBeInTheDocument();
  });

  it("the brand mark in the header links to the start (welcome) — even after submission", () => {
    haveSubmittedSession();
    renderAt("/verify");
    const home = screen.getByRole("link", { name: strings.app.homeLabel });
    expect(home).toHaveAttribute("href", `/invite/${TOKEN}`);
  });
});
