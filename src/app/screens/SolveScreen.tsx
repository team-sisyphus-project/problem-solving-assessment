/*
 * SolveScreen — flow step 3: problem solving (chat) reference screen
 * ---------------------------------------------------------------------------
 * Spec:
 *   components/conversation/base.md      (top = provider selection slot — revised)
 *   components/provider-group/base.md    (options, selected state, connection slot)
 *   components/message-bubble/{base,applicant}.md
 *   components/composer/base.md
 *   components/modal/base.md               (submission confirmation modal — grain-4)
 *
 * Solving is split into **two phases within the screen** (the 4-step flow and
 * the step indicator stay unchanged).
 *
 *   Phase 1 connect — explains what this assessment looks at, and connects
 *                     the candidate's own AI (BYOP). Skippable, but skipping
 *                     means the conversation cannot start.
 *   Phase 2 chat    — left: elapsed time + drifting clouds / right: pinned
 *                     problem + conversation.
 *
 * Previously, provider selection and key entry sat on top of the chat window,
 * leaving no room for a first-time candidate to ask "why am I entering my
 * key?". That is why the phases were split.
 *
 * Returning to a session that already has a conversation skips phase 1 and
 * goes straight to the chat — we do not shove the connection screen back at
 * someone who was mid-progress.
 *
 * M-5: one of GPT/Claude/Gemini is selected in local state, and the selected
 * provider immediately becomes the current responding AI (author label, key
 * field label).
 *
 * BYOP: the candidate enters their own API key for the selected provider
 * directly on screen. The key exists only in browser session memory (local
 * state) and is never stored or logged anywhere — not the server,
 * localStorage, the session store, nor the conversation log (it is a secret).
 * Every send calls the real LLM via grain-1's sendChat(provider, key,
 * messages), and responses accumulate in order in the session log (previous
 * conversation preserved, empty state preserved). Failures are announced via
 * toast(error).
 *
 * Zero one-off hardcoded styles — every visual detail depends only on the
 * token classes of chat.css/primitives. This file handles markup and local
 * state only.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { nextStepPath, prevStepPath } from "../flow";
import { strings } from "../i18n";
import {
  LlmError,
  sendChat,
  type ChatMessage as LlmChatMessage,
  type ProviderId,
} from "../llm";
import {
  appendMessage,
  getOrCreateSession,
  markStarted,
  markSubmitted,
  type ChatMessage,
  type MessageRole,
} from "../session/store";
import { ConnectStep } from "./solve/ConnectStep";
import { DriftingClouds } from "./solve/DriftingClouds";
import { ProblemPin } from "./solve/ProblemPin";
import { SolveTimer } from "./solve/SolveTimer";

/** Sub-phases within the solve screen */
type SolvePhase = "connect" | "chat";

/** Maps session-store roles (applicant/ai) → adapter roles (user/assistant).
 * Secret boundary: apiKey plays no part in this conversion (no key in the message log). */
function toAdapterRole(role: MessageRole): LlmChatMessage["role"] {
  return role === "applicant" ? "user" : "assistant";
}

/** Converts the session log into adapter input (starting with user, alternating). */
function toAdapterMessages(log: ChatMessage[]): LlmChatMessage[] {
  return log.map((m) => ({ role: toAdapterRole(m.role), content: m.text }));
}

