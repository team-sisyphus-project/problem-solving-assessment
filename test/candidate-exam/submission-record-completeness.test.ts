/*
 * grain-2 — 제출 기록 완결성 · 키 배제 검증 (M-4, 비-UI)
 * ---------------------------------------------------------------------------
 * BYOP 전송→제출까지의 전 과정을 화면 없이(store + llm 경계) 재현하고, 그 결과가
 * 고객사 평가 화면의 완결된 재료가 되는지, 그리고 그 과정 어디에서도 본인 API
 * 키가 새지 않는지를 자동 검증한다.
 *
 * 검증 축:
 *   (A) 제출 후 완결성 — 세션에 순서(id)·시각(at) 포함 전체 로그와 제출 시각이
 *       저장되고, buildEvaluationRecord가 candidate·problem·시간순 전사·제출
 *       시각을 하나의 완결된 재료로 산출한다.
 *   (B) 시간순 전사 — 전사가 발화 순서(id 오름차순)와 시각(at 비감소) 모두에서
 *       시간순이며, 제출 시각은 마지막 발화 이후다.
 *   (C) 키 배제(전송→제출 전 과정) — 본인 키는 sendChat 인자로만 흐르고, 전송
 *       메시지·세션 직렬화·localStorage·평가 재료 어디에도 나타나지 않는다.
 *
 * 비-UI: SolveScreen을 렌더하지 않는다(화면 배선 관점의 키 비영속은 grain-3
 * byop-privacy-accumulation.test.tsx가 이미 커버). 어댑터 매핑(요청/응답 형태)
 * 재검증도 범위 밖 — llm 경계(sendChat)만 목킹해 "전송이 일어났고 키가 인자로만
 * 소비된다"는 사실만 확인한다.
 * ---------------------------------------------------------------------------
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// llm 경계만 목킹 — 실제 REST 호출/어댑터 매핑은 건드리지 않는다(범위 밖).
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
const CANDIDATE = { name: "박응시", email: "park@example.com" } as const;

/** 세션 로그 → 어댑터 입력(user로 시작해 교대) 매핑(전송 페이로드 구성). */
function toAdapterMessages(log: ChatMessage[]): LlmChatMessage[] {
  return log.map((m) => ({
    role: (m.role === "applicant" ? "user" : "assistant") as LlmChatMessage["role"],
    content: m.text,
  }));
}

/**
 * BYOP 전송 한 라운드를 화면 없이 재현한다: 지원자 발화를 기록하고, 누적 로그를
 * 선택된 제공자·본인 키로 sendChat에 보낸 뒤, 응답을 제공자 귀속과 함께 기록한다.
 * 키는 sendChat 인자로만 흐른다 — 기록 경로로는 넘기지 않는다.
 */
async function byopRound(provider: ProviderId, text: string): Promise<void> {
  const afterUser = appendMessage(TOKEN, "applicant", text).messages;
  const reply = await sendChat(provider, API_KEY, toAdapterMessages(afterUser));
  appendMessage(TOKEN, "ai", reply, provider);
}

/** localStorage 전체(키 이름 + 값)를 하나의 문자열로 덤프한다. */
function dumpLocalStorage(): string {
  const parts: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i)!;
    parts.push(k, window.localStorage.getItem(k) ?? "");
  }
  return parts.join(" ");
}

describe("grain-2 (A) 제출 후 기록 완결성", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
    // 결정적 시각으로 순서·시각 단언을 강하게 만든다(발화마다 1초 진행).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T10:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("세션에 순서·시각 포함 전체 로그와 제출 시각이 저장되고, 재료가 완결된다", async () => {
    sendChatMock
      .mockResolvedValueOnce("첫 응답")
      .mockResolvedValueOnce("둘째 응답");

    setCandidate(TOKEN, { ...CANDIDATE });

    await byopRound("gpt", "첫 질문");
    vi.advanceTimersByTime(1000);
    await byopRound("claude", "둘째 질문");
    vi.advanceTimersByTime(1000);
    markSubmitted(TOKEN);

    // 세션(저장소)에 순서·시각 포함 전체 로그 + 제출 시각이 영속된다.
    const session = getSession(TOKEN)!;
    expect(session).not.toBeNull();
    expect(session.messages).toHaveLength(4);
    expect(session.messages.map((m) => m.id)).toEqual([1, 2, 3, 4]);
    expect(session.submittedAt).not.toBeNull();

    // 재료 조립 — 지원자 식별 정보·배정 문제·시간순 전사·제출 시각이 한 계약으로.
    const record = buildEvaluationRecord(TOKEN);
    expect(record.candidate).toEqual({ ...CANDIDATE });
    expect(record.problem.id).toBe(assignProblem(TOKEN).id);
    expect(record.submittedAt).toBe(session.submittedAt);

    // 전사: 역할·본문·순번·제공자 귀속이 발화 순서 그대로 완결됐다.
    expect(record.messages.map((m) => [m.role, m.text])).toEqual([
      ["applicant", "첫 질문"],
      ["ai", "첫 응답"],
      ["applicant", "둘째 질문"],
      ["ai", "둘째 응답"],
    ]);
    expect(record.messages.map((m) => m.provider)).toEqual([
      undefined,
      "gpt",
      undefined,
      "claude",
    ]);

    // 각 메시지에 시각(at)이 실리고, 결정적 시각과 정확히 일치한다.
    expect(record.messages.map((m) => m.at)).toEqual([
      "2026-08-04T10:00:00.000Z",
      "2026-08-04T10:00:00.000Z",
      "2026-08-04T10:00:01.000Z",
      "2026-08-04T10:00:01.000Z",
    ]);
    // 제출 시각은 마지막 발화 이후 시점으로 기록된다.
    expect(record.submittedAt).toBe("2026-08-04T10:00:02.000Z");
  });

  it("제출 시각은 마지막 발화 시각보다 이르지 않다(제출이 대화 뒤에 온다)", async () => {
    sendChatMock.mockResolvedValueOnce("응답");
    await byopRound("gemini", "질문");
    vi.advanceTimersByTime(5000);
    markSubmitted(TOKEN);

    const record = buildEvaluationRecord(TOKEN);
    const lastAt = record.messages[record.messages.length - 1].at;
    expect(
      Date.parse(record.submittedAt!) >= Date.parse(lastAt),
    ).toBe(true);
  });
});

