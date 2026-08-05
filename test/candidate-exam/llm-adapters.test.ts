/*
 * BYOP LLM 어댑터 계약 검증 (grain-1 · DoneWhen)
 * ---------------------------------------------------------------------------
 * fetch를 목킹해 실제 네트워크 없이 검증한다:
 *   - 제공자별 라우팅(엔드포인트) · 요청 매핑(헤더/본문) · 응답 파싱
 *   - 에러 전파(비-2xx → LlmError, 상태 코드 포함)
 *   - 알 수 없는 제공자 · 빈 키 · 빈 메시지 가드
 *   - apiKey를 어디에도 영속하지 않음(localStorage 무변화, URL 미노출)
 * ---------------------------------------------------------------------------
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LlmError,
  PROVIDER_IDS,
  sendChat,
  type ChatMessage,
  type ProviderId,
} from "../../src/app/llm";

/** fetch 호출 인자 형태(테스트 헬퍼용) */
interface FetchCall {
  url: string;
  init: RequestInit;
}

/** 목 fetch — 마지막 호출을 기록하고 지정한 JSON 응답을 돌려준다 */
function stubFetch(
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {},
): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const impl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", impl);
  return { calls };
}

/** 요청 본문을 파싱해 반환 */
function bodyOf(call: FetchCall): any {
  return JSON.parse(call.init.body as string);
}

/** 헤더를 평범한 객체로 정규화 */
function headersOf(call: FetchCall): Record<string, string> {
  return (call.init.headers ?? {}) as Record<string, string>;
}

const MESSAGES: ChatMessage[] = [
  { role: "user", content: "문제를 어떻게 풀까요?" },
  { role: "assistant", content: "먼저 요구사항을 정리하세요." },
  { role: "user", content: "다음 단계는요?" },
];

const KEY = "sk-secret-key-value";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendChat 라우팅 · 요청 매핑 · 응답 파싱", () => {
  it("gpt → OpenAI chat/completions 로 라우팅하고 응답 텍스트를 반환한다", async () => {
    const { calls } = stubFetch({
      choices: [{ message: { content: "GPT의 답변" } }],
    });

    const out = await sendChat("gpt", KEY, MESSAGES);

    expect(out).toBe("GPT의 답변");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.openai.com/v1/chat/completions");
    expect(headersOf(calls[0]).authorization).toBe(`Bearer ${KEY}`);

    const body = bodyOf(calls[0]);
    expect(body.model).toBe("gpt-4o");
    expect(body.messages).toEqual([
      { role: "user", content: "문제를 어떻게 풀까요?" },
      { role: "assistant", content: "먼저 요구사항을 정리하세요." },
      { role: "user", content: "다음 단계는요?" },
    ]);
  });

  it("claude → Anthropic messages 로 라우팅하고 text 블록만 이어 붙인다", async () => {
    const { calls } = stubFetch({
      stop_reason: "end_turn",
      content: [
        { type: "text", text: "Claude " },
        { type: "text", text: "답변" },
      ],
    });

    const out = await sendChat("claude", KEY, MESSAGES);

    expect(out).toBe("Claude 답변");
    expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");

    const headers = headersOf(calls[0]);
    expect(headers["x-api-key"]).toBe(KEY);
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    // 브라우저 직접 호출 헤더 필요(claude-api 스킬)
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");

    const body = bodyOf(calls[0]);
    expect(body.model).toBe("claude-opus-4-8");
    expect(body.max_tokens).toBeGreaterThan(0);
    // 400 유발 파라미터를 보내지 않는다
    expect(body.temperature).toBeUndefined();
    expect(body.budget_tokens).toBeUndefined();
    expect(body.messages).toEqual([
      { role: "user", content: "문제를 어떻게 풀까요?" },
      { role: "assistant", content: "먼저 요구사항을 정리하세요." },
      { role: "user", content: "다음 단계는요?" },
    ]);
  });

  it("gemini → generateContent 로 라우팅하고 assistant를 model 역할로 매핑한다", async () => {
    const { calls } = stubFetch({
      candidates: [{ content: { parts: [{ text: "Gemini의 답변" }] } }],
    });

    const out = await sendChat("gemini", KEY, MESSAGES);

    expect(out).toBe("Gemini의 답변");
    expect(calls[0].url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    );
    // 키는 헤더로 — URL에 노출되지 않는다
    expect(headersOf(calls[0])["x-goog-api-key"]).toBe(KEY);
    expect(calls[0].url).not.toContain(KEY);

    const body = bodyOf(calls[0]);
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "문제를 어떻게 풀까요?" }] },
      { role: "model", parts: [{ text: "먼저 요구사항을 정리하세요." }] },
      { role: "user", parts: [{ text: "다음 단계는요?" }] },
    ]);
  });
});

