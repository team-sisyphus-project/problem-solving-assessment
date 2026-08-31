/*
 * PreviousSubmission — when re-entering the flow through an already-submitted link
 * ---------------------------------------------------------------------------
 * We used to **lock** the flow here ("Already submitted"). Locking is safe,
 * but from the candidate's perspective it was a dead-end screen where they
 * could not even see what they had submitted. So instead of blocking, we
 * offer choices.
 *
 *   1. Read what was submitted      — unfold the previous conversation log as is.
 *   2. Leave it and finish          — go to the submission-complete screen.
 *   3. Start over with a new problem — bump the attempt, receive a different
 *      problem, and begin from the start.
 *
 * Whichever they choose, **the previous submission is never deleted**. We
 * promised that submission is irreversible, and it is also material the
 * reviewer will examine, so "start over" is not an overwrite but a setting
 * aside (the store's history). That fact is also stated in the copy next to
 * the button.
 *
 * Zero hardcoded styles — values depend only on the primitives and the token
 * classes in flow-screens.css.
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { invitePath, welcomePath } from "../flow";
import { defaultLocale, strings } from "../i18n";
import { startNewAttempt, type InviteSession } from "../session/store";

interface PreviousSubmissionProps {
  /** The current session that has completed submission */
  session: InviteSession;
}

/**
 * Formats an ISO timestamp into a readable form.
 *
 * Using the browser's default locale (toLocaleString()) mixes in Korean text
 * on Korean-language browsers (e.g. "2026. 8. 27." with a Korean AM/PM
 * marker) — this product is English-only, so we pin the app's locale to keep
 * the output consistent with the screen language.
 */
function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(defaultLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function PreviousSubmission({ session }: PreviousSubmissionProps) {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const s = strings.screens.previous;
  const solve = strings.screens.solve;

  const [open, setOpen] = useState(false);
  const logId = "previous-submission-log";

  function handleRestart() {
    // Move the previous submission to history, assign a new problem, and start again from the beginning (welcome).
    startNewAttempt(token);
    navigate(welcomePath(token));
  }

  return (
    <div className="flow-screen">
      <div className="flow-panel previous">
        <div className="empty-state empty-state--start">
          <h1 className="empty-state__title">{s.title}</h1>
          <p className="empty-state__description">{s.description}</p>
        </div>

        {/* What was submitted and when — this much is visible without unfolding */}
        <dl className="previous__summary">
          <div className="previous__row">
            <dt className="previous__term">{s.submittedAtLabel}</dt>
            <dd className="previous__value">
              {session.submittedAt ? formatMoment(session.submittedAt) : "—"}
            </dd>
          </div>
          <div className="previous__row">
            <dt className="previous__term">{s.problemLabel}</dt>
            <dd className="previous__value">{session.problem.title}</dd>
          </div>
          <div className="previous__row">
            <dt className="previous__term">{s.messagesLabel}</dt>
            <dd className="previous__value">{session.messages.length}</dd>
          </div>
          <div className="previous__row">
            <dt className="previous__term">{s.attemptLabel}</dt>
            <dd className="previous__value">{session.attempt + 1}</dd>
          </div>
        </dl>

        <div className="flow-actions flow-actions--start">
          <button
            type="button"
            className="btn btn--secondary"
            aria-expanded={open}
            aria-controls={logId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? s.hideAction : s.viewAction}
          </button>
        </div>

        {/* Reread the submitted conversation as is (read-only — cannot continue writing) */}
        {open && (
          <div className="previous__log" id={logId}>
            {session.messages.length === 0 ? (
              <p className="previous__empty">{s.emptyLog}</p>
            ) : (
              session.messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "applicant"
                      ? "message-bubble message-bubble--applicant"
                      : "message-bubble"
                  }
                >
                  <span className="message-bubble__author">
                    {m.role === "applicant"
                      ? solve.authorApplicant
                      : m.provider
                        ? strings.providers[m.provider]
                        : solve.authorAi}
                  </span>
                  <p className="message-bubble__body">{m.text}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Where we ask about starting over — saying first what goes away and what remains */}
        <div className="previous__restart">
          <h2 className="previous__restart-title">{s.restartTitle}</h2>
          <p className="previous__restart-body">{s.restartBody}</p>
          <div className="flow-actions flow-actions--start">
            <button type="button" className="btn" onClick={handleRestart}>
              {s.restartAction}
            </button>
            <button
              type="button"
              className="btn btn--low-emphasis"
              onClick={() => navigate(invitePath(token, "complete"))}
            >
              {s.keepAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
