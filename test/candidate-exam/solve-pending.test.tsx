/*
 * SC-3a / M-3 — Dedicated verification of the pending-reply ('thinking') state
 * ---------------------------------------------------------------------------
 * Scenario SC-3a: when the candidate sends a message on the solve screen, a
 * pending-reply state such as "thinking" must appear on screen while the LLM
 * reply has not yet arrived (sendChat unresolved).
 *
 * This file focuses on that pending state alone:
 *   1. Before sending, there is no pending indicator.
 *   2. After sending, while sendChat is pending, the pending indicator
 *      (pendingText AI bubble) appears.
 *   3. When the reply resolves, the pending indicator disappears and the reply
 *      text takes its place.
 *
 * The adapter (sendChat) is mocked at the boundary — real REST calls are the
 * adapter tests' responsibility; here we only check the "unresolved Promise <->
 * pending UI" wiring. (Reuses the mocking/helper pattern of solve-byop.test.tsx.)
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock the adapter boundary — control only sendChat (vi.hoisted for factory hoisting).
const { sendChatMock } = vi.hoisted(() => ({ sendChatMock: vi.fn() }));
vi.mock("../../src/app/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/app/llm")>();
  return { ...actual, sendChat: sendChatMock };
});

import { SolveScreen } from "../../src/app/screens/SolveScreen";
import { strings } from "../../src/app/i18n";

const s = strings.screens.solve;
const TOKEN = "solve-pending-token";
const API_KEY = "sk-pending-secret-xyz789";

function renderSolve() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}/solve`]}>
      <Routes>
        <Route path="/invite/:token/solve" element={<SolveScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Selects the provider and enters the candidate's own API key (ready to send). */
function selectProviderAndKey() {
  fireEvent.click(screen.getByRole("button", { name: strings.providers.gpt }));
  fireEvent.change(
    screen.getByLabelText(`${strings.providers.gpt} ${s.keyFieldLabel}`),
    { target: { value: API_KEY } },
  );
  // The solve screen is split into phase 1 (connect your own AI) and phase 2
  // (conversation). Once connected, "Connect and continue" enters the
  // conversation phase.
  fireEvent.click(screen.getByRole("button", { name: s.phaseConnectAction }));
}

function sendMessage(text: string) {
  fireEvent.change(screen.getByLabelText(s.composerPlaceholder), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: s.sendAction }));
}

describe("SolveScreen — pending-reply state display (SC-3a/M-3)", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
  });

  it("no pending indicator before sending; after sending it appears only until the reply arrives, then disappears", async () => {
    // A manually resolvable unresolved Promise — creates the window in which
    // sendChat is pending.
    let resolveReply: (v: string) => void = () => {};
    sendChatMock.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveReply = resolve;
      }),
    );

    renderSolve();
    selectProviderAndKey();

    // (1) Before sending: the pending indicator is not on screen.
    expect(screen.queryByText(s.pendingText)).not.toBeInTheDocument();

    // (2) Send -> while sendChat is unresolved: the pending indicator appears.
    sendMessage("the pending state should be visible");
    const pending = await screen.findByText(s.pendingText);
    expect(pending).toBeInTheDocument();

    // The pending indicator is exposed while the reply text is not yet there.
    expect(screen.queryByText("arrived reply")).not.toBeInTheDocument();

    // (3) Reply resolves -> the pending indicator disappears and the reply
    // text takes its place.
    resolveReply("arrived reply");
    await waitFor(() =>
      expect(screen.queryByText(s.pendingText)).not.toBeInTheDocument(),
    );
    expect(screen.getByText("arrived reply")).toBeInTheDocument();
  });

  it("the pending indicator announces to screen readers as an AI-side bubble (role=status, aria-live=polite)", async () => {
    let resolveReply: (v: string) => void = () => {};
    sendChatMock.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveReply = resolve;
      }),
    );

    renderSolve();
    selectProviderAndKey();
    sendMessage("pending bubble accessibility check");

    // Among the ancestors holding pendingText there must be a status bubble
    // with aria-live=polite.
    const pendingText = await screen.findByText(s.pendingText);
    const liveRegion = pendingText.closest('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveAttribute("role", "status");

    // Cleanup: resolve the in-flight Promise to avoid state-update warnings.
    resolveReply("cleanup reply");
    await waitFor(() =>
      expect(screen.queryByText(s.pendingText)).not.toBeInTheDocument(),
    );
  });
});
