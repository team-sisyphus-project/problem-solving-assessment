/*
 * grain-1 — Session evaluation record contract + provider attribution
 * ---------------------------------------------------------------------------
 * Verifies directly at the store layer that buildEvaluationRecord assembles
 * the material for the client company's evaluation screen into a single
 * contract, that AI messages carry provider attribution, and that in no case
 * does a secret (apiKey) leak into the record or its serialization.
 *
 * Verification axes:
 *   (A) Evaluation material assembly — candidate, problem, ordered/timestamped
 *       messages, submittedAt
 *   (B) Provider attribution — only AI messages carry a provider; candidate
 *       utterances do not
 *   (C) Secret boundary — the apiKey is nowhere in logs, records, or serialization
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import {
  appendMessage,
  buildEvaluationRecord,
  getSession,
  setCandidate,
  markSubmitted,
  type EvaluationRecord,
} from "../../src/app/session/store";
import { assignProblem } from "../../src/app/session/problems";

const TOKEN = "eval-token";
const API_KEY = "sk-live-SECRET-DO-NOT-RECORD-42";

describe("grain-1 (A) evaluation material assembly", () => {
  it("returns candidate, problem, ordered/timestamped messages, and submittedAt as one material", () => {
    setCandidate(TOKEN, { name: "Jane Doe", email: "kim@example.com" });
    appendMessage(TOKEN, "applicant", "first question");
    appendMessage(TOKEN, "ai", "first reply", "gpt");
    markSubmitted(TOKEN);

    const record: EvaluationRecord = buildEvaluationRecord(TOKEN);

    expect(record.token).toBe(TOKEN);
    expect(record.candidate).toEqual({
      name: "Jane Doe",
      email: "kim@example.com",
    });
    expect(record.problem.id).toBe(assignProblem(TOKEN).id);
    expect(record.submittedAt).not.toBeNull();

    // Order (id) and time (at) are carried on each message.
    expect(record.messages.map((m) => m.id)).toEqual([1, 2]);
    for (const m of record.messages) {
      expect(typeof m.at).toBe("string");
      expect(m.at.length).toBeGreaterThan(0);
    }
    expect(record.messages.map((m) => [m.role, m.text])).toEqual([
      ["applicant", "first question"],
      ["ai", "first reply"],
    ]);
  });

  it("before identity verification and submission, candidate and submittedAt are null and the problem is assigned", () => {
    const record = buildEvaluationRecord(TOKEN);
    expect(record.candidate).toBeNull();
    expect(record.submittedAt).toBeNull();
    expect(record.problem.id).toBe(assignProblem(TOKEN).id);
    expect(record.messages).toEqual([]);
  });

  it("the returned log is a copy, so later session changes do not leak into already-assembled material", () => {
    appendMessage(TOKEN, "applicant", "question A");
    const record = buildEvaluationRecord(TOKEN);
    appendMessage(TOKEN, "ai", "later reply", "claude");

    // A message added after the snapshot is not reflected in the material
    // already built.
    expect(record.messages).toHaveLength(1);
    expect(record.messages[0].text).toBe("question A");
  });
});

describe("grain-1 (B) provider attribution", () => {
  it("AI messages carry the provider", () => {
    appendMessage(TOKEN, "ai", "Gemini reply", "gemini");
    const [ai] = getSession(TOKEN)!.messages;
    expect(ai.provider).toBe("gemini");
  });

  it("candidate utterances do not carry a provider (ignored even if passed)", () => {
    // Even if a provider is passed by mistake, it is not attached to an
    // applicant message.
    appendMessage(TOKEN, "applicant", "candidate utterance", "gpt");
    const [applicant] = getSession(TOKEN)!.messages;
    expect(applicant.provider).toBeUndefined();
  });

  it("appending without a provider creates no provider field", () => {
    appendMessage(TOKEN, "ai", "reply without provider");
    const [ai] = getSession(TOKEN)!.messages;
    expect(ai.provider).toBeUndefined();
  });
});

describe("grain-1 (C) secret boundary — apiKey absence", () => {
  it("the serialized evaluation material contains no apiKey", () => {
    setCandidate(TOKEN, { name: "Alex Kim", email: "lee@example.com" });
    appendMessage(TOKEN, "applicant", "question");
    appendMessage(TOKEN, "ai", "reply", "claude");
    markSubmitted(TOKEN);

    const record = buildEvaluationRecord(TOKEN);
    const serialized = JSON.stringify(record);

    expect(serialized).not.toContain(API_KEY);
    expect(record).not.toHaveProperty("apiKey");
    for (const m of record.messages) {
      expect(m).not.toHaveProperty("apiKey");
    }
  });
});
