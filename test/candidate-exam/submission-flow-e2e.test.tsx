/*
 * SC-4 / M-4·M-5 — Submission flow E2E (modal -> confirm -> complete -> re-entry lock)
 * ---------------------------------------------------------------------------
 * Under test (driven with real clicks on a router isomorphic to production):
 *   1) After conversing on the solve screen, pressing "Submit" does not submit
 *      immediately — a submission confirmation modal appears (one more check
 *      for an irreversible action).
 *   2) Only pressing "Final submit" in the modal commits the full conversation
 *      log and the submission time (submittedAt) to the store (M-4) and
 *      advances to the submission-complete screen.
 *   3) Reconnecting via the same invite link (`/invite/{token}`) or the
 *      `/solve` deep link shows only the "this attempt has already been
 *      submitted" lock notice instead of the problem/chat (SC-4/M-5).
 *
 * The adapter boundary (sendChat, grain-1) is mocked — this test drives and
 * asserts the router flow (modal, completion, re-entry lock); real REST calls
 * are already covered by the adapter tests. Copy/tone is read directly from
 * i18n (strings) and compared against the spec record (no hardcoding).
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock the adapter boundary — control only sendChat; the rest (LlmError etc.)
// stays real.
const { sendChatMock } = vi.hoisted(() => ({ sendChatMock: vi.fn() }));
vi.mock("../../src/app/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/app/llm")>();
  return { ...actual, sendChat: sendChatMock };
});

import { AppShell } from "../../src/app/shell/AppShell";
import { VerifyScreen } from "../../src/app/screens/VerifyScreen";
import { BriefScreen } from "../../src/app/screens/BriefScreen";
import { SolveScreen } from "../../src/app/screens/SolveScreen";
import { CompleteScreen } from "../../src/app/screens/CompleteScreen";
import { strings } from "../../src/app/i18n";
import { getSession, isSubmitted } from "../../src/app/session/store";

const TOKEN = "e2e-submit-token";
const API_KEY = "sk-e2e-secret-key";
const solve = strings.screens.solve;
const modal = strings.screens.solve.submitModal;
const complete = strings.screens.complete;
const verify = strings.screens.verify;
const previous = strings.screens.previous;

/** Renders on nested routes isomorphic to production (AppShell = layout + 4 step
 * children). A real navigate(/complete) happens after confirming "Final submit",
 * so the complete route is included. */
function renderFlowAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}${path}`]}>
      <Routes>
        <Route path="/invite/:token" element={<AppShell />}>
          <Route index element={<VerifyScreen />} />
          <Route path="brief" element={<BriefScreen />} />
          <Route path="solve" element={<SolveScreen />} />
          <Route path="complete" element={<CompleteScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** Builds a conversation: select provider -> enter own key -> send one message
 * (reply accumulated). */
async function haveConversation() {
  fireEvent.click(screen.getByRole("button", { name: strings.providers.gpt }));
  fireEvent.change(
    screen.getByLabelText(`${strings.providers.gpt} ${solve.keyFieldLabel}`),
    { target: { value: API_KEY } },
  );
  // The solve screen is split into phase 1 (connect your own AI) and phase 2
  // (conversation) — after connecting we move on to the conversation.
  fireEvent.click(
    screen.getByRole("button", { name: solve.phaseConnectAction }),
  );
  fireEvent.change(screen.getByLabelText(solve.composerPlaceholder), {
    target: { value: "solve question" },
  });
  fireEvent.click(screen.getByRole("button", { name: solve.sendAction }));
  expect(await screen.findByText("AI reply")).toBeInTheDocument();
}

/** Asserts that the previous submission notice (a screen that asks rather than
 * blocks) is displayed. */
function expectLocked() {
  expect(
    screen.getByRole("heading", { name: previous.title }),
  ).toBeInTheDocument();
  expect(screen.getByText(previous.description)).toBeInTheDocument();
  // Not a blocking screen — a door to restart is offered alongside.
  expect(
    screen.getByRole("button", { name: previous.restartAction }),
  ).toBeInTheDocument();
}

describe("Submission flow E2E — modal -> confirm -> complete -> re-entry lock (SC-4/M-4·M-5)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    sendChatMock.mockReset();
    sendChatMock.mockResolvedValue("AI reply");
  });

  it('"Submit" does not submit immediately — it opens the confirmation modal', async () => {
    renderFlowAt("/solve");
    await haveConversation();

    // Not submitted yet — not locked, and the modal is closed.
    expect(isSubmitted(TOKEN)).toBe(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));

    // The confirmation modal appears (title, body, cancel/confirm actions
    // match the spec copy).
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: modal.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(modal.body)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: modal.confirmAction }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: modal.cancelAction }),
    ).toBeInTheDocument();

    // Only the modal opened — the submission has not been committed yet.
    expect(isSubmitted(TOKEN)).toBe(false);
    expect(getSession(TOKEN)?.submittedAt).toBeNull();
  });

  it('confirming "Final submit" stores the conversation log and submission time and shows the complete screen (M-4)', async () => {
    renderFlowAt("/solve");
    await haveConversation();

    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));
    fireEvent.click(screen.getByRole("button", { name: modal.confirmAction }));

    // Advances to the complete screen (the modal closes).
    expect(
      await screen.findByRole("heading", { name: complete.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(complete.description)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // M-4: the full conversation log (order and time) and the submission time
    // are committed to the store.
    const session = getSession(TOKEN);
    expect(session?.submittedAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(session!.submittedAt!))).toBe(false);
    expect(session?.messages).toHaveLength(2);
    expect(session?.messages[0]).toMatchObject({
      role: "applicant",
      text: "solve question",
    });
    expect(session?.messages[1]).toMatchObject({ role: "ai", text: "AI reply" });
    expect(session?.messages.every((m) => typeof m.at === "string")).toBe(true);
    expect(isSubmitted(TOKEN)).toBe(true);
  });

  it("after submission, reconnecting via the same invite link (index) shows the previous submission notice (SC-4/M-5 revised)", async () => {
    renderFlowAt("/solve");
    await haveConversation();
    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));
    fireEvent.click(screen.getByRole("button", { name: modal.confirmAction }));
    await screen.findByRole("heading", { name: complete.title });

    // Simulate a browser reconnect with a re-render (the store persists via
    // localStorage).
    renderFlowAt("");

    expectLocked();
    // The identity verification form (entry into the problem screens) is not
    // exposed.
    expect(screen.queryByLabelText(verify.nameLabel)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: verify.primaryAction }),
    ).not.toBeInTheDocument();
  });

  it("after submission, even a /solve deep link reconnect shows the previous submission notice without chat/resubmission (SC-4/M-5 revised)", async () => {
    renderFlowAt("/solve");
    await haveConversation();
    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));
    fireEvent.click(screen.getByRole("button", { name: modal.confirmAction }));
    await screen.findByRole("heading", { name: complete.title });

    renderFlowAt("/solve");

    expectLocked();
    // The chat composer, send, and resubmit actions all disappear (no retake).
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

  it("pressing 'Go back' in the modal returns to the solve screen without submitting", async () => {
    renderFlowAt("/solve");
    await haveConversation();

    fireEvent.click(screen.getByRole("button", { name: solve.primaryAction }));
    fireEvent.click(screen.getByRole("button", { name: modal.cancelAction }));

    // The modal closes and no submission takes place (not locked, still on
    // the solve screen).
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(isSubmitted(TOKEN)).toBe(false);
    expect(
      screen.getByRole("button", { name: solve.primaryAction }),
    ).toBeInTheDocument();
  });
});
