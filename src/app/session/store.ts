/*
 * Invite session store — per-token assessment session (localStorage persistence)
 * ---------------------------------------------------------------------------
 * Minimal store keeping the spec's "data that must be recorded" on the
 * client. A real backend/API is out of scope (for this skeleton grain), so
 * sessions are saved to and read from browser localStorage keyed by token.
 * Sessions are isolated per token, so no candidate's data ever mixes with
 * another's.
 *
 * What a session holds (spec touchpoints):
 *   - candidate : the candidate's identifying details (name/email). null before identity verification.
 *   - problem   : the assigned problem (mock lookup, `problems.ts`)
 *   - messages  : the full conversation log (order + timestamp per message)
 *   - submittedAt : submission time (ISO). null if not submitted → the basis for the retake lock (M-5)
 *
 * The form/submission-modal logic itself is a later grain. This module only
 * provides the save/read contract.
 * ---------------------------------------------------------------------------
 */

import { assignProblem, type Problem } from "./problems";
import type { ProviderId } from "../llm";

/** Demo token for preview/deep-link default entry (the fallback target for the root and unknown paths) */
export const DEMO_TOKEN = "demo-2f9c4a";

export type MessageRole = "applicant" | "ai";

export interface ChatMessage {
  /** Sequence number within the session (1-based, in issue order) */
  id: number;
  /** Author role */
  role: MessageRole;
  /** Message body */
  text: string;
  /** Timestamp (ISO) — the log order/time recording requirement */
  at: string;
  /**
   * The AI provider that generated the response (attribution). Present only
   * on AI messages — never on candidate (applicant) messages. This is what
   * lets the review screen identify "which provider answered". Secret
   * boundary: only the provider identifier is carried, never the apiKey.
   */
  provider?: ProviderId;
}

export interface Candidate {
  name: string;
  email: string;
}

/**
 * Snapshot of one past submission — starting again **does not erase it**;
 * it accumulates here.
 *
 * We promised the candidate that submitting cannot be undone, and it is also
 * assessment material the reviewer will read. So "ignore the previous
 * submission and start with a new problem" does not overwrite the record —
 * it sets it aside, and the candidate can reopen it at any time.
 */
export interface SubmittedAttempt {
  /** Attempt number (1-based) — the first submission is 1 */
  attempt: number;
  /** The candidate's identifying details at that time */
  candidate: Candidate | null;
  /** The problem assigned at that time */
  problem: Problem;
  /** The full conversation log at that time */
  messages: ChatMessage[];
  /** Submission time (ISO) */
  submittedAt: string;
  /** Solving start time (ISO). null if absent */
  startedAt: string | null;
}

export interface InviteSession {
  /** Invite token (the storage key) */
  token: string;
  /** Candidate identifying details — null before identity verification */
  candidate: Candidate | null;
  /** Assigned problem (mock lookup result) */
  problem: Problem;
  /** Full conversation log (with order and timestamps) */
  messages: ChatMessage[];
  /** Submission time (ISO). null if not submitted */
  submittedAt: string | null;
  /**
   * Record of consent to data review (S-3/M-4). Stamped once at the moment
   * the consent gate on the identity verification screen is passed:
   * given=true, at=time of consent (ISO). null before consent.
   *
   * With no backend (shared storage) yet, it lives only in localStorage
   * alongside this session (depends on master-plan item 1). Once a backend
   * lands, this becomes real persistent storage.
   */
  consent: { given: boolean; at: string } | null;
  /**
   * Time solving began (ISO). The elapsed-time display on the solving screen
   * counts from this value. Kept in the session so a refresh does not reset
   * the clock to zero. null if solving has not started; note this is
   * **elapsed time**, not a time limit.
   *
   * It is not included in the evaluation material (EvaluationRecord) — it is
   * only an on-screen display for the candidate to pace themselves, not an
   * evaluation criterion.
   */
  startedAt: string | null;
  /** Current attempt (0-based). Increments by 1 each time the candidate starts fresh, leaving the previous submission in place */
  attempt: number;
  /** Past submitted attempts — never erased on a fresh start (oldest first) */
  history: SubmittedAttempt[];
}

/**
 * Evaluation material — the snapshot of one candidate's assessment consumed
 * by the client company's review screen.
 *
 * Assembles the spec's "data that must be recorded" (the touchpoint with the
 * client company's screen) into a single contract:
 *   - candidate  : candidate identifying details (name/email). null before identity verification.
 *   - problem    : the single assigned problem.
 *   - messages   : the full conversation log with order (id), timestamps (at), and provider attribution.
 *   - submittedAt: submission time (ISO). null if not submitted.
 *
 * Secret boundary: no secret such as apiKey is included anywhere in this
 * material. messages reuses the session log as-is, and the session log never
 * contains keys in the first place.
 */
export interface EvaluationRecord {
  /** Invite token — identifies which assessment this material belongs to */
  token: string;
  /** Candidate identifying details — null before identity verification */
  candidate: Candidate | null;
  /** The single assigned problem */
  problem: Problem;
  /** Full conversation log including order, timestamps, and provider attribution */
  messages: ChatMessage[];
  /** Submission time (ISO). null if not submitted */
  submittedAt: string | null;
}

const STORAGE_PREFIX = "invite-session:";

function storageKey(token: string): string {
  return `${STORAGE_PREFIX}${token}`;
}

/** localStorage access guard (safe even in disabled/throwing environments) */
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Reads the token's session. null if absent or unparsable */
export function getSession(token: string): InviteSession | null {
  const store = safeStorage();
  if (!store) return null;
  const raw = store.getItem(storageKey(token));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InviteSession;
    // startedAt, attempt, and history were added later, so sessions saved
    // earlier may lack them. Defaults are filled in here so readers do not
    // have to defend against that every time.
    return {
      ...parsed,
      startedAt: parsed.startedAt ?? null,
      attempt: parsed.attempt ?? 0,
      history: parsed.history ?? [],
      consent: parsed.consent ?? null,
    };
  } catch {
    return null;
  }
}

