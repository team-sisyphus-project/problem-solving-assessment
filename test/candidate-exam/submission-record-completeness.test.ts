/*
 * grain-2 — Submission record completeness · key exclusion (M-4, non-UI)
 * ---------------------------------------------------------------------------
 * Reproduces the whole BYOP send-to-submission path without any screen
 * (store + llm boundary) and automatically verifies that the result forms
 * complete material for the client company's evaluation screen, and that the
 * candidate's own API key never leaks anywhere along the way.
 *
 * Verification axes:
 *   (A) Post-submission completeness — the session stores the full log
 *       including order (id) and time (at) plus the submission time, and
 *       buildEvaluationRecord yields candidate, problem, chronological
 *       transcript, and submission time as one complete material.
 *   (B) Chronological transcript — the transcript is chronological both by
 *       utterance order (ascending id) and by time (non-decreasing at), and
 *       the submission time comes after the last utterance.
 *   (C) Key exclusion (entire send-to-submission path) — the candidate's key
 *       flows only as a sendChat argument and never appears in sent messages,
 *       session serialization, localStorage, or evaluation material.
 *
 * Non-UI: SolveScreen is not rendered (key non-persistence from the screen
 * wiring perspective is already covered by grain-3
 * byop-privacy-accumulation.test.tsx). Re-verifying the adapter mapping
 * (request/response shapes) is also out of scope — only the llm boundary
 * (sendChat) is mocked, confirming just that "the send happened and the key
 * was consumed only as an argument".
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock only the llm boundary — real REST calls / adapter mapping are untouched
// (out of scope).
const { sendChatMock } = vi.hoisted(() => ({ sendChatMock: vi.fn() }));
vi.mock("../../src/app/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/app/llm")>();
  return { ...actual, sendChat: sendChatMock };
});

import {
  sendChat,
  type ChatMessage as LlmChatMessage,
  type ProviderId,
} from "../../src/app/llm";
import {
  appendMessage,
  buildEvaluationRecord,
  getSession,
  markSubmitted,
  setCandidate,
  type ChatMessage,
} from "../../src/app/session/store";
import { assignProblem } from "../../src/app/session/problems";

const TOKEN = "submit-token";
const API_KEY = "sk-live-NEVER-RECORD-THIS-7b2e1d";
const CANDIDATE = { name: "Jane Doe", email: "park@example.com" } as const;

/** Session log -> adapter input mapping (starting with user, alternating),
 * building the send payload. */
function toAdapterMessages(log: ChatMessage[]): LlmChatMessage[] {
  return log.map((m) => ({
    role: (m.role === "applicant" ? "user" : "assistant") as LlmChatMessage["role"],
    content: m.text,
  }));
}

/**
 * Reproduces one BYOP send round without a screen: records the candidate's
 * utterance, sends the accumulated log to sendChat with the selected provider
 * and the candidate's own key, then records the reply with provider
 * attribution. The key flows only as a sendChat argument — it is never passed
 * down the recording path.
 */
async function byopRound(provider: ProviderId, text: string): Promise<void> {
  const afterUser = appendMessage(TOKEN, "applicant", text).messages;
  const reply = await sendChat(provider, API_KEY, toAdapterMessages(afterUser));
  appendMessage(TOKEN, "ai", reply, provider);
}

/** Dumps all of localStorage (key names + values) into a single string. */
function dumpLocalStorage(): string {
  const parts: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i)!;
    parts.push(k, window.localStorage.getItem(k) ?? "");
  }
  return parts.join(" ");
}

describe("grain-2 (A) post-submission record completeness", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
    // Deterministic clock makes the order/time assertions strong (advance 1
    // second per utterance).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T10:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("the session stores the full log with order and time plus the submission time, and the material is complete", async () => {
    sendChatMock
      .mockResolvedValueOnce("first reply")
      .mockResolvedValueOnce("second reply");

    setCandidate(TOKEN, { ...CANDIDATE });

    await byopRound("gpt", "first question");
    vi.advanceTimersByTime(1000);
    await byopRound("claude", "second question");
    vi.advanceTimersByTime(1000);
    markSubmitted(TOKEN);

    // The session (storage) persists the full log with order and time + the
    // submission time.
    const session = getSession(TOKEN)!;
    expect(session).not.toBeNull();
    expect(session.messages).toHaveLength(4);
    expect(session.messages.map((m) => m.id)).toEqual([1, 2, 3, 4]);
    expect(session.submittedAt).not.toBeNull();

    // Material assembly — candidate identity, assigned problem, chronological
    // transcript, and submission time as one contract.
    const record = buildEvaluationRecord(TOKEN);
    expect(record.candidate).toEqual({ ...CANDIDATE });
    expect(record.problem.id).toBe(assignProblem(TOKEN).id);
    expect(record.submittedAt).toBe(session.submittedAt);

    // Transcript: role, body, sequence number, and provider attribution are
    // complete in utterance order.
    expect(record.messages.map((m) => [m.role, m.text])).toEqual([
      ["applicant", "first question"],
      ["ai", "first reply"],
      ["applicant", "second question"],
      ["ai", "second reply"],
    ]);
    expect(record.messages.map((m) => m.provider)).toEqual([
      undefined,
      "gpt",
      undefined,
      "claude",
    ]);

    // Every message carries a time (at) that matches the deterministic clock
    // exactly.
    expect(record.messages.map((m) => m.at)).toEqual([
      "2026-08-04T10:00:00.000Z",
      "2026-08-04T10:00:00.000Z",
      "2026-08-04T10:00:01.000Z",
      "2026-08-04T10:00:01.000Z",
    ]);
    // The submission time is recorded as a moment after the last utterance.
    expect(record.submittedAt).toBe("2026-08-04T10:00:02.000Z");
  });

  it("the submission time is not earlier than the last utterance time (submission comes after the conversation)", async () => {
    sendChatMock.mockResolvedValueOnce("reply");
    await byopRound("gemini", "question");
    vi.advanceTimersByTime(5000);
    markSubmitted(TOKEN);

    const record = buildEvaluationRecord(TOKEN);
    const lastAt = record.messages[record.messages.length - 1].at;
    expect(
      Date.parse(record.submittedAt!) >= Date.parse(lastAt),
    ).toBe(true);
  });
});

