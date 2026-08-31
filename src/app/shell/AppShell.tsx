/*
 * AppShell — layout shell component
 * ---------------------------------------------------------------------------
 * Spec: components/app-shell/base.md
 * The top-level frame composed of a header (product identity + step indicator),
 * the main outlet (<Outlet/>), and the content container. It is the shared
 * skeleton that stays unchanged as flow steps change, and the main outlet
 * renders exactly one step at a time (principle 3 — one focus per screen).
 *
 * The current step is derived from the route path and reflected in StepNav
 * (updated automatically as screens swap). Style values depend only on the
 * token classes in app-shell.css.
 *
 * The backdrop is the same sky painting as the welcome intro, laid down in its
 * calm variant. The world should not change when moving from the intro into
 * the flow, but it only bleeds faintly into the lower part of the screen so
 * the readability of forms and conversation stays intact. The brand mark is
 * the same one used in the intro.
 *
 * Re-entry after submission (SC-4/M-5 revision): if the token is already
 * submitted, deep-linking/re-entering any step of the flow (identity
 * verification, problem brief, problem solving) renders the **previous
 * submission notice** (PreviousSubmission) instead of the child screen. We
 * used to lock the flow here, but that was a dead-end screen where candidates
 * could not even see what they had submitted. Now we let them read their
 * previous submission, or **ask** whether to leave it as is or start over with
 * a new problem — either way, the previous submission is never deleted (it is
 * moved to the store's history).
 *
 * The only exception is the submission-complete screen (complete), the
 * destination right after submitting — only there does the child screen
 * (<Outlet/>) still get through. The structure of placing the guard at the
 * shell layer rather than in individual screens, so it applies uniformly
 * across the whole flow, remains unchanged.
 * ---------------------------------------------------------------------------
 */

import { Outlet, useLocation, useParams } from "react-router-dom";
import { FLOW_STEPS, INVITE_BASE, stepIdFromSegment, welcomePath } from "../flow";
import { strings } from "../i18n";
import { getOrCreateSession } from "../session/store";
import { PreviousSubmission } from "../screens/PreviousSubmission";
import { SkyBackdrop } from "../screens/welcome/SkyBackdrop";
import { BrandMark } from "./BrandMark";
import { StepNav } from "./StepNav";

export function AppShell() {
  const { pathname } = useLocation();
  const { token = "" } = useParams();

  // Establish the session on first access to the token (fixing the assigned
  // problem, etc.). Subsequent screens reuse it.
  const session = getOrCreateSession(token);

  // Derive the flow step from the current path segment (after the token base).
  // If nothing matches, fall back to the first step.
  const base = `${INVITE_BASE}/${token}`;
  const segment = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const currentStepId = stepIdFromSegment(segment);
  const currentStep =
    FLOW_STEPS.find((s) => s.id === currentStepId) ?? FLOW_STEPS[0];

  // Re-entry after submission — if submitted, render the previous submission
  // notice instead of the child screen on every step except complete.
  // Complete is exempt because it is the destination right after submitting.
  const showPrevious =
    currentStep.id !== "complete" && session.submittedAt != null;

  // Only the steps that use the two-column layout (identity verification,
  // problem solving) use the wide content width (app-shell base: md~lg). The
  // lock notice keeps the narrow width (same as the other empty-state
  // screens).
  const isWide =
    !showPrevious &&
    (currentStep.id === "solve" || currentStep.id === "verify");
  const containerClass = isWide
    ? "app-shell__container app-shell__container--wide"
    : "app-shell__container";

  return (
    <div className="app-shell">
      {/* The same sky as the welcome intro, in its calm version — a unified backdrop for the whole flow */}
      <SkyBackdrop variant="calm" className="app-shell__backdrop" />

      <header className="app-shell__header">
        <div className="app-shell__brand">
          {/* Clicking the mark returns to the start (welcome) — never blocked, even after submitting */}
          <BrandMark tone="on-surface" to={welcomePath(token)} />
          <span className="app-shell__context">{strings.app.context}</span>
        </div>
        <StepNav current={currentStep.id} />
      </header>

      <main className="app-shell__main">
        <div className={containerClass}>
          {showPrevious ? (
            <PreviousSubmission session={session} />
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}