describe("grain-2 (B) 시간순 전사", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T09:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("전사는 순번(id) 오름차순이며 시각(at)도 비감소로 시간순이다", async () => {
    sendChatMock
      .mockResolvedValueOnce("A 응답")
      .mockResolvedValueOnce("B 응답")
      .mockResolvedValueOnce("C 응답");

    await byopRound("gpt", "A 질문");
    vi.advanceTimersByTime(1000);
    await byopRound("gpt", "B 질문");
    vi.advanceTimersByTime(1000);
    await byopRound("gpt", "C 질문");

    const record = buildEvaluationRecord(TOKEN);

    // id는 발급 순서대로 1..N 오름차순.
    const ids = record.messages.map((m) => m.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(ids).toEqual([1, 2, 3, 4, 5, 6]);

    // 각 at는 유효한 ISO 시각이며, 앞선 발화보다 이르지 않다(비감소).
    const times = record.messages.map((m) => Date.parse(m.at));
    for (const t of times) expect(Number.isNaN(t)).toBe(false);
    for (let i = 1; i < times.length; i += 1) {
      expect(times[i] >= times[i - 1]).toBe(true);
    }

    // id 순서와 시각 순서가 일치한다(전사가 곧 시간순).
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

describe("grain-2 (C) 키 배제 — BYOP 전송→제출 전 과정", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
  });

  it("키는 sendChat 인자로만 흐르고 전송 메시지에는 담기지 않는다", async () => {
    sendChatMock.mockResolvedValueOnce("응답");
    await byopRound("claude", "경계 확인");

    // sendChat은 (provider, apiKey, messages)로 호출되며, 키는 두 번째 인자뿐.
    const [providerArg, keyArg, messagesArg] = sendChatMock.mock.calls[0];
    expect(providerArg).toBe("claude");
    expect(keyArg).toBe(API_KEY);
    expect(JSON.stringify(messagesArg)).not.toContain(API_KEY);
  });

  it("전송→제출 전 과정에서 키가 세션·localStorage·평가 재료 어디에도 없다", async () => {
    sendChatMock
      .mockResolvedValueOnce("응답 1")
      .mockResolvedValueOnce("응답 2");

    setCandidate(TOKEN, { ...CANDIDATE });
    await byopRound("gpt", "질문 1");
    await byopRound("gemini", "질문 2");
    markSubmitted(TOKEN);

    // 저장 세션: 대화 로그는 남지만 키 필드·키 값은 없다.
    const session = getSession(TOKEN)!;
    expect(session.messages.length).toBeGreaterThan(0);
    expect(session).not.toHaveProperty("apiKey");
    expect(JSON.stringify(session)).not.toContain(API_KEY);

    // localStorage 전체 덤프(키 이름 + 값)에도 없다.
    expect(dumpLocalStorage()).not.toContain(API_KEY);

    // 평가 재료(및 직렬화)에도 없다 — 고객사 화면 재료로 키가 새지 않는다.
    const record = buildEvaluationRecord(TOKEN);
    expect(record).not.toHaveProperty("apiKey");
    for (const m of record.messages) {
      expect(m).not.toHaveProperty("apiKey");
      expect(m.text).not.toContain(API_KEY);
    }
    expect(JSON.stringify(record)).not.toContain(API_KEY);
  });

  it("여러 라운드를 전송해도 키가 저장 경로에 누적되지 않는다", async () => {
    sendChatMock
      .mockResolvedValueOnce("r1")
      .mockResolvedValueOnce("r2")
      .mockResolvedValueOnce("r3");

    await byopRound("gpt", "라운드 1");
    await byopRound("gpt", "라운드 2");
    await byopRound("gpt", "라운드 3");
    markSubmitted(TOKEN);

    expect(dumpLocalStorage()).not.toContain(API_KEY);
    expect(JSON.stringify(buildEvaluationRecord(TOKEN))).not.toContain(API_KEY);
  });
});