describe("grain-2 (B) chronological transcript", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T09:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("the transcript is in ascending sequence (id) order and its times (at) are non-decreasing", async () => {
    sendChatMock
      .mockResolvedValueOnce("reply A")
      .mockResolvedValueOnce("reply B")
      .mockResolvedValueOnce("reply C");

    await byopRound("gpt", "question A");
    vi.advanceTimersByTime(1000);
    await byopRound("gpt", "question B");
    vi.advanceTimersByTime(1000);
    await byopRound("gpt", "question C");

    const record = buildEvaluationRecord(TOKEN);

    // ids ascend 1..N in issuance order.
    const ids = record.messages.map((m) => m.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(ids).toEqual([1, 2, 3, 4, 5, 6]);

    // Every at is a valid ISO time and not earlier than the preceding
    // utterance (non-decreasing).
    const times = record.messages.map((m) => Date.parse(m.at));
    for (const t of times) expect(Number.isNaN(t)).toBe(false);
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i] >= times[i - 1]).toBe(true);
    }

    // id order and time order agree (the transcript is chronological).
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

describe("grain-2 (C) key exclusion — entire BYOP send-to-submission path", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
  });

  it("the key flows only as a sendChat argument and is never carried in the sent messages", async () => {
    sendChatMock.mockResolvedValueOnce("reply");
    await byopRound("claude", "boundary check");

    // sendChat is called as (provider, apiKey, messages); the key appears only
    // as the second argument.
    const [providerArg, keyArg, messagesArg] = sendChatMock.mock.calls[0];
    expect(providerArg).toBe("claude");
    expect(keyArg).toBe(API_KEY);
    expect(JSON.stringify(messagesArg)).not.toContain(API_KEY);
  });

  it("throughout send-to-submission the key is nowhere in the session, localStorage, or evaluation material", async () => {
    sendChatMock
      .mockResolvedValueOnce("reply 1")
      .mockResolvedValueOnce("reply 2");

    setCandidate(TOKEN, { ...CANDIDATE });
    await byopRound("gpt", "question 1");
    await byopRound("gemini", "question 2");
    markSubmitted(TOKEN);

    // Saved session: the conversation log stays, but no key field and no key value.
    const session = getSession(TOKEN)!;
    expect(session.messages.length).toBeGreaterThan(0);
    expect(session).not.toHaveProperty("apiKey");
    expect(JSON.stringify(session)).not.toContain(API_KEY);

    // Not in the full localStorage dump (key names + values) either.
    expect(dumpLocalStorage()).not.toContain(API_KEY);

    // Not in the evaluation material (or its serialization) — the key does not
    // leak into the client company's screen material.
    const record = buildEvaluationRecord(TOKEN);
    expect(record).not.toHaveProperty("apiKey");
    for (const m of record.messages) {
      expect(m).not.toHaveProperty("apiKey");
      expect(m.text).not.toContain(API_KEY);
    }
    expect(JSON.stringify(record)).not.toContain(API_KEY);
  });

  it("the key does not accumulate in any storage path even across multiple send rounds", async () => {
    sendChatMock
      .mockResolvedValueOnce("r1")
      .mockResolvedValueOnce("r2")
      .mockResolvedValueOnce("r3");

    await byopRound("gpt", "round 1");
    await byopRound("gpt", "round 2");
    await byopRound("gpt", "round 3");
    markSubmitted(TOKEN);

    expect(dumpLocalStorage()).not.toContain(API_KEY);
    expect(JSON.stringify(buildEvaluationRecord(TOKEN))).not.toContain(API_KEY);
  });
});
