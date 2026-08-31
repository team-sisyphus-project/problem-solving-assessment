/*
 * SC-3 / M-3 — SolveScreen BYOP wiring (render contract)
 * ---------------------------------------------------------------------------
 * Under test: the solve screen (1) shows the empty conversation initial state,
 * (2) calls the real sendChat with the selected provider and the candidate's
 * own API key, (3) accumulates and retains the user message and reply in order
 * on every send, (4) shows a pending-reply state, (5) surfaces failures via an
 * error toast, and (6) never leaves the entered key in localStorage or the
 * saved session.
 *
 * The adapter (grain-1) is mocked at the boundary — this grain verifies only
 * the "screen <-> adapter wiring", and real REST calls are already covered by
 * the adapter tests (llm-adapters.test.ts).
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock the adapter boundary — control only sendChat; LlmError stays the real class.
// (The factory is hoisted to the top of the file, so the mock function is
// lifted with vi.hoisted as well.)
const { sendChatMock } = vi.hoisted(() => ({ sendChatMock: vi.fn() }));
vi.mock("../../src/app/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/app/llm")>();
  return { ...actual, sendChat: sendChatMock };
});

import { SolveScreen } from "../../src/app/screens/SolveScreen";
import { strings } from "../../src/app/i18n";
import { getSession } from "../../src/app/session/store";

const s = strings.screens.solve;
const TOKEN = "solve-token";
const API_KEY = "sk-super-secret-abc123";

function renderSolve() {
  return render(
    <MemoryRouter initialEntries={[`/invite/${TOKEN}/solve`]}>
      <Routes>
        <Route path="/invite/:token/solve" element={<SolveScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Performs one pass of: select provider -> enter key -> type body -> send. */
function selectProviderAndKey() {
  fireEvent.click(screen.getByRole("button", { name: strings.providers.gpt }));
  const keyField = screen.getByLabelText(
    `${strings.providers.gpt} ${s.keyFieldLabel}`,
  );
  fireEvent.change(keyField, { target: { value: API_KEY } });
  // The solve screen is split into phase 1 (connect your own AI) and phase 2
  // (conversation). Once connected, "Connect and continue" enters the
  // conversation phase.
  fireEvent.click(screen.getByRole("button", { name: s.phaseConnectAction }));
  return keyField as HTMLInputElement;
}

/** Skips connecting and moves to the conversation phase (no AI connected). */
function skipConnect() {
  fireEvent.click(screen.getByRole("button", { name: s.phaseSkipAction }));
}

function sendMessage(text: string) {
  fireEvent.change(screen.getByLabelText(s.composerPlaceholder), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: s.sendAction }));
}

describe("SolveScreen — BYOP wiring (SC-3/M-3)", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
  });

  it("shows the empty conversation initial state", () => {
    renderSolve();
    skipConnect();
    expect(
      screen.getByRole("heading", { name: s.emptyTitle }),
    ).toBeInTheDocument();
  });

  it("the key field has type password and opens only after a provider is selected", () => {
    renderSolve();
    // Before selection there is no key input slot (judged within phase 1).
    expect(
      screen.queryByLabelText(`${strings.providers.gpt} ${s.keyFieldLabel}`),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: strings.providers.gpt }));
    const keyField = screen.getByLabelText(
      `${strings.providers.gpt} ${s.keyFieldLabel}`,
    ) as HTMLInputElement;
    expect(keyField.type).toBe("password");
  });

  it("calls sendChat with the selected provider and own key, accumulating replies in order", async () => {
    sendChatMock
      .mockResolvedValueOnce("first answer")
      .mockResolvedValueOnce("second answer");

    renderSolve();
    selectProviderAndKey();

    sendMessage("first question");
    expect(await screen.findByText("first answer")).toBeInTheDocument();

    // First call: mapped to provider id + own key + a single user message.
    expect(sendChatMock).toHaveBeenNthCalledWith(1, "gpt", API_KEY, [
      { role: "user", content: "first question" },
    ]);

    sendMessage("second question");
    expect(await screen.findByText("second answer")).toBeInTheDocument();

    // Second call: passes the full accumulated log (user/assistant alternating).
    expect(sendChatMock).toHaveBeenNthCalledWith(2, "gpt", API_KEY, [
      { role: "user", content: "first question" },
      { role: "assistant", content: "first answer" },
      { role: "user", content: "second question" },
    ]);

    // The previous conversation stays on screen without disappearing.
    expect(screen.getByText("first question")).toBeInTheDocument();
    expect(screen.getByText("first answer")).toBeInTheDocument();
    expect(screen.getByText("second question")).toBeInTheDocument();
  });

  it("shows a 'thinking' state while awaiting the reply", async () => {
    let resolveReply: (v: string) => void = () => {};
    sendChatMock.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveReply = resolve;
      }),
    );

    renderSolve();
    selectProviderAndKey();
    sendMessage("thinking?");

    // Before the reply arrives: the pending indicator is visible.
    expect(await screen.findByText(s.pendingText)).toBeInTheDocument();

    resolveReply("done");
    await waitFor(() =>
      expect(screen.queryByText(s.pendingText)).not.toBeInTheDocument(),
    );
    expect(screen.getByText("done")).toBeInTheDocument();
  });

  it("surfaces an error toast when the call fails", async () => {
    sendChatMock.mockRejectedValueOnce(new Error("boom"));

    renderSolve();
    selectProviderAndKey();
    sendMessage("will fail");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(s.errorGeneric);
  });

  it("does not leave the entered API key in localStorage or the saved session", async () => {
    sendChatMock.mockResolvedValueOnce("ok");

    renderSolve();
    selectProviderAndKey();
    sendMessage("keep key out of storage");
    await screen.findByText("ok");

    // The saved session keeps the conversation log but must not contain the key.
    const session = getSession(TOKEN);
    expect(session?.messages.length).toBe(2);
    expect(JSON.stringify(session)).not.toContain(API_KEY);

    // Sweeping all of localStorage, the key string must be nowhere.
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i)!;
      expect(window.localStorage.getItem(k)).not.toContain(API_KEY);
    }
  });
});
