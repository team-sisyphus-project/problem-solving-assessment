/*
 * grain-1 — 세션 평가 기록 계약 + 제공자 귀속 검증
 * ---------------------------------------------------------------------------
 * buildEvaluationRecord가 고객사 평가 화면의 재료를 하나의 계약으로 조립하는지,
 * AI 메시지에 제공자 귀속이 실리는지, 그리고 어떤 경우에도 비밀값(apiKey)이
 * 기록·직렬화에 새지 않는지를 스토어 계층에서 직접 검증한다.
 *
 * 검증 축:
 *   (A) 평가 재료 조립 — candidate·problem·순서/시각 메시지·submittedAt
 *   (B) 제공자 귀속 — AI 메시지에만 provider가 실리고 지원자 발화에는 없다
 *   (C) 비밀 경계 — apiKey는 로그·기록·직렬화 어디에도 없다
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

describe("grain-1 (A) 평가 재료 조립", () => {
  it("candidate·problem·순서/시각 메시지·submittedAt을 하나의 재료로 반환한다", () => {
    setCandidate(TOKEN, { name: "김지원", email: "kim@example.com" });
    appendMessage(TOKEN, "applicant", "첫 질문");
    appendMessage(TOKEN, "ai", "첫 응답", "gpt");
    markSubmitted(TOKEN);

    const record: EvaluationRecord = buildEvaluationRecord(TOKEN);

    expect(record.token).toBe(TOKEN);
    expect(record.candidate).toEqual({
      name: "김지원",
      email: "kim@example.com",
    });
    expect(record.problem.id).toBe(assignProblem(TOKEN).id);
    expect(record.submittedAt).not.toBeNull();

    // 순서(id)와 시각(at)이 각 메시지에 실린다.
    expect(record.messages.map((m) => m.id)).toEqual([1, 2]);
    for (const m of record.messages) {
      expect(typeof m.at).toBe("string");
      expect(m.at.length).toBeGreaterThan(0);
    }
    expect(record.messages.map((m) => [m.role, m.text])).toEqual([
      ["applicant", "첫 질문"],
      ["ai", "첫 응답"],
    ]);
  });

  it("본인 확인·제출 전이면 candidate·submittedAt은 null이고 문제는 배정된다", () => {
    const record = buildEvaluationRecord(TOKEN);
    expect(record.candidate).toBeNull();
    expect(record.submittedAt).toBeNull();
    expect(record.problem.id).toBe(assignProblem(TOKEN).id);
    expect(record.messages).toEqual([]);
  });

  it("반환 로그는 복사본이라 이후 세션 변경이 이미 조립된 재료에 새지 않는다", () => {
    appendMessage(TOKEN, "applicant", "질문 A");
    const record = buildEvaluationRecord(TOKEN);
    appendMessage(TOKEN, "ai", "나중 응답", "claude");

    // 스냅샷 시점 이후 추가된 메시지는 이미 만든 재료에 반영되지 않는다.
    expect(record.messages).toHaveLength(1);
    expect(record.messages[0].text).toBe("질문 A");
  });
});

describe("grain-1 (B) 제공자 귀속", () => {
  it("AI 메시지에는 제공자가 실린다", () => {
    appendMessage(TOKEN, "ai", "제미나이 응답", "gemini");
    const [ai] = getSession(TOKEN)!.messages;
    expect(ai.provider).toBe("gemini");
  });

  it("지원자 발화에는 제공자를 싣지 않는다(전달돼도 무시)", () => {
    // 실수로 provider를 넘겨도 applicant 메시지에는 붙지 않는다.
    appendMessage(TOKEN, "applicant", "지원자 발화", "gpt");
    const [applicant] = getSession(TOKEN)!.messages;
    expect(applicant.provider).toBeUndefined();
  });

  it("제공자 없이 append하면 provider 필드가 생기지 않는다", () => {
    appendMessage(TOKEN, "ai", "제공자 미지정 응답");
    const [ai] = getSession(TOKEN)!.messages;
    expect(ai.provider).toBeUndefined();
  });
});

describe("grain-1 (C) 비밀 경계 — apiKey 부재", () => {
  it("직렬화된 평가 재료에 apiKey가 없다", () => {
    setCandidate(TOKEN, { name: "이응시", email: "lee@example.com" });
    appendMessage(TOKEN, "applicant", "질문");
    appendMessage(TOKEN, "ai", "응답", "claude");
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
