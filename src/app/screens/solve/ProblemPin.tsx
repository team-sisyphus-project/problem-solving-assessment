/*
 * ProblemPin — the assigned problem pinned above the conversation
 * ---------------------------------------------------------------------------
 * Once past the problem brief and into the conversation, there is no way to
 * see the problem's original text again. So we pin the problem right above
 * the conversation and let it collapse and expand — kept always expanded it
 * pushes the conversation away, and with no pin at all the candidate has to
 * leave the screen to check the problem.
 *
 * Even collapsed, the problem **title** remains. What is being solved must
 * stay visible even when folded, so the candidate never loses their bearings.
 * The state is conveyed by both the button text and aria-expanded (never
 * color or icon alone).
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import { strings } from "../../i18n";
import type { Problem } from "../../session/problems";

interface ProblemPinProps {
  problem: Problem;
}

export function ProblemPin({ problem }: ProblemPinProps) {
  const s = strings.screens.solve;
  const [open, setOpen] = useState(true);
  const bodyId = "problem-pin-body";

  return (
    <section className="problem-pin" aria-label={s.problemPinLabel}>
      <div className="problem-pin__head">
        <div className="problem-pin__heading">
          <span className="problem-pin__eyebrow">{s.problemPinLabel}</span>
          <h2 className="problem-pin__title">{problem.title}</h2>
        </div>
        <button
          type="button"
          className="btn btn--secondary"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? s.problemPinHide : s.problemPinShow}
        </button>
      </div>

      {open && (
        <p className="problem-pin__body" id={bodyId}>
          {problem.description}
        </p>
      )}
    </section>
  );
}