/** Saves the session (overwrite) */
export function saveSession(session: InviteSession): void {
  const store = safeStorage();
  if (!store) return;
  store.setItem(storageKey(session.token), JSON.stringify(session));
}

/**
 * Returns the token's session; if none exists, assigns a problem, creates a
 * new session, and saves it.
 * (The assigned problem is fixed at first access — M-2)
 */
export function getOrCreateSession(token: string): InviteSession {
  const existing = getSession(token);
  if (existing) return existing;
  const created: InviteSession = {
    token,
    candidate: null,
    problem: assignProblem(token),
    messages: [],
    submittedAt: null,
    consent: null,
    startedAt: null,
    attempt: 0,
    history: [],
  };
  saveSession(created);
  return created;
}

/**
 * After submitting, **start again with a new problem**.
 *
 * The previous submission is not erased — it is moved into history, the
 * attempt counter is raised, a different problem is assigned, and only the
 * conversation and timestamps are cleared. The candidate's identifying
 * details are kept, since it is the same person (they are confirmed again at
 * the identity verification step).
 *
 * On a session that has not been submitted yet, this does nothing — a guard
 * against accidentally wiping a conversation in progress.
 */
export function startNewAttempt(token: string): InviteSession {
  const session = getOrCreateSession(token);
  if (!session.submittedAt) return session;

  const archived: SubmittedAttempt = {
    attempt: session.attempt + 1,
    candidate: session.candidate,
    problem: session.problem,
    messages: session.messages,
    submittedAt: session.submittedAt,
    startedAt: session.startedAt,
  };
  const nextAttempt = session.attempt + 1;
  const next: InviteSession = {
    ...session,
    problem: assignProblem(token, nextAttempt),
    messages: [],
    submittedAt: null,
    startedAt: null,
    attempt: nextAttempt,
    history: [...session.history, archived],
  };
  saveSession(next);
  return next;
}

/**
 * Records the time solving began (keeps the existing time if already
 * started). Stamped exactly once when the solving screen is first reached,
 * and the same reference point survives later re-entries and refreshes.
 */
export function markStarted(token: string): InviteSession {
  const session = getOrCreateSession(token);
  if (session.startedAt) return session;
  const next = { ...session, startedAt: new Date().toISOString() };
  saveSession(next);
  return next;
}

/**
 * Records consent to data review (passing the consent gate on the identity
 * verification screen, S-3/M-4).
 *
 * Idempotent — if already recorded, the original consent time is kept; only
 * when absent is it stamped with given=true and at=now (ISO). Follows the
 * same "stamped once" convention as markStarted/markSubmitted.
 *
 * With no backend (shared storage) yet, this lives only in the localStorage
 * layer (depends on master-plan item 1). The policy for handling save
 * failures will be fleshed out once a backend exists.
 */
export function recordConsent(token: string): InviteSession {
  const session = getOrCreateSession(token);
  if (session.consent) return session;
  const next = {
    ...session,
    consent: { given: true, at: new Date().toISOString() },
  };
  saveSession(next);
  return next;
}

/** Records the candidate's identifying details (identity verification complete) */
export function setCandidate(token: string, candidate: Candidate): InviteSession {
  const session = getOrCreateSession(token);
  const next = { ...session, candidate };
  saveSession(next);
  return next;
}

/**
 * Appends one message to the conversation log. The store issues the sequence
 * number (id) and timestamp (at), and the updated session is returned.
 *
 * AI messages may carry the provider that generated the response as
 * attribution (provider). Candidate messages have no provider, so provider
 * is ignored unless role is "ai". Secrets such as apiKey are never part of
 * the arguments and never end up in the log.
 */
export function appendMessage(
  token: string,
  role: MessageRole,
  text: string,
  provider?: ProviderId,
): InviteSession {
  const session = getOrCreateSession(token);
  const nextId =
    session.messages.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  const message: ChatMessage = {
    id: nextId,
    role,
    text,
    at: new Date().toISOString(),
    // Provider attribution is valid only on AI responses (never carried on candidate messages).
    ...(role === "ai" && provider ? { provider } : {}),
  };
  const next = { ...session, messages: [...session.messages, message] };
  saveSession(next);
  return next;
}

/** Records the submission time (keeps the existing time if already submitted) */
export function markSubmitted(token: string): InviteSession {
  const session = getOrCreateSession(token);
  if (session.submittedAt) return session;
  const next = { ...session, submittedAt: new Date().toISOString() };
  saveSession(next);
  return next;
}

/** Whether submission is complete (retake lock) — the M-5 criterion */
export function isSubmitted(token: string): boolean {
  return getSession(token)?.submittedAt != null;
}

/**
 * Assembles the evaluation material for the client company's review screen
 * from the token's session.
 *
 * Gathers the candidate's identifying details, the assigned problem, the
 * full conversation log with order/timestamps/provider attribution, and the
 * submission time into one `EvaluationRecord`. If no session exists, one is
 * created with a problem assigned (fixed at first access, M-2). The returned
 * log is a copy of the session log, so later session changes do not leak
 * into material already assembled.
 *
 * Secret boundary: no secret such as apiKey appears anywhere in the returned
 * material — the session log itself never contains keys.
 */
export function buildEvaluationRecord(token: string): EvaluationRecord {
  const session = getOrCreateSession(token);
  return {
    token: session.token,
    candidate: session.candidate,
    problem: session.problem,
    messages: session.messages.map((m) => ({ ...m })),
    submittedAt: session.submittedAt,
  };
}