describe("에러 전파", () => {
  it("비-2xx 응답은 상태 코드를 담은 LlmError로 전파된다", async () => {
    stubFetch(
      { error: { message: "invalid api key" } },
      { ok: false, status: 401 },
    );

    await expect(sendChat("gpt", KEY, MESSAGES)).rejects.toMatchObject({
      name: "LlmError",
      provider: "gpt",
      status: 401,
    });
  });

  it("에러 메시지에는 상세는 담되 apiKey는 담지 않는다", async () => {
    stubFetch({ error: { message: "bad request" } }, { ok: false, status: 400 });

    const err = await sendChat("claude", KEY, MESSAGES).catch((e) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect((err as Error).message).toContain("bad request");
    expect((err as Error).message).not.toContain(KEY);
  });

  it("네트워크 실패(fetch reject)는 LlmError로 감싼다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("network down");
      }),
    );

    await expect(sendChat("gemini", KEY, MESSAGES)).rejects.toBeInstanceOf(
      LlmError,
    );
  });

  it("빈 응답(text 없음)은 LlmError로 처리한다", async () => {
    stubFetch({ content: [] });
    await expect(sendChat("claude", KEY, MESSAGES)).rejects.toBeInstanceOf(
      LlmError,
    );
  });

  it("Claude refusal 응답은 거부 에러로 전파한다", async () => {
    stubFetch({ stop_reason: "refusal", content: [] });
    await expect(sendChat("claude", KEY, MESSAGES)).rejects.toMatchObject({
      name: "LlmError",
      provider: "claude",
    });
  });
});

describe("입력 가드", () => {
  it("알 수 없는 제공자는 fetch 없이 LlmError를 던진다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      sendChat("mistral" as ProviderId, KEY, MESSAGES),
    ).rejects.toBeInstanceOf(LlmError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("빈 키·공백 키는 fetch 없이 LlmError를 던진다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(sendChat("gpt", "", MESSAGES)).rejects.toBeInstanceOf(LlmError);
    await expect(sendChat("gpt", "   ", MESSAGES)).rejects.toBeInstanceOf(
      LlmError,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("빈 메시지 배열은 fetch 없이 LlmError를 던진다", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(sendChat("gpt", KEY, [])).rejects.toBeInstanceOf(LlmError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("비밀값 취급 — apiKey 영속 금지", () => {
  it("성공 호출 후 localStorage에 아무것도 남기지 않는다", async () => {
    stubFetch({ choices: [{ message: { content: "ok" } }] });

    await sendChat("gpt", KEY, MESSAGES);

    expect(window.localStorage.length).toBe(0);
  });

  it("모든 제공자에서 키는 요청 헤더로만 전달되고 URL에는 없다", async () => {
    for (const provider of PROVIDER_IDS) {
      const { calls } = stubFetch(
        provider === "gpt"
          ? { choices: [{ message: { content: "ok" } }] }
          : provider === "claude"
            ? { content: [{ type: "text", text: "ok" }] }
            : { candidates: [{ content: { parts: [{ text: "ok" }] } }] },
      );

      await sendChat(provider, KEY, MESSAGES);

      const call = calls[0];
      expect(call.url).not.toContain(KEY);
      const serializedHeaders = JSON.stringify(headersOf(call));
      expect(serializedHeaders).toContain(KEY);
      // 본문에도 키가 새지 않는다
      expect(call.init.body as string).not.toContain(KEY);

      vi.unstubAllGlobals();
    }
  });
});