export function SolveScreen() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.solve;

  // Active AI provider (M-5) — selected directly within the reference screen.
  // Stays neutral before selection (provider-group principle 2); only the
  // selected one is promoted to accent (principle 3).
  const [provider, setProvider] = useState<ProviderId | null>(null);

  // The conversation log's source of truth is the token session store — load
  // the existing log on entry, and after each send append to the store and
  // sync the screen state (persisted per token).
  const session = getOrCreateSession(token);
  const [messages, setMessages] = useState<ChatMessage[]>(session.messages);

  // Sub-phase — skip the connection screen if the session's conversation has already started.
  const [phase, setPhase] = useState<SolvePhase>(
    session.messages.length > 0 ? "chat" : "connect",
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  // The candidate's own API key (BYOP) — kept only in browser session memory
  // (local state). Never stored anywhere — not the server, localStorage, the
  // session store, nor the conversation log (it is a secret).
  const [apiKey, setApiKey] = useState("");

  // LLM call failure notice — shown via toast(error) on failure, reset on the next send.
  const [error, setError] = useState<string | null>(null);

  // Submission confirmation modal open state (M-4/M-5) — "Submit" does not
  // submit immediately; it opens this modal. The lock only takes effect when
  // "Final submit" is confirmed.
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Mounted flag to prevent state updates after unmount (cleanup of in-flight calls).
  const mountedRef = useRef(true);
  // The modal's confirm (primary) action — focus moves to this button when it opens.
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const hasKey = apiKey.trim().length > 0;
  // Sending requires a selected provider + entered key + body text, and no pending request.
  const canSend =
    provider !== null && hasKey && draft.trim().length > 0 && !pending;
  // The selected provider is the responding AI — reflected in the author label (generic label when unselected).
  const aiAuthor = provider ? strings.providers[provider] : s.authorAi;

  async function handleSend() {
    const text = draft.trim();
    if (!text || pending || provider === null || !hasKey) return;

    // Record the candidate's utterance in the store (with order and timestamp), then sync the screen.
    const afterUser = appendMessage(token, "applicant", text).messages;
    setMessages(afterUser);
    setDraft("");
    setPending(true);
    setError(null);

    // Call the real LLM with the selected provider and the candidate's own
    // key. apiKey flows only as an argument (consumed only in the request
    // headers) and never enters the message log or the saved session.
    try {
      const reply = await sendChat(
        provider,
        apiKey,
        toAdapterMessages(afterUser),
      );
      if (!mountedRef.current) return;
      // Append the response to the store → accumulated in order on top of the
      // previous conversation (SC-3). The active provider is stored as
      // attribution (identifying the assessment material) — apiKey excluded.
      setMessages(appendMessage(token, "ai", reply, provider).messages);
    } catch (err) {
      if (!mountedRef.current) return;
      // LlmError carries a contextual message; anything else gets the generic fallback (key never included).
      setError(err instanceof LlmError ? err.message : s.errorGeneric);
    } finally {
      if (mountedRef.current) setPending(false);
    }
  }

  /*
   * Phase 1 → phase 2. Whether they connected or skipped, they enter through
   * the same door. At this moment the solve start time is stamped
   * (markStarted), establishing the reference point for elapsed time — if
   * already stamped it is left as is, so the clock does not rewind on
   * re-entry.
   */
  function enterChat() {
    markStarted(token);
    setPhase("chat");
  }

  // "Submit" — does not submit immediately; opens the confirmation modal (an irreversible action).
  function openConfirm() {
    setConfirmOpen(true);
  }

  // "Final submit" — finalizes the conversation log and submission time in
  // the store (M-4), and after the submitted flag locks retakes (M-5),
  // advances to the completion screen.
  function confirmSubmit() {
    markSubmitted(token);
    setConfirmOpen(false);
    navigate(nextStepPath(token, "solve")!);
  }

  // On unmount, lower the flag so state updates from in-flight responses are ignored.
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // When the modal opens, move focus to the confirm button and allow cancelling with Escape.
  useEffect(() => {
    if (!confirmOpen) return;
    confirmButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setConfirmOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmOpen]);

  // Phase 1 — connect the candidate's own AI (skippable). The conversation and timer have not started yet.
  if (phase === "connect") {
    return (
      <div className="flow-screen">
        <ConnectStep
          provider={provider}
          apiKey={apiKey}
          onProviderChange={setProvider}
          onApiKeyChange={setApiKey}
          onContinue={enterChat}
          onSkip={enterChat}
        />
        <div className="flow-actions">
          <button
            type="button"
            className="btn btn--low-emphasis"
            onClick={() => navigate(prevStepPath(token, "solve")!)}
          >
            {s.backAction}
          </button>
        </div>
      </div>
    );
  }

  // Phase 2 — left: elapsed time + drifting clouds / right: pinned problem + conversation.
  return (
    <div className="flow-screen">
      <div className="solve-layout">
        {/* Left — where time is kept. Visible from the corner of the eye without looking away from the chat */}
        <aside className="solve-aside">
          <DriftingClouds />
          <div className="solve-aside__content">
            <span className="solve-phase-label">{s.phaseChatLabel}</span>
            <SolveTimer startedAt={session.startedAt} />
          </div>
        </aside>

        {/* Right — the problem pinned at the head, with the conversation below it */}
        <div className="solve-main">
          <ProblemPin problem={session.problem} />

          {/* If skipped — the conversation cannot start, so provide a door back */}
          {provider === null || !hasKey ? (
            <div className="solve-notconnected">
              <h2 className="solve-notconnected__title">
                {s.notConnectedTitle}
              </h2>
              <p className="solve-notconnected__body">{s.notConnectedBody}</p>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setPhase("connect")}
              >
                {s.notConnectedAction}
              </button>
            </div>
          ) : null}

          <section className="conversation" aria-label={s.title}>
            <div className="conversation__list">
              {messages.length === 0 && !pending ? (
                <div className="empty-state">
                  <h1 className="empty-state__title">{s.emptyTitle}</h1>
                  <p className="empty-state__description">
                    {s.emptyDescription}
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === "applicant"
                        ? "message-bubble message-bubble--applicant"
                        : "message-bubble"
                    }
                  >
                    <span className="message-bubble__author">
                      {m.role === "applicant" ? s.authorApplicant : aiAuthor}
                    </span>
                    <p className="message-bubble__body">{m.text}</p>
                  </div>
                ))
              )}

              {/* Awaiting response ("thinking") — author label + waiting
                  indicator (spinner + pendingText) inside an AI-side bubble.
                  aria-live="polite" lets screen readers announce the waiting
                  state. Disappears when the response arrives. */}
              {pending && (
                <div
                  className="message-bubble conversation__pending"
                  role="status"
                  aria-live="polite"
                >
                  <span className="message-bubble__author">{aiAuthor}</span>
                  <span className="loading">
                    <span className="spinner" aria-hidden="true" />
                    <span className="loading__text">{s.pendingText}</span>
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* composer — input (.input) + send (.btn) group */}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            {/* LLM call failure — non-blocking error toast (color + icon + message together) */}
            {error && (
              <div className="toast toast--error" role="alert">
                <span className="toast__icon" aria-hidden="true">
                  !
                </span>
                <span className="toast__message">{error}</span>
              </div>
            )}
            <div className="composer__row">
              <textarea
                className="input composer__field"
                rows={2}
                placeholder={s.composerPlaceholder}
                aria-label={s.composerPlaceholder}
                value={draft}
                disabled={pending}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="btn" disabled={!canSend}>
                {s.sendAction}
              </button>
            </div>
            <p className="composer__hint">
              {provider === null
                ? s.composerHintNoProvider
                : !hasKey
                  ? s.composerHintNoKey
                  : s.composerHint}
            </p>
          </form>

          <div className="flow-actions">
            <button
              type="button"
              className="btn btn--low-emphasis"
              onClick={() => navigate(prevStepPath(token, "solve")!)}
            >
              {s.backAction}
            </button>
            <button type="button" className="btn" onClick={openConfirm}>
              {s.primaryAction}
            </button>
          </div>
        </div>
      </div>

      {/* Submission confirmation modal (modal primitive) — one more check on
          the irreversible submission. Only "Final submit" finalizes the log
          and submission time, after which the retake lock takes effect (SC-4). */}
      {confirmOpen && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-modal-title"
            aria-describedby="submit-modal-body"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal__header">
              <h2 className="modal__title" id="submit-modal-title">
                {s.submitModal.title}
              </h2>
            </header>
            <div className="modal__body" id="submit-modal-body">
              {s.submitModal.body}
            </div>
            <footer className="modal__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setConfirmOpen(false)}
              >
                {s.submitModal.cancelAction}
              </button>
              <button
                type="button"
                className="btn"
                ref={confirmButtonRef}
                onClick={confirmSubmit}
              >
                {s.submitModal.confirmAction}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
