/*
 * Flow structure (fixed) — the candidate's linear 4-step assessment flow · token scope
 * ---------------------------------------------------------------------------
 * Spec: the single definition that translates the "flow structure (fixed)"
 * rules from components/app-shell/base.md and components/navigation/base.md
 * into code. The router, step indicator (navigation), and screen transitions
 * all share this array, so step order is managed in exactly one place (no
 * scattering).
 *
 *   1. Identity verification  →  2. Problem brief  →  3. Problem solving  →  4. Submission complete
 *
 * - Every step lives under the invite-token scope (`/invite/:token/...`).
 *   Each step's `segment` is a path fragment relative to the token base.
 * - The token index (`/invite/:token`) is occupied not by one of the 4 flow
 *   steps but by the welcome intro screen that comes **before** them
 *   (`welcomePath`). The intro does not appear in the step indicator, and the
 *   first flow step is still identity verification (verify) — the 4-step
 *   structure itself is unchanged.
 * - Order is fixed left → right. Earlier steps are done, later ones upcoming.
 * - Submission complete (4) is the flow's terminal state (no forward motion
 *   afterwards).
 * - The previous flow's "LLM connect/select (connect)" step was removed
 *   (identity verification → problem brief directly, with no sign-up or
 *   connection). Identity verification (verify) and problem brief (brief) are
 *   new.
 * ---------------------------------------------------------------------------
 */

import { strings } from "./i18n";

export type StepId = "verify" | "brief" | "solve" | "complete";

/** Base path for invite-token-scoped routes */
export const INVITE_BASE = "/invite";

export interface FlowStep {
  /** Step identifier */
  id: StepId;
  /** Path fragment relative to the token base. The first step (verify) is the index (empty string) */
  segment: string;
  /** Short label shown in the step indicator */
  label: string;
}

/** Single definition of the linear flow — order is the step number (1-based) */
export const FLOW_STEPS: readonly FlowStep[] = [
  { id: "verify", segment: "verify", label: strings.screens.verify.stepLabel },
  { id: "brief", segment: "brief", label: strings.screens.brief.stepLabel },
  { id: "solve", segment: "solve", label: strings.screens.solve.stepLabel },
  { id: "complete", segment: "complete", label: strings.screens.complete.stepLabel },
] as const;

/** Builds the absolute path of a given step within the token scope (hash routing) */
export function invitePath(token: string, id: StepId): string {
  const step = FLOW_STEPS.find((s) => s.id === id) ?? FLOW_STEPS[0];
  const base = `${INVITE_BASE}/${token}`;
  return step.segment ? `${base}/${step.segment}` : base;
}

/**
 * Path of the welcome intro screen — the invite link's token index
 * (`/invite/:token`). It is not a flow step but a single welcome page right
 * before entering the flow, so it is not included in FLOW_STEPS.
 */
export function welcomePath(token: string): string {
  return `${INVITE_BASE}/${token}`;
}

/** Path of the token flow's first step (the intro CTA's destination and the in-flow fallback default) */
export function firstStepPath(token: string): string {
  return invitePath(token, FLOW_STEPS[0].id);
}

/** Step index (0-based). -1 if not found */
export function stepIndex(id: StepId): number {
  return FLOW_STEPS.findIndex((s) => s.id === id);
}

/** Token-scoped path of the next step. null if this is the terminal step */
export function nextStepPath(token: string, id: StepId): string | null {
  const i = stepIndex(id);
  if (i < 0 || i >= FLOW_STEPS.length - 1) return null;
  return invitePath(token, FLOW_STEPS[i + 1].id);
}

/** Token-scoped path of the previous step. null if this is the first step */
export function prevStepPath(token: string, id: StepId): string | null {
  const i = stepIndex(id);
  if (i <= 0) return null;
  return invitePath(token, FLOW_STEPS[i - 1].id);
}

/** Derives the current step id from a path fragment (the part after the token base). Falls back to the first step if nothing matches */
export function stepIdFromSegment(segment: string): StepId {
  const clean = segment.replace(/^\/+|\/+$/g, "");
  const found = FLOW_STEPS.find((s) => s.segment === clean);
  return found ? found.id : FLOW_STEPS[0].id;
}

/** Step status (done/current/upcoming) — for text and shape alongside color, never color alone */
export type StepStatus = "done" | "current" | "upcoming";

export function stepStatus(stepIdx: number, currentIdx: number): StepStatus {
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "current";
  return "upcoming";
}
